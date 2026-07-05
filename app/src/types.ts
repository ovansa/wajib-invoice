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

/**
 * Where the Notes block renders on the invoice:
 *   "bottom"        - after the totals (default)
 *   "beforeTotals"  - after the items table, before the totals
 */
export type NotesPosition = 'bottom' | 'beforeTotals';

/** Text alignment of the Notes block. */
export type NotesAlign = 'left' | 'center' | 'right';

/** Fields that can be toggled on/off. When off they hide on the invoice too. */
export type ToggleField =
  | 'fromAddress'
  | 'fromEmail'
  | 'billToAddress'
  | 'billToEmail'
  | 'dueDate'
  | 'poNumber'
  | 'discount'
  | 'notes';

export type Visibility = Record<ToggleField, boolean>;

export type TemplateId =
  | 'modern'
  | 'minimal'
  | 'classic'
  | 'sidebar'
  | 'receipt'
  | 'letterhead'
  | 'compact'
  | 'bold'
  | 'corporate';

export type LogoPosition = 'left' | 'right' | 'top' | 'bottom';

/**
 * Alignment of the invoice's header title/subtitle block. "auto" keeps each
 * template's built-in alignment; the others override it.
 */
export type HeaderAlign = 'auto' | 'left' | 'center' | 'right';

export type AccentId =
  | 'indigo'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'slate'
  | 'sky';

/** Lifecycle status of a saved invoice, cycled Draft → Sent → Paid. */
export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

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

export type WatermarkColor = 'slate' | 'red' | 'green' | 'amber' | 'indigo';

export type InvoiceData = {
  template: TemplateId;
  accent: AccentId;
  recurring: Recurring;
  watermark: Watermark;
  headerTitle: string; // e.g. "INVOICE" or a business name
  headerSubtitle: string; // e.g. a tagline or business line, shown under the title
  headerAlign: HeaderAlign; // alignment of the title/subtitle block
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
  notesPosition: NotesPosition;
  notesAlign: NotesAlign;
  visible: Visibility;
};
