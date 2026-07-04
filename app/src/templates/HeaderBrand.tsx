import type { ReactNode } from "react";
import type { HeaderAlign, LogoPosition } from "../types";

/** The three concrete alignments a header block can resolve to. */
export type Align = "start" | "center" | "end";

/**
 * Resolve the user's `headerAlign` into a concrete alignment, falling back to
 * the template's natural alignment when set to "auto" (or unset).
 */
export function resolveAlign(
  headerAlign: HeaderAlign | undefined,
  fallback: Align
): Align {
  switch (headerAlign) {
    case "left":
      return "start";
    case "center":
      return "center";
    case "right":
      return "end";
    default:
      return fallback;
  }
}

/** Tailwind text-alignment class for a resolved alignment. */
export const textAlignClass: Record<Align, string> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
};

/**
 * Render the optional user-provided header subtitle, or null when empty so
 * templates can drop it in unguarded. `className` sizes/colors it to match the
 * template; horizontal alignment is inherited from the title block.
 */
export function HeaderSubtitle({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  if (!text.trim()) return null;
  return <div className={`whitespace-pre-wrap ${className}`}>{text}</div>;
}

type Props = {
  logo: string;
  position: LogoPosition;
  /** The rendered title (already styled by the template). */
  title: ReactNode;
  /** Optional extra content below the title (e.g. invoice #). */
  subtitle?: ReactNode;
  /** Horizontal alignment of the whole block. */
  align?: Align;
};

const alignItems = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

/**
 * Arranges an optional logo around the header title. `position` controls
 * where the logo sits relative to the title: left / right / top / bottom.
 * The same component is reused by every template for consistent behaviour.
 */
export default function HeaderBrand({
  logo,
  position,
  title,
  subtitle,
  align = "start",
}: Props) {
  const titleBlock = (
    <div className={textAlignClass[align]}>
      {title}
      {subtitle}
    </div>
  );

  if (!logo) return titleBlock;

  const img = (
    <img
      src={logo}
      alt="Logo"
      className="max-h-16 max-w-[180px] object-contain"
    />
  );

  const horizontal = position === "left" || position === "right";
  const direction = horizontal ? "flex-row" : "flex-col";
  const gap = horizontal ? "gap-4" : "gap-3";
  // For right/bottom the title comes first, then the logo.
  const logoFirst = position === "left" || position === "top";

  return (
    <div
      className={`flex ${direction} ${gap} ${
        horizontal ? "items-center" : alignItems[align]
      }`}
    >
      {logoFirst ? (
        <>
          {img}
          {titleBlock}
        </>
      ) : (
        <>
          {titleBlock}
          {img}
        </>
      )}
    </div>
  );
}
