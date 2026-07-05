import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "../_lib/auth";

/** Return the current user (or null) so the client can render auth state. */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const session = await getSession(req);
  res.json(
    session ? { email: session.email, name: session.name ?? null } : null
  );
}
