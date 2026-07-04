import type { Watermark } from "../types";
import { PAGE_WIDTH } from "../templates/page";
import { watermarkCss, watermarkFontSize } from "../lib/watermark";

type Props = {
  watermark: Watermark;
  /** Page width the stamp is sized against (defaults to the A4 preview width). */
  width?: number;
};

/**
 * A single diagonal watermark stamp that fills its (page-sized) positioned
 * parent. Used as an overlay inside each preview sheet — one stamp per page.
 * It is inert (pointer-events: none) and does not affect layout/measurement,
 * so pagination is unchanged.
 */
export default function WatermarkStamp({ watermark, width = PAGE_WIDTH }: Props) {
  const text = watermark.text.trim();
  if (!text) return null;

  return (
    <div
      aria-hidden
      data-watermark
      className="pointer-events-none absolute inset-0 z-20 flex select-none items-center justify-center overflow-hidden"
    >
      <span
        style={{
          transform: "rotate(-30deg)",
          color: watermarkCss(watermark.color),
          opacity: Math.max(0, Math.min(100, watermark.opacity)) / 100,
          fontSize: watermarkFontSize(text, width, watermark.size),
          fontWeight: 800,
          letterSpacing: "0.08em",
          lineHeight: 1,
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {text}
      </span>
    </div>
  );
}
