import { SignJWT, jwtVerify } from 'jose';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Over HTTPS we use the __Host- prefix (browser-enforced: Secure, Path=/, no
// Domain - the strongest cookie binding). Plain-HTTP localhost can't set a
// __Host- cookie, so dev falls back to a plain name without Secure.
const isProd = process.env.NODE_ENV === 'production';
const COOKIE = isProd ? '__Host-ig_session' : 'ig_session';

/**
 * The signing key. Enforced to be reasonably strong so a weak/guessable secret
 * can't be used to forge sessions. Throws at first use if unset/too short -
 * fail fast rather than run insecurely.
 */
function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters. Generate one with: openssl rand -base64 32',
    );
  }
  return new TextEncoder().encode(s);
}

export type Session = { sub: string; email: string; name?: string };

/** Sign a 30-day session JWT for a user. */
export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ email: s.email, name: s.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.sub)
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(secret());
}

/** Read and verify the session cookie; returns null if missing/invalid. */
export async function getSession(req: VercelRequest): Promise<Session | null> {
  const raw = parseCookie(req.headers.cookie)[COOKIE];
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secret());
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
    };
  } catch {
    return null;
  }
}

const secureAttr = isProd ? 'Secure; ' : '';

/** Set the httpOnly session cookie on the response. */
export function setSessionCookie(res: VercelResponse, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; ${secureAttr}SameSite=Strict; Path=/; Max-Age=${
      60 * 60 * 24 * 30
    }`,
  );
}

/** Clear the session cookie. */
export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=; HttpOnly; ${secureAttr}SameSite=Strict; Path=/; Max-Age=0`,
  );
}

function parseCookie(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
