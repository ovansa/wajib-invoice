import type { InvoiceData, ItemSection, LineItem } from '../types';

import { currencies } from './currencies';
import { initialData } from './defaults';
import { uid } from './format';

const KEY = 'invoice-generator:data:v1';

/**
 * Resolve the sections list, migrating legacy invoices that stored a flat
 * `items` array into a single unnamed section. Also backfills item ids.
 */
function resolveSections(
  parsed: Partial<InvoiceData> & { items?: LineItem[] },
): ItemSection[] {
  const withIds = (items: LineItem[]): LineItem[] =>
    items.map((it) => ({ ...it, id: it.id || uid() }));

  if (Array.isArray(parsed.sections) && parsed.sections.length) {
    return parsed.sections.map((s) => ({
      id: s.id || uid(),
      title: s.title ?? '',
      pageBreakBefore: s.pageBreakBefore ?? false,
      items:
        Array.isArray(s.items) && s.items.length
          ? withIds(s.items)
          : [{ id: uid(), description: '', quantity: 1, rate: 0 }],
    }));
  }

  // Legacy: a flat items array → one unnamed section.
  if (Array.isArray(parsed.items) && parsed.items.length) {
    return [{ id: uid(), title: '', items: withIds(parsed.items) }];
  }

  return initialData.sections;
}

/** Map a legacy symbol (e.g. "$") to an ISO code; pass codes through. */
function normalizeCurrency(value: string | undefined): string {
  if (!value) return initialData.currency;
  if (currencies.some((c) => c.code === value)) return value;
  const bySymbol = currencies.find((c) => c.symbol.trim() === value.trim());
  return bySymbol?.code ?? initialData.currency;
}

/**
 * Normalize a loosely-typed parsed object (from storage, an import, or a
 * legacy single-invoice blob) into a complete `InvoiceData`, backfilling any
 * fields/toggles added since it was saved. Safe against `null`/garbage input.
 */
export function hydrate(
  raw: (Partial<InvoiceData> & { items?: LineItem[] }) | null | undefined,
): InvoiceData {
  if (!raw || typeof raw !== 'object') return structuredClone(initialData);
  const { items: _legacyItems, ...rest } = raw;
  return {
    ...initialData,
    ...rest,
    currency: normalizeCurrency(raw.currency),
    // Only "beforeTotals" or "bottom" are valid; anything else (incl. a legacy
    // "section:<id>" from when per-section placement existed) → "bottom".
    notesPosition:
      raw.notesPosition === 'beforeTotals' ? 'beforeTotals' : 'bottom',
    notesAlign:
      raw.notesAlign === 'center' || raw.notesAlign === 'right'
        ? raw.notesAlign
        : 'left',
    visible: { ...initialData.visible, ...(raw.visible ?? {}) },
    watermark: { ...initialData.watermark, ...(raw.watermark ?? {}) },
    sections: resolveSections(raw),
  };
}

export function loadData(): InvoiceData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialData;
    return hydrate(JSON.parse(raw));
  } catch {
    return initialData;
  }
}

export function saveData(data: InvoiceData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable - ignore */
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
