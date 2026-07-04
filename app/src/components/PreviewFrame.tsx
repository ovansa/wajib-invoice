import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { PAGE_HEIGHT, PAGE_WIDTH } from "../templates/page";
import {
  computePagination,
  pageFooterLabel,
  type Pagination,
} from "../templates/paginate";
import type { Watermark } from "../types";
import { watermarkActive } from "../lib/watermark";
import WatermarkStamp from "./WatermarkStamp";

/** Imperative hooks the editor can call (e.g. scroll to a focused item). */
export type PreviewApi = {
  scrollToItem: (itemId: string) => void;
};

type Props = {
  children: ReactNode;
  /** Ref to the capture node (the full invoice), used for PDF export. */
  captureRef: RefObject<HTMLDivElement | null>;
  /** Optional handle for editor → preview interactions. */
  apiRef?: RefObject<PreviewApi | null>;
  /** Optional diagonal stamp shown once per page. */
  watermark?: Watermark;
};

// Gap shown between page sheets in the preview (px).
const PAGE_GAP = 24;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Nearest ancestor that actually scrolls vertically (null → the window). */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const style = getComputedStyle(p);
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      p.scrollHeight > p.clientHeight
    ) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

const toolbarBtn =
  "flex h-7 w-7 items-center justify-center rounded-sm text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500";

/**
 * Paged preview: the invoice renders once as a hidden continuous column
 * (measured for pagination and captured for the PDF), and is clipped into
 * A4 sheets at row-aware break points — the same breaks the PDF uses, so
 * what you see is exactly what exports. Continuation pages repeat the items
 * table header; multi-page previews get "Page X of Y" footers.
 *
 * Only sheets near the viewport render their content (windowing), so very
 * long invoices stay cheap to re-render.
 */
