import type { InvoiceData, InvoiceStatus } from "../types";
import { initialData } from "./defaults";
import { hydrate } from "./storage";
import { uid } from "./format";

/**
 * Multi-invoice store. All saved invoices live in one localStorage blob under
 * STORE_KEY; the previously-single invoice (KEY "…:data:v1") is migrated into
 * the first record the first time this store is loaded.
 */
export type SavedInvoice = {
  id: string;
  data: InvoiceData;
  status: InvoiceStatus;
  /** Epoch ms of the last edit — used to sort the list (newest first). */
  updatedAt: number;
};

type Store = {
  invoices: SavedInvoice[];
  /** Which invoice is currently open in the editor. */
  activeId: string;
};

const STORE_KEY = "invoice-generator:store:v1";
const LEGACY_KEY = "invoice-generator:data:v1";

export const STATUS_ORDER: InvoiceStatus[] = ["draft", "sent", "paid"];

export const STATUS_META: Record<
  InvoiceStatus,
  { label: string; dot: string; chip: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-slate-400",
    chip: "bg-slate-100 text-slate-600",
  },
  sent: {
    label: "Sent",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700",
  },
  paid: {
    label: "Paid",
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700",
  },
};

/** The next status when cycling Draft → Sent → Paid → Draft. */
export function nextStatus(status: InvoiceStatus): InvoiceStatus {
  const i = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function newRecord(data: InvoiceData, status: InvoiceStatus = "draft"): SavedInvoice {
  return { id: uid(), data, status, updatedAt: Date.now() };
}

function freshStore(): Store {
  // Adopt any pre-existing single invoice so nothing is lost on upgrade.
  let seedData = structuredClone(initialData);
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) seedData = hydrate(JSON.parse(legacy));
  } catch {
    /* ignore malformed legacy blob */
  }
  const rec = newRecord(seedData);
  return { invoices: [rec], activeId: rec.id };
}

function normalize(parsed: unknown): Store {
  if (!parsed || typeof parsed !== "object") return freshStore();
  const p = parsed as Partial<Store>;
  const invoices = Array.isArray(p.invoices) ? p.invoices : [];
  const cleaned: SavedInvoice[] = invoices
    .filter((r): r is SavedInvoice => !!r && typeof r === "object")
    .map((r) => ({
      id: r.id || uid(),
      data: hydrate(r.data),
      status: STATUS_ORDER.includes(r.status) ? r.status : "draft",
      updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
    }));
  if (!cleaned.length) return freshStore();
  const activeId = cleaned.some((r) => r.id === p.activeId)
    ? (p.activeId as string)
    : cleaned[0].id;
  return { invoices: cleaned, activeId };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const seeded = freshStore();
      saveStore(seeded);
      return seeded;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return freshStore();
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

/** Invoices sorted newest-edited first, for display in the drawer. */
export function sortedInvoices(store: Store): SavedInvoice[] {
  return [...store.invoices].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getActive(store: Store): SavedInvoice {
  return store.invoices.find((r) => r.id === store.activeId) ?? store.invoices[0];
}

// --- Mutations (all pure: return a new Store) ---

/** Replace the active invoice's data (and bump its updatedAt). */
export function updateActiveData(store: Store, data: InvoiceData): Store {
  return {
    ...store,
    invoices: store.invoices.map((r) =>
      r.id === store.activeId ? { ...r, data, updatedAt: Date.now() } : r
    ),
  };
}

export function setStatus(
  store: Store,
  id: string,
  status: InvoiceStatus
): Store {
  return {
    ...store,
    invoices: store.invoices.map((r) =>
      r.id === id ? { ...r, status, updatedAt: Date.now() } : r
    ),
  };
}

export function selectInvoice(store: Store, id: string): Store {
  return store.invoices.some((r) => r.id === id)
    ? { ...store, activeId: id }
    : store;
}

/** Add a blank invoice and make it active. */
export function addInvoice(store: Store): Store {
  const rec = newRecord(structuredClone(initialData));
  return { invoices: [rec, ...store.invoices], activeId: rec.id };
}

/** Deep-copy an existing invoice (Draft status) and make the copy active. */
export function duplicateInvoice(store: Store, id: string): Store {
  const src = store.invoices.find((r) => r.id === id);
  if (!src) return store;
  const copy = newRecord(structuredClone(src.data));
  return { invoices: [copy, ...store.invoices], activeId: copy.id };
}

/**
 * Delete an invoice. Never leaves the store empty — deleting the last one
 * replaces it with a fresh blank. Keeps a valid active selection.
 */
export function deleteInvoice(store: Store, id: string): Store {
  const remaining = store.invoices.filter((r) => r.id !== id);
  if (!remaining.length) {
    const rec = newRecord(structuredClone(initialData));
    return { invoices: [rec], activeId: rec.id };
  }
  const activeId =
    store.activeId === id ? sortedInvoices({ ...store, invoices: remaining })[0].id : store.activeId;
  return { invoices: remaining, activeId };
}
