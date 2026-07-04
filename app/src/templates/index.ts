import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { InvoiceData, TemplateId } from "../types";
import ModernTemplate from "./ModernTemplate";
import MinimalTemplate from "./MinimalTemplate";
import ClassicTemplate from "./ClassicTemplate";
import SidebarTemplate from "./SidebarTemplate";
import ReceiptTemplate from "./ReceiptTemplate";
import LetterheadTemplate from "./LetterheadTemplate";

export type { TemplateId };

import type { Accent } from "../lib/accents";

export type TemplateProps = { data: InvoiceData; accent: Accent };

export type TemplateComponent = ForwardRefExoticComponent<
  TemplateProps & RefAttributes<HTMLDivElement>
>;

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
  Component: TemplateComponent;
};

export const templates: TemplateMeta[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Indigo accent, bold header",
    Component: ModernTemplate,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and understated",
    Component: MinimalTemplate,
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional, bordered",
    Component: ClassicTemplate,
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Colored side column",
    Component: SidebarTemplate,
  },
  {
    id: "receipt",
    name: "Receipt",
    description: "Compact, centered",
    Component: ReceiptTemplate,
  },
  {
    id: "letterhead",
    name: "Letterhead",
    description: "Full-width header band",
    Component: LetterheadTemplate,
  },
];

export function getTemplate(id: TemplateId): TemplateMeta {
  return templates.find((t) => t.id === id) ?? templates[0];
}
