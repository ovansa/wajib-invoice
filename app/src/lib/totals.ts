import type { InvoiceData, ItemSection, LineItem } from "../types";

export type Totals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

export function sectionSubtotal(section: ItemSection): number {
  return section.items.reduce((sum, it) => sum + it.quantity * it.rate, 0);
}

/** All items across every section, in order. */
export function flattenItems(data: InvoiceData): LineItem[] {
  return data.sections.flatMap((s) => s.items);
}

/** True when there's more than one section, or the single section is named. */
export function hasNamedSections(data: InvoiceData): boolean {
  return (
    data.sections.length > 1 ||
    (data.sections.length === 1 && data.sections[0].title.trim() !== "")
  );
}

export function computeTotals(data: InvoiceData): Totals {
  const subtotal = data.sections.reduce(
    (sum, s) => sum + sectionSubtotal(s),
    0
  );
  const discount = data.visible.discount
    ? (subtotal * data.discountRate) / 100
    : 0;
  const taxable = subtotal - discount;
  const tax = (taxable * data.taxRate) / 100;
  const total = taxable + tax;
  return { subtotal, discount, tax, total };
}
