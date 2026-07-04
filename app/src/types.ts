export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};

/** A named group of line items with its own subtotal (e.g. "Building 1"). */
export type ItemSection = {
  id: string;
  title: string; // "" for an unnamed default section
  items: LineItem[];
  /** Force this section to start on a fresh page in the preview/PDF. */
  pageBreakBefore?: boolean;
};

/** Fields that can be toggled on/off. When off they hide on the invoice too. */
export type ToggleField =
  | "fromAddress"
  | "fromEmail"
  | "billToAddress"
  | "billToEmail"
  | "dueDate"
  | "poNumber"
  | "discount"
  | "notes";

export type Visibility = Record<ToggleField, boolean>;

export type TemplateId =
  | "modern"
  | "minimal"
  | "classic"
  | "sidebar"
  | "receipt"
  | "letterhead";

export type LogoPosition = "left" | "right" | "top" | "bottom";

export type AccentId =
  | "indigo"
  | "emerald"
  | "rose"
  | "amber"
  | "slate"
  | "sky";

/** Lifecycle status of a saved invoice, cycled Draft → Sent → Paid. */
export type InvoiceStatus = "draft" | "sent" | "paid";

export type Frequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";

export type Recurring = {
  enabled: boolean;
  frequency: Frequency;
};

/** A diagonal text stamp shown behind the invoice (one per page). */
export type Watermark = {
  enabled: boolean;
  text: string;
  /** 0–100; how strong the stamp reads over the content. */
  opacity: number;
  /** Named color for the stamp (from watermarkColors). */
  color: WatermarkColor;
  /** Stamp size as a percentage of the page-spanning fit (e.g. 100 = full). */
  size: number;
};

export type WatermarkColor =
  | "slate"
  | "red"
  | "green"
  | "amber"
  | "indigo";

export type InvoiceData = {
  template: TemplateId;
  accent: AccentId;
  recurring: Recurring;
  watermark: Watermark;
  headerTitle: string; // e.g. "INVOICE" or a business name
  logo: string; // data URL, or "" when none
  logoPosition: LogoPosition;
  from: string;
  fromAddress: string;
  fromEmail: string;
  number: string;
  poNumber: string;
  date: string;
  dueDate: string;
  billTo: string;
  billToAddress: string;
  billToEmail: string;
  currency: string;
  taxRate: number;
  discountRate: number;
  sections: ItemSection[];
  notes: string;
  visible: Visibility;
};
