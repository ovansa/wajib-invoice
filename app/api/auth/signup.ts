import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sql } from "../_lib/db.js";
import { signSession, setSessionCookie } from "../_lib/auth.js";
import {
  validatePassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "../_lib/password.js";
import { clientIp, isLimited, recordAttempt } from "../_lib/rate-limit.js";

const schema = z.object({
  email: z.string().email().max(200).transform((e) => e.trim().toLowerCase()),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
  name: z.string().trim().max(120).optional(),
});

// Cap new accounts per IP to blunt mass/automated signups.
const SIGNUP_WINDOW = 60 * 60; // 1 hour
const SIGNUP_MAX = 5;

/** Create an account, hash the password, set the session cookie. */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: `Enter a valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
    return;
  }
  const { email, password, name } = parsed.data;

  const ipKey = `signup:ip:${clientIp(req)}`;
  if (await isLimited(ipKey, SIGNUP_MAX, SIGNUP_WINDOW)) {
    res.status(429).json({
      error: "Too many sign-up attempts. Please try again later.",
    });
    return;
  }
  await recordAttempt(ipKey);

  const pwError = validatePassword(password);
  if (pwError) {
    res.status(400).json({ error: pwError });
    return;
  }

  const existing = await sql`select 1 from users where email = ${email}`;
  if (existing.length) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  await sql`
    insert into users (id, email, name, password_hash)
    values (${id}, ${email}, ${name ?? null}, ${passwordHash})
  `;

  const token = await signSession({ sub: id, email, name });
  setSessionCookie(res, token);
  res.json({ email, name: name ?? null });
}
