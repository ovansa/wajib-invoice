import type { InvoiceData, NotesPosition } from "../types";

/** True when the invoice has notes to show (toggle on + non-empty). */
export function notesVisible(data: InvoiceData): boolean {
  return data.visible.notes && data.notes.trim() !== "";
}

/** Normalize the stored notes position to a known value. */
export function resolveNotesPosition(data: InvoiceData): NotesPosition {
  return data.notesPosition === "beforeTotals" ? "beforeTotals" : "bottom";
}

/** Should the notes block render after the items table, before the totals? */
export function notesBeforeTotals(data: InvoiceData): boolean {
  return notesVisible(data) && resolveNotesPosition(data) === "beforeTotals";
}

/** Should the notes block render at the very bottom, after the totals? */
export function notesAtBottom(data: InvoiceData): boolean {
  return notesVisible(data) && resolveNotesPosition(data) === "bottom";
}
