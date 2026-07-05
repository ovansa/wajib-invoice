import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getSession } from './_lib/auth';
import { sql } from './_lib/db';
import { z } from 'zod';

const invoiceSchema = z.object({
  id: z.string().min(1).max(64),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(['draft', 'sent', 'paid']),
  updatedAt: z.number().int().nonnegative(),
  deleted: z.boolean().optional(),
});

// Cap the batch so a single request can't upsert an unbounded number of rows.
const putSchema = z.object({ invoices: z.array(invoiceSchema).max(500) });

// Reject payloads larger than this (bytes) before parsing - cheap DoS guard.
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * GET  → all live invoices for the signed-in user.
 * PUT  → bulk upsert the client's store. Last-write-wins by updatedAt, so a
 *        stale client can't clobber a newer server row. `deleted` soft-deletes.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const userId = session.sub;

  if (req.method === 'GET') {
    const rows = await sql`
      select id, data, status, updated_at
      from invoices
      where user_id = ${userId} and deleted_at is null
      order by updated_at desc
    `;
    res.json({
      invoices: rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        data: r.data,
        status: r.status,
        updatedAt: Number(r.updated_at),
      })),
    });
    return;
  }

  if (req.method === 'PUT') {
    // Reject oversized bodies before doing any work.
    const len = Number(req.headers['content-length'] || 0);
    if (len > MAX_BODY_BYTES) {
      res.status(413).json({ error: 'payload too large' });
      return;
    }
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid payload' });
      return;
    }
    for (const inv of parsed.data.invoices) {
      const deletedAt = inv.deleted ? new Date() : null;
      await sql`
        insert into invoices (id, user_id, data, status, updated_at, deleted_at)
        values (${inv.id}, ${userId}, ${JSON.stringify(inv.data)}::jsonb,
                ${inv.status}, ${inv.updatedAt}, ${deletedAt})
        on conflict (id) do update set
          data       = excluded.data,
          status     = excluded.status,
          updated_at = excluded.updated_at,
          deleted_at = excluded.deleted_at
        where invoices.user_id = ${userId}
          and excluded.updated_at >= invoices.updated_at
      `;
    }
    res.json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
