import type { VercelRequest } from '@vercel/node';
import { sql } from './db.js';

/**
 * Postgres-backed sliding-window rate limiter for auth endpoints. Records each
 * attempt and blocks once a key exceeds `max` attempts within `windowSec`.
 * Shared across all serverless invocations via the DB (no in-memory state).
 */

/** Best-effort client IP from Vercel's forwarding headers. */
export function clientIp(req: VercelRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff.length) return xff[0].trim();
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.length) return real;
  return 'unknown';
}

/**
 * Returns true if `key` is currently rate-limited (already at/over the cap in
 * the window). Does NOT record an attempt - call `recordAttempt` for that.
 */
export async function isLimited(
  key: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const rows = await sql`
    select count(*)::int as n
    from auth_attempts
    where key = ${key} and at > now() - ${`${windowSec} seconds`}::interval
  `;
  return (rows[0]?.n ?? 0) >= max;
}

/** Record one attempt against `key`. */
export async function recordAttempt(key: string): Promise<void> {
  await sql`insert into auth_attempts (key) values (${key})`;
  // Opportunistic cleanup so the table doesn't grow unbounded (1% of calls).
  if (Math.random() < 0.01) {
    await sql`delete from auth_attempts where at < now() - interval '1 day'`;
  }
}

/** Clear a key's attempts (e.g. after a successful login). */
export async function clearAttempts(key: string): Promise<void> {
  await sql`delete from auth_attempts where key = ${key}`;
}
