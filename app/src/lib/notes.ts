import type { InvoiceData, NotesPosition } from "../types";

/** True when the invoice has notes to show (toggle on + non-empty). */
export function notesVisible(data: InvoiceData): boolean {
  return data.visible.notes && data.notes.trim() !== "";
}

/**
 * Resolve the stored notes position to one that's valid for the current
 * sections. A "section:<id>" pointing at a section that no longer exists
 * falls back to "bottom" so notes never silently vanish.
 */
export function resolveNotesPosition(data: InvoiceData): NotesPosition {
  const pos = data.notesPosition ?? "bottom";
  if (pos.startsWith("section:")) {
    const id = pos.slice("section:".length);
    return data.sections.some((s) => s.id === id) ? pos : "bottom";
  }
  return pos === "beforeTotals" ? "beforeTotals" : "bottom";
}

/** Should the notes block render immediately after the given section id? */
export function notesAfterSection(data: InvoiceData, sectionId: string): boolean {
  return (
    notesVisible(data) &&
    resolveNotesPosition(data) === `section:${sectionId}`
  );
}

/** Should the notes block render after the items table, before the totals? */
export function notesBeforeTotals(data: InvoiceData): boolean {
  return notesVisible(data) && resolveNotesPosition(data) === "beforeTotals";
}

/** Should the notes block render at the very bottom, after the totals? */
export function notesAtBottom(data: InvoiceData): boolean {
  return notesVisible(data) && resolveNotesPosition(data) === "bottom";
}
