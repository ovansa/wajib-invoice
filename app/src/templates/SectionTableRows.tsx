import { cloneElement, isValidElement, type ReactNode } from "react";
import type { InvoiceData } from "../types";
import type { Accent } from "../lib/accents";
import { formatMoney } from "../lib/format";
import { symbolForCode } from "../lib/currencies";
import { toRows } from "./rows";

type Variant = "modern" | "minimal" | "classic" | "letterhead" | "sidebar";

type Props = {
  data: InvoiceData;
  accent: Accent;
  colSpan: number;
  /** How to render each item row (template-specific cell markup). */
  renderItem: (item: InvoiceData["sections"][number]["items"][number]) => ReactNode;
  variant?: Variant;
};

/**
 * Renders a template <tbody>'s worth of rows: section headers, item rows
 * (delegated to `renderItem`), and per-section subtotals. Section header and
 * subtotal rows only appear when the invoice actually uses named sections.
 */
export default function SectionTableRows({
  data,
  accent,
  colSpan,
  renderItem,
  variant = "modern",
}: Props) {
  const currency = symbolForCode(data.currency);
  const rows = toRows(data);
  const bordered = variant === "classic";
  // Minimal & Sidebar have no horizontal cell padding; align section rows.
  const padX = variant === "minimal" || variant === "sidebar" ? "" : "px-4";

  return (
    <>
      {rows.map((row) => {
        if (row.kind === "section") {
          return (
            <tr
              key={row.id}
              data-section-break={row.pageBreakBefore ? "" : undefined}
            >
              <td
                colSpan={colSpan}
                className={`${padX} pb-1.5 pt-4 text-[12px] font-bold uppercase tracking-wide ${
                  bordered ? "border border-slate-300 bg-slate-50" : ""
                }`}
                style={{ color: accent.dark }}
              >
                {row.title}
              </td>
            </tr>
          );
        }
        if (row.kind === "subtotal") {
          return (
            <tr key={row.id}>
              <td
                colSpan={colSpan}
                className={`${padX} pb-5 pt-3 text-right text-[12px] font-semibold text-slate-500 ${
                  bordered
                    ? "border border-slate-300"
                    : "border-b border-slate-200"
                }`}
              >
                Section subtotal:{" "}
                <span className="ml-1 text-[13px] text-slate-800">
                  {formatMoney(row.amount, currency)}
                </span>
              </td>
            </tr>
          );
        }
        // Tag item rows so the preview can scroll to the row being edited.
        const rendered = renderItem(row.item);
        return isValidElement(rendered)
          ? cloneElement(rendered as React.ReactElement<Record<string, unknown>>, {
              "data-item-id": row.item.id,
            })
          : rendered;
      })}
    </>
  );
}
