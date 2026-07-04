import type { ReactNode } from "react";

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Optional short text shown on the header when collapsed (e.g. a summary). */
  summary?: ReactNode;
  children: ReactNode;
};

/**
 * A form section with a clickable header that collapses its body.
 * Chevron rotates to indicate state; a summary can hint at the current
 * value while collapsed.
 */
export default function CollapsibleSection({
  title,
  open,
  onToggle,
  summary,
  children,
}: Props) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {!open && summary && (
            <span className="text-xs font-normal normal-case tracking-normal text-slate-400">
              {summary}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}
