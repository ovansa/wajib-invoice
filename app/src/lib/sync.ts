import type { SavedInvoice } from './store';

/**
 * Cloud sync layer. Purely additive on top of the localStorage store:
 * - Anonymous users never touch the network; everything below no-ops for them.
 * - Signed-in users pull their invoices on login (merged last-write-wins) and
 *   push the whole store (debounced) on every change.
 *
 * Deletions are tracked as tombstones in localStorage so a delete made locally
 * still propagates to the server on the next push.
 */

const TOMBSTONE_KEY = 'invoice-generator:tombstones:v1';

export type AuthUser = { email: string; name: string | null };

type WireInvoice = {
  id: string;
  data: SavedInvoice['data'];
  status: SavedInvoice['status'];
  updatedAt: number;
  deleted?: boolean;
};

/** Who is signed in, or null if anonymous. */
export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    return (await res.json()) as AuthUser | null;
  } catch {
    return null;
  }
}

/** Post credentials to signup/login; resolves to the user or throws a message. */
async function postAuth(
  path: '/api/auth/signup' | '/api/auth/login',
  body: Record<string, string>,
): Promise<AuthUser> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Network error - check your connection and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Something went wrong. Please try again.');
  }
  return json as AuthUser;
}

export function signup(
  email: string,
  password: string,
  name?: string,
): Promise<AuthUser> {
  return postAuth('/api/auth/signup', { email, password, name: name ?? '' });
}

export function login(email: string, password: string): Promise<AuthUser> {
  return postAuth('/api/auth/login', { email, password });
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
}

/** Read the tombstone id → deletedAt map. */
function readTombstones(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TOMBSTONE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeTombstones(t: Record<string, number>): void {
  try {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

/** Record that an invoice was deleted locally, so the push can tell the server. */
export function markDeleted(id: string): void {
  const t = readTombstones();
  t[id] = Date.now();
  writeTombstones(t);
}

/**
 * Pull the server's invoices and merge with the local set (last-write-wins by
 * updatedAt). Returns the merged list, or `local` unchanged if offline/failed.
 * Used on first sign-in to fold anonymous invoices into the account.
 */
export async function pullAndMerge(
  local: SavedInvoice[],
): Promise<SavedInvoice[]> {
  let remote: SavedInvoice[];
  try {
    const res = await fetch('/api/invoices');
    if (!res.ok) return local;
    remote = ((await res.json()) as { invoices: SavedInvoice[] }).invoices;
  } catch {
    return local;
  }

  const tombstones = readTombstones();
  const byId = new Map<string, SavedInvoice>();
  for (const inv of remote) byId.set(inv.id, inv);
  for (const inv of local) {
    const existing = byId.get(inv.id);
    if (!existing || inv.updatedAt >= existing.updatedAt) byId.set(inv.id, inv);
  }
  // Drop anything the user deleted locally after it was last synced.
  for (const [id, when] of Object.entries(tombstones)) {
    const inv = byId.get(id);
    if (inv && when >= inv.updatedAt) byId.delete(id);
  }
  return [...byId.values()];
}

/** Push the current invoices (plus tombstones) to the server. No-op on failure. */
export async function push(invoices: SavedInvoice[]): Promise<void> {
  const tombstones = readTombstones();
  const wire: WireInvoice[] = invoices.map((inv) => ({
    id: inv.id,
    data: inv.data,
    status: inv.status,
    updatedAt: inv.updatedAt,
  }));
  for (const [id, when] of Object.entries(tombstones)) {
    wire.push({
      id,
      data: {} as SavedInvoice['data'],
      status: 'draft',
      updatedAt: when,
      deleted: true,
    });
  }
  try {
    const res = await fetch('/api/invoices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices: wire }),
    });
    // Once the server has accepted the tombstones, we can forget them.
    if (res.ok) writeTombstones({});
  } catch {
    /* stays in localStorage; retried on next change */
  }
}

/** Debounce a push so rapid edits collapse into one network call. */
export function debouncedPush(
  delay = 1500,
): (invoices: SavedInvoice[]) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest: SavedInvoice[] = [];
  return (invoices) => {
    latest = invoices;
    clearTimeout(timer);
    timer = setTimeout(() => void push(latest), delay);
  };
}
