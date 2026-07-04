import type { AccentId } from "../types";
export type { AccentId };

export type Accent = {
  id: AccentId;
  name: string;
  /** Strong accent — headings, bars, totals rule. */
  base: string;
  /** Darker shade for text on light tints / emphasis. */
  dark: string;
  /** Very light tint for backgrounds (e.g. balance-due band). */
  soft: string;
  /** Readable text color to sit on the light tint. */
  onSoft: string;
};

// Values mirror Tailwind's 600 / 700 / 50 / 700 stops.
export const accents: Accent[] = [
  { id: "indigo", name: "Indigo", base: "#4f46e5", dark: "#4338ca", soft: "#eef2ff", onSoft: "#4338ca" },
  { id: "emerald", name: "Emerald", base: "#059669", dark: "#047857", soft: "#ecfdf5", onSoft: "#047857" },
  { id: "rose", name: "Rose", base: "#e11d48", dark: "#be123c", soft: "#fff1f2", onSoft: "#be123c" },
  { id: "amber", name: "Amber", base: "#d97706", dark: "#b45309", soft: "#fffbeb", onSoft: "#b45309" },
  { id: "slate", name: "Slate", base: "#334155", dark: "#1e293b", soft: "#f1f5f9", onSoft: "#1e293b" },
  { id: "sky", name: "Sky", base: "#0284c7", dark: "#0369a1", soft: "#f0f9ff", onSoft: "#0369a1" },
];

export function getAccent(id: AccentId): Accent {
  return accents.find((a) => a.id === id) ?? accents[0];
}
