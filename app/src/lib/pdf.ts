import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { computePagination, pageFooterLabel } from "../templates/paginate";
import type { Watermark } from "../types";
import {
  watermarkActive,
  watermarkRgb,
  watermarkFontSize,
} from "../lib/watermark";

/** Draw a single diagonal watermark stamp centered on the current PDF page. */
function drawWatermark(
  pdf: jsPDF,
  watermark: Watermark,
  pageWidthPt: number,
  pageHeightPt: number
) {
  const text = watermark.text.trim().toUpperCase();
  if (!text) return;
  const [r, g, b] = watermarkRgb(watermark.color);

  // Same sizing as the on-screen preview (in points here vs px there).
  const sizePt = watermarkFontSize(text, pageWidthPt, watermark.size);

  pdf.saveGraphicsState();
  // jsPDF opacity via a fresh GState (guarded — older builds may lack it).
  const anyPdf = pdf as unknown as {
    GState?: new (o: { opacity: number }) => unknown;
    setGState?: (s: unknown) => void;
  };
  if (anyPdf.GState && anyPdf.setGState) {
    anyPdf.setGState(new anyPdf.GState({ opacity: watermark.opacity / 100 }));
  }
  pdf.setTextColor(r, g, b);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(sizePt);
  pdf.text(text, pageWidthPt / 2, pageHeightPt / 2, {
    align: "center",
    baseline: "middle",
    angle: 30, // jsPDF rotates counter-clockwise → visually −30°
  });
  pdf.restoreGraphicsState();
}

// Color-bearing CSS properties we inline (as sRGB) before capture. Tailwind
// v4 emits colors as oklch()/color-mix() — and opacity modifiers like
// bg-white/95 resolve to oklab() in getComputedStyle — which html2canvas
// cannot parse, so it drops backgrounds/borders/colors and exports text only.
const COLOR_PROPS = [
  "color",
  "background-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
] as const;

/**
 * Convert any CSS color string (oklch/oklab/color-mix/hex/named/…) into a
 * plain `rgb()`/`rgba()` value by painting it onto a 1×1 canvas and reading
 * the pixel back — the pixel buffer is always sRGB bytes. This is the one
 * conversion that survives wide-gamut colors, since modern browsers otherwise
 * keep oklch/oklab as-is in both getComputedStyle and canvas fillStyle.
 */
function makeColorResolver(): (color: string) => string | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map<string, string | null>();
  return (color: string) => {
    if (!color) return null;
    const hit = cache.get(color);
    if (hit !== undefined) return hit;
    let out: string | null = null;
    if (ctx) {
      try {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = color; // ignored if unparseable → stays #000
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        out =
          a === 255
            ? `rgb(${r}, ${g}, ${b})`
            : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      } catch {
        out = null;
      }
    }
    cache.set(color, out);
    return out;
  };
}

/**
 * Walk `source` and its clone in lockstep, writing each element's resolved
 * sRGB colors onto the clone as inline styles. Inline styles win over class
 * rules, so html2canvas sees plain rgb()/rgba() instead of oklch/oklab/
 * color-mix — which is what makes template layout and colors export correctly.
 */
function inlineComputedColors(source: HTMLElement, clone: HTMLElement) {
  const resolve = makeColorResolver();
  const srcEls = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const cloneEls = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  const n = Math.min(srcEls.length, cloneEls.length);
  for (let i = 0; i < n; i++) {
    const cs = getComputedStyle(srcEls[i]);
    const style = cloneEls[i].style;
    for (const prop of COLOR_PROPS) {
      const resolved = resolve(cs.getPropertyValue(prop));
      if (resolved) style.setProperty(prop, resolved);
    }
  }
}

/**
 * Render a DOM node to a PDF, paginating across as many A4 pages as needed.
 * Page breaks are row-aware (computed by `computePagination`), so a line item
 * is never sliced in half. Continuation pages repeat the items-table header,
 * and multi-page exports get a "Page X of Y" footer. When a watermark is
 * given, one diagonal stamp is drawn on every page.
 */
export async function exportToPdf(
  node: HTMLElement,
  filename: string,
  watermark?: Watermark
) {
  // Ensure any images (e.g. an uploaded logo) are fully decoded before capture.
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map((img) =>
      img.complete ? Promise.resolve() : img.decode().catch(() => {})
    )
  );

  const { pages, thead } = computePagination(node);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    onclone: (_doc, clonedNode) => {
      // clonedNode is the clone of `node`; inline resolved colors so modern
      // CSS color functions don't defeat html2canvas's style parser.
      inlineComputedColors(node, clonedNode as HTMLElement);
    },
  });

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();

  // Conversion factors: invoice px → canvas px, and invoice px → PDF points.
  const nodeWidth = node.offsetWidth || 1;
  const canvasPerNode = canvas.width / nodeWidth;
  const ptPerNode = pageWidthPt / nodeWidth;

  const sliceCanvas = document.createElement("canvas");
  const sliceCtx = sliceCanvas.getContext("2d");
  if (!sliceCtx) {
    // Fallback: single page, scaled to width (may clip, but never crashes).
    const imgHeight = (canvas.height * pageWidthPt) / canvas.width;
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      0,
      0,
      pageWidthPt,
      imgHeight
    );
    pdf.save(filename);
    return;
  }

  // Draw the band [top, top+height] (in invoice px) onto the current PDF
  // page at vertical offset `yPt`.
  const drawBand = (top: number, height: number, yPt: number) => {
    const srcY = Math.round(top * canvasPerNode);
    const srcH = Math.min(
      Math.round(height * canvasPerNode),
      canvas.height - srcY
    );
    if (srcH <= 0) return;

    sliceCanvas.width = canvas.width;
    sliceCanvas.height = srcH;
    sliceCtx.fillStyle = "#ffffff";
    sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    sliceCtx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      srcH,
      0,
      0,
      canvas.width,
      srcH
    );

    pdf.addImage(
      sliceCanvas.toDataURL("image/jpeg", 0.98),
      "JPEG",
      0,
      yPt,
      pageWidthPt,
      srcH / canvasPerNode * ptPerNode
    );
  };

  const multiPage = pages.length > 1;

  pages.forEach((band, i) => {
    if (i > 0) pdf.addPage();

    // Continuation pages get a blank top margin before any content.
    let yPt = band.topPad * ptPerNode;
    if (band.head && thead) {
      drawBand(thead.top, thead.height, yPt);
      yPt += thead.height * ptPerNode;
    }
    drawBand(band.start, band.end - band.start, yPt);

    // One diagonal stamp per page, over the content.
    if (watermarkActive(watermark)) {
      drawWatermark(pdf, watermark, pageWidthPt, pageHeightPt);
    }

    if (multiPage) {
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184); // slate-400
      pdf.text(
        pageFooterLabel(i, pages.length),
        pageWidthPt - 36,
        pageHeightPt - 16,
        { align: "right" }
      );
    }
  });

  pdf.save(filename);
}
