import { PAGE_HEIGHT } from "./page";

/**
 * Row-aware pagination shared by the on-screen preview and the PDF export.
 *
 * The rendered invoice is one continuous column of content. We measure the
 * "atomic" blocks inside it — table rows plus anything tagged `data-atom`
 * (totals, notes, receipt lines) — and choose page cut points that fall
 * *between* atoms, so no row is ever sliced in half.
 *
 * Multi-page invoices also get per-page chrome, which the cut points must
 * reserve room for:
 *  - a footer band on every page ("Page X of Y"),
 *  - a repeated copy of the items-table header at the top of every
 *    continuation page that still shows table rows.
 */

export type PageBand = {
  /** Content offsets (px, relative to the invoice top) shown on this page. */
  start: number;
  end: number;
  /** Whether this page repeats the items-table header above the band. */
  head: boolean;
  /** Blank space (px) reserved above the content on this page (top margin). */
  topPad: number;
};

export type TheadBand = {
  /** Top of the slice to repeat (includes a little breathing room above). */
  top: number;
  /** Height of the repeated slice. */
  height: number;
};

export type Pagination = {
  pages: PageBand[];
  totalHeight: number;
  thead: TheadBand | null;
};

/** Reserved at the bottom of every page for the footer (multi-page only). */
export const FOOTER_RESERVE = 40;
/** Extra px included above the repeated table header so it doesn't touch the page edge content. */
const HEAD_PAD = 8;
/** Blank margin above content on every continuation page. */
export const CONTINUATION_TOP_PAD = 64;
/** A forced mid-atom cut is only avoided if the page keeps at least this much content. */
const MIN_PAGE_FILL = 80;
const EPS = 0.5;
const MAX_PAGES = 200;

type Rect = { top: number; bottom: number };

/**
 * Measure `container` (the hidden, untransformed invoice copy) and compute
 * page bands. Offsets are in the container's own pixel space.
 */
export function computePagination(container: HTMLElement): Pagination {
  const rootTop = container.getBoundingClientRect().top;
  const rel = (el: Element): Rect => {
    const r = el.getBoundingClientRect();
    return { top: r.top - rootTop, bottom: r.bottom - rootTop };
  };

  const totalHeight = container.offsetHeight;

  // The items table header (first table only — templates render one table).
  const theadEl = container.querySelector("thead");
  const tableEl = theadEl?.closest("table") ?? null;
  const theadRect = theadEl ? rel(theadEl) : null;
  const tableRect = tableEl ? rel(tableEl) : null;
  const thead: TheadBand | null = theadRect
    ? {
        top: Math.max(0, theadRect.top - HEAD_PAD),
        height: theadRect.bottom - Math.max(0, theadRect.top - HEAD_PAD),
      }
    : null;

  // Sections explicitly marked "start on a new page": the top offset of each
  // becomes a forced cut point. (Only meaningful past the first section.)
  const forcedBreaks = Array.from(
    container.querySelectorAll<HTMLElement>("[data-section-break]")
  )
    .map((el) => rel(el).top)
    .filter((top) => top > MIN_PAGE_FILL)
    .sort((a, b) => a - b);

  // Short invoice with no forced breaks: a single page, no chrome.
  if (totalHeight <= PAGE_HEIGHT + EPS && forcedBreaks.length === 0) {
    return {
      pages: [{ start: 0, end: totalHeight, head: false, topPad: 0 }],
      totalHeight,
      thead,
    };
  }

  // Atoms: table rows plus explicitly tagged blocks, sorted by top.
  const atoms: Rect[] = Array.from(
    container.querySelectorAll<HTMLElement>("tbody tr, [data-atom]")
  )
    .map(rel)
    .sort((a, b) => a.top - b.top);

  const pages: PageBand[] = [];
  let cursor = 0;

  while (pages.length < MAX_PAGES) {
    const continuation = pages.length > 0;
    const topPad = continuation ? CONTINUATION_TOP_PAD : 0;

    // Repeat the table header on continuation pages that begin inside the
    // table's row area (i.e. the table started earlier and hasn't ended).
    const head =
      continuation &&
      !!thead &&
      !!theadRect &&
      !!tableRect &&
      cursor >= theadRect.bottom - EPS &&
      cursor < tableRect.bottom - EPS;

    const usable =
      PAGE_HEIGHT - FOOTER_RESERVE - topPad - (head ? thead!.height : 0);
    const limit = cursor + usable;

    // A forced (section) break inside this page's span ends the page early.
    const forced = forcedBreaks.find((b) => b > cursor + EPS && b <= limit + EPS);

    if (forced === undefined && totalHeight - cursor <= usable + EPS) {
      pages.push({ start: cursor, end: totalHeight, head, topPad });
      break;
    }

    let cut = forced ?? limit;
    // Only chase an atom boundary when we hit the page limit, not a forced cut.
    if (forced === undefined) {
      // If an atom crosses the limit, cut just above it (outermost first).
      for (const a of atoms) {
        if (a.top >= limit - EPS) break;
        if (a.bottom > limit + EPS) {
          cut = a.top;
          break;
        }
      }
      // An atom taller than the page (or starting at the page top) can't be
      // pushed — fall back to a hard cut so we always make progress.
      if (cut <= cursor + MIN_PAGE_FILL) cut = limit;
    }

    pages.push({ start: cursor, end: cut, head, topPad });
    cursor = cut;
  }

  return { pages, totalHeight, thead };
}

/** Footer label shown at the bottom-right of each sheet/page. */
export function pageFooterLabel(page: number, pageCount: number): string {
  const base = `Page ${page + 1} of ${pageCount}`;
  return page < pageCount - 1 ? `Continued · ${base}` : base;
}
