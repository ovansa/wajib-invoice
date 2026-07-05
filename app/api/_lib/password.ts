/**
 * Password policy for new accounts. Kept deliberately usability-friendly
 * (length-first, per NIST 800-63B) rather than a maze of character classes:
 * long passphrases beat short-but-complex ones. We block only egregiously
 * weak choices.
 */

// bcrypt only hashes the first 72 bytes; reject longer to avoid silent
// truncation (two different long passwords hashing the same).
export const MAX_PASSWORD_LENGTH = 72;
export const MIN_PASSWORD_LENGTH = 10;

const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "qwerty123",
  "letmein123",
  "iloveyou1",
  "admin1234",
  "welcome123",
  "changeme123",
]);

/** Returns an error message if the password is unacceptable, else null. */
export function validatePassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (pw.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (COMMON.has(pw.toLowerCase())) {
    return "That password is too common. Choose something less guessable.";
  }
  // Reject a single repeated character ("aaaaaaaaaa").
  if (/^(.)\1+$/.test(pw)) {
    return "Choose a less predictable password.";
  }
  return null;
}