export default function PreviewFrame({
  children,
  captureRef,
  apiRef,
  watermark,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  // Sheets close enough to the viewport to be worth rendering.
  const [nearPages, setNearPages] = useState<Set<number>>(
    () => new Set([0, 1])
  );

  const recompute = useCallback(() => {
    const el = measureRef.current;
    if (el) setPagination(computePagination(el));
  }, []);

  // Re-paginate when the invoice content changes…
  useLayoutEffect(() => {
    recompute();
  }, [children, recompute]);

  // …and when its height settles asynchronously (fonts, logo image loads).
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  const pages = pagination?.pages ?? [
    { start: 0, end: PAGE_HEIGHT, head: false, topPad: 0 },
  ];
  const thead = pagination?.thead ?? null;
  const pageCount = pages.length;
  const multiPage = pageCount > 1;

  useEffect(() => {
    setCurrentPage((c) => clamp(c, 0, pageCount - 1));
  }, [pageCount]);

  // Windowing: track which sheets are near the viewport.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        setNearPages((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const e of entries) {
            const idx = Number((e.target as HTMLElement).dataset.page);
            if (e.isIntersecting && !next.has(idx)) {
              next.add(idx);
              changed = true;
            } else if (!e.isIntersecting && next.has(idx)) {
              next.delete(idx);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { rootMargin: "150% 0px 150% 0px" }
    );
    sheetRefs.current
      .slice(0, pageCount)
      .forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [pageCount]);

  // Current-page indicator: the topmost sheet crossing the viewport's middle.
  useEffect(() => {
    const centered = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.page);
          if (e.isIntersecting) centered.add(idx);
          else centered.delete(idx);
        }
        if (centered.size > 0) setCurrentPage(Math.min(...centered));
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sheetRefs.current
      .slice(0, pageCount)
      .forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [pageCount]);

  const scrollToPage = (idx: number) => {
    const sheet = sheetRefs.current[clamp(idx, 0, pageCount - 1)];
    if (!sheet) return;
    const scroller = findScrollParent(sheet);
    if (scroller) {
      const top =
        sheet.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        56; // clear the sticky toolbar
      scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } else {
      sheet.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const fitWidth = () => {
    const w = rootRef.current?.clientWidth;
    if (w) setZoom(clamp(Math.floor(((w - 8) / PAGE_WIDTH) * 100) / 100, MIN_ZOOM, MAX_ZOOM));
  };

  const zoomBy = (delta: number) =>
    setZoom((z) => clamp(Math.round((z + delta) * 10) / 10, MIN_ZOOM, MAX_ZOOM));

  // Expose scroll-to-item for the editor (fires when an item row is focused).
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      scrollToItem: (itemId: string) => {
        const root = measureRef.current;
        if (!root || !pagination) return;
        const el = root.querySelector(`[data-item-id="${CSS.escape(itemId)}"]`);
        if (!el) return;
        const offset =
          el.getBoundingClientRect().top - root.getBoundingClientRect().top;
        let idx = pagination.pages.findIndex(
          (b) => offset >= b.start - 1 && offset < b.end
        );
        if (idx === -1) idx = pagination.pages.length - 1;
        const sheet = sheetRefs.current[idx];
        if (!sheet) return;
        const scroller = findScrollParent(sheet);
        // Only pan the preview's own scroll container — never hijack the
        // window scroll the user is typing in.
        if (!scroller) return;
        const band = pagination.pages[idx];
        const within =
          (offset -
            band.start +
            band.topPad +
            (band.head && thead ? thead.height : 0)) *
          zoom;
        const top =
          sheet.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop +
          within -
          scroller.clientHeight * 0.4;
        scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, pagination, thead, zoom]);

  const naturalHeight =
    pageCount * PAGE_HEIGHT + (pageCount - 1) * PAGE_GAP;

  return (
    <div ref={rootRef}>
      {/* Continuous source — measured for pagination and captured for the PDF.
          Off-screen on screen; print CSS (see index.css) brings this node on
          and lets the browser paginate it natively as real, selectable text. */}
      <div className="invoice-capture-wrap" aria-hidden>
        <div ref={captureRef} className="invoice-capture" data-print-root>
          <div ref={measureRef}>{children}</div>
        </div>
        {/* Print-only stamp: a fixed element repeats on every printed page.
            Hidden on screen (the capture wrap is parked off-screen; this is
            further gated to print media in index.css). */}
        {watermark && watermarkActive(watermark) && (
          <div className="watermark-print" data-watermark-print>
            <WatermarkStamp watermark={watermark} />
          </div>
        )}
      </div>

      {/* Toolbar: page navigation + zoom. */}
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-md border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-0.5">
          {multiPage ? (
            <>
              <button
                type="button"
                className={toolbarBtn}
                onClick={() => scrollToPage(currentPage - 1)}
                disabled={currentPage <= 0}
                title="Previous page"
              >
                ‹
              </button>
              <span className="min-w-[92px] text-center text-xs font-medium tabular-nums text-slate-600">
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                type="button"
                className={toolbarBtn}
                onClick={() => scrollToPage(currentPage + 1)}
                disabled={currentPage >= pageCount - 1}
                title="Next page"
              >
                ›
              </button>
            </>
          ) : (
            <span className="px-2 text-xs font-medium text-slate-500">
              1 page
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={toolbarBtn}
            onClick={() => zoomBy(-0.1)}
            disabled={zoom <= MIN_ZOOM}
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-[46px] rounded-sm px-1 py-1 text-center text-xs font-medium tabular-nums text-slate-600 transition-colors hover:bg-slate-100"
            title="Reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className={toolbarBtn}
            onClick={() => zoomBy(0.1)}
            disabled={zoom >= MAX_ZOOM}
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={fitWidth}
            className="ml-1 rounded-sm border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            title="Fit page to panel width"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Page sheets, clipped from the continuous content at row boundaries. */}
      <div
        className="mx-auto"
        style={{ width: PAGE_WIDTH * zoom, height: naturalHeight * zoom }}
      >
        <div
          style={{
            width: PAGE_WIDTH,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          <div className="flex flex-col" style={{ gap: PAGE_GAP }}>
            {pages.map((band, i) => (
              <div
                key={i}
                data-page={i}
                ref={(el) => {
                  sheetRefs.current[i] = el;
                }}
                className="relative overflow-hidden bg-white shadow-lg ring-1 ring-black/5"
                style={{ height: PAGE_HEIGHT, width: PAGE_WIDTH }}
              >
                {nearPages.has(i) && (
                  <>
                    {band.topPad > 0 && <div style={{ height: band.topPad }} />}
                    {band.head && thead && (
                      <div
                        className="overflow-hidden"
                        style={{ height: thead.height }}
                      >
                        <div
                          style={{ transform: `translateY(${-thead.top}px)` }}
                        >
                          {children}
                        </div>
                      </div>
                    )}
                    <div
                      className="overflow-hidden"
                      style={{ height: band.end - band.start }}
                    >
                      <div style={{ transform: `translateY(${-band.start}px)` }}>
                        {children}
                      </div>
                    </div>
                  </>
                )}
                {watermark && watermarkActive(watermark) && (
                  <WatermarkStamp watermark={watermark} />
                )}
                {multiPage && (
                  <div className="pointer-events-none absolute bottom-3 right-6 text-[10px] tracking-wide text-slate-400">
                    {pageFooterLabel(i, pageCount)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
