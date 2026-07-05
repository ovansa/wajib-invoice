import { neon } from '@neondatabase/serverless';

/**
 * Neon serverless SQL client. Uses the pooled DATABASE_URL - safe to create
 * per-invocation in Vercel functions (it's a stateless HTTP driver).
 */
export const sql = neon(process.env.DATABASE_URL!);
