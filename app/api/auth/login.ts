import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  clearAttempts,
  clientIp,
  isLimited,
  recordAttempt,
} from '../_lib/rate-limit.js';
import { setSessionCookie, signSession } from '../_lib/auth.js';

import bcrypt from 'bcryptjs';
import { sql } from '../_lib/db.js';
import { z } from 'zod';

const schema = z.object({
  email: z
    .string()
    .email()
    .max(200)
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1).max(72),
});

// Windows: per IP (broad brute force) and per email (targeted).
const WINDOW = 15 * 60; // seconds
const IP_MAX = 15;
const EMAIL_MAX = 6;

/** Verify credentials and set the session cookie. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter your email and password.' });
    return;
  }
  const { email, password } = parsed.data;

  const ipKey = `login:ip:${clientIp(req)}`;
  const emailKey = `login:email:${email}`;
  if (
    (await isLimited(ipKey, IP_MAX, WINDOW)) ||
    (await isLimited(emailKey, EMAIL_MAX, WINDOW))
  ) {
    res.status(429).json({
      error: 'Too many attempts. Please wait a few minutes and try again.',
    });
    return;
  }

  const rows = await sql`
    select id, name, password_hash from users where email = ${email}
  `;
  const user = rows[0];
  // Same generic error whether the email is unknown or the password is wrong,
  // so we don't reveal which emails have accounts. A stored empty hash (legacy
  // pre-password row) can never match a bcrypt.compare, so it's safe.
  const ok =
    user &&
    user.password_hash &&
    (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    await recordAttempt(ipKey);
    await recordAttempt(emailKey);
    res.status(401).json({ error: 'Incorrect email or password.' });
    return;
  }

  // Success - clear this email's failed-attempt counter.
  await clearAttempts(emailKey);

  const token = await signSession({
    sub: user.id,
    email,
    name: user.name ?? undefined,
  });
  setSessionCookie(res, token);
  res.json({ email, name: user.name ?? null });
}
