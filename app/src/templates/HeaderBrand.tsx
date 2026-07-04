import type { ReactNode } from "react";
import type { LogoPosition } from "../types";

type Props = {
  logo: string;
  position: LogoPosition;
  /** The rendered title (already styled by the template). */
  title: ReactNode;
  /** Optional extra content below the title (e.g. invoice #). */
  subtitle?: ReactNode;
  /** Horizontal alignment of the whole block. */
  align?: "start" | "center" | "end";
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
    <div>
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
