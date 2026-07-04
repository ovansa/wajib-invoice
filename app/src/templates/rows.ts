import type { InvoiceData, LineItem } from "../types";
import { sectionSubtotal, hasNamedSections } from "../lib/totals";

export type Row =
  | { kind: "section"; id: string; title: string; pageBreakBefore: boolean }
  | { kind: "item"; id: string; item: LineItem }
  | { kind: "subtotal"; id: string; amount: number };

/**
 * Flatten sections into a render-ready row list. When there is only a single
 * unnamed section, section-header and subtotal rows are omitted so simple
 * invoices look exactly as before.
 */
export function toRows(data: InvoiceData): Row[] {
  const showSections = hasNamedSections(data);
  const rows: Row[] = [];

  data.sections.forEach((section, i) => {
    if (showSections) {
      rows.push({
        kind: "section",
        id: `sec-${section.id}`,
        title: section.title.trim() || "Section",
        // A break before the very first section would leave a blank page.
        pageBreakBefore: i > 0 && !!section.pageBreakBefore,
      });
    }
    for (const item of section.items) {
      rows.push({ kind: "item", id: item.id, item });
    }
    if (showSections) {
      rows.push({
        kind: "subtotal",
        id: `sub-${section.id}`,
        amount: sectionSubtotal(section),
      });
    }
  });

  return rows;
}
