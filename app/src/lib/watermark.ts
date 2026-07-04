import type { WatermarkColor, Watermark } from "../types";

/** Preset stamp texts offered in the editor (users can also type their own). */
export const WATERMARK_PRESETS = [
  "DRAFT",
  "PAID",
  "OVERDUE",
  "COPY",
  "VOID",
  "CONFIDENTIAL",
] as const;

type ColorDef = { id: WatermarkColor; name: string; rgb: [number, number, number] };

export const watermarkColors: ColorDef[] = [
  { id: "slate", name: "Slate", rgb: [100, 116, 139] },
  { id: "red", name: "Red", rgb: [220, 38, 38] },
  { id: "green", name: "Green", rgb: [22, 163, 74] },
  { id: "amber", name: "Amber", rgb: [217, 119, 6] },
  { id: "indigo", name: "Indigo", rgb: [79, 70, 229] },
];

export function watermarkRgb(color: WatermarkColor): [number, number, number] {
  return (watermarkColors.find((c) => c.id === color) ?? watermarkColors[0]).rgb;
}

export function watermarkCss(color: WatermarkColor): string {
  const [r, g, b] = watermarkRgb(color);
  return `rgb(${r}, ${g}, ${b})`;
}

/** True when the watermark should actually render. */
export function watermarkActive(w: Watermark | undefined): w is Watermark {
  return !!w && w.enabled && w.text.trim().length > 0;
}

/** Clamp for the user-facing size percentage. */
export const WATERMARK_SIZE_MIN = 20;
export const WATERMARK_SIZE_MAX = 100;

/**
 * Font size (px) for a stamp of `text` on the −30° diagonal of a page of width
 * `pageWidth`. At `sizePct` = 100 the stamp spans the page's full diagonal
 * width; lower values shrink it. Kept in one place so the preview, PDF, and
 * print renderers all size the stamp identically.
 */
export function watermarkFontSize(
  text: string,
  pageWidth: number,
  sizePct = 100
): number {
  const len = Math.max(text.trim().length, 1);
  const pct =
    Math.max(WATERMARK_SIZE_MIN, Math.min(WATERMARK_SIZE_MAX, sizePct)) / 100;
  // At 100%, the text's width matches the page's diagonal span (~1.05× width);
  // ~0.62 avg glyph-width per em. Scaled by the user's size preference.
  const fit = (pageWidth * 1.05 * pct) / (len * 0.62);
  // Never let a single glyph blow past the page even for very short text.
  return Math.max(32, Math.min(pageWidth * 0.42 * pct, fit));
}
