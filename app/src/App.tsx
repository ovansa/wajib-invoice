import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type {
  HeaderAlign,
  InvoiceData,
  InvoiceStatus,
  LineItem,
  ToggleField,
} from "./types";
import { uid, formatMoney } from "./lib/format";
import { symbolForCode } from "./lib/currencies";
import { exportToPdf } from "./lib/pdf";
import { initialData } from "./lib/defaults";
import {
  loadStore,
  saveStore,
  getActive,
  sortedInvoices,
  updateActiveData,
  selectInvoice,
  addInvoice,
  duplicateInvoice,
  deleteInvoice,
  setStatus,
  nextStatus,
  STATUS_META,
} from "./lib/store";
import InvoiceDrawer from "./components/InvoiceDrawer";
import { getTemplate } from "./templates";
import { accents, getAccent } from "./lib/accents";
import TemplatePicker from "./components/TemplatePicker";
import LogoUpload from "./components/LogoUpload";
import CollapsibleSection from "./components/CollapsibleSection";
import SectionEditor from "./components/SectionEditor";
import PreviewFrame, { type PreviewApi } from "./components/PreviewFrame";
import { computeTotals } from "./lib/totals";
import {
  Input,
  Label,
  Textarea,
  OptionalField,
  Select,
  Toggle,
} from "./components/Field";
import { currencies } from "./lib/currencies";
import {
  FREQUENCIES,
  advanceDate,
  incrementNumber,
} from "./lib/recurring";
import { formatDate } from "./lib/format";
import {
  WATERMARK_PRESETS,
  watermarkColors,
  watermarkCss,
  WATERMARK_SIZE_MIN,
  WATERMARK_SIZE_MAX,
} from "./lib/watermark";

const VIEW_MODE_KEY = "invoice-generator:viewMode";
const LEGACY_PREVIEW_KEY = "invoice-generator:previewCollapsed";
const SECTIONS_PREF_KEY = "invoice-generator:collapsedSections";

/** Which panels are shown on large screens. */
type ViewMode = "form" | "both" | "preview";

const iconCls = "h-3.5 w-3.5";
// Small glyphs for the view switcher: form fields, split, and document.
const FormIcon = (
  <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="14" y2="17" />
  </svg>
);
const BothIcon = (
  <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);
const PreviewIcon = (
  <svg viewBox="0 0 24 24" className={iconCls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h9l3 3v15a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V3z" />
    <line x1="9" y1="12" x2="15" y2="12" />
    <line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);

const VIEW_OPTIONS: {
  id: ViewMode;
  label: string;
  title: string;
  icon: ReactNode;
}[] = [
  { id: "form", label: "Form", title: "Edit the form only", icon: FormIcon },
  { id: "both", label: "Both", title: "Form and preview side by side", icon: BothIcon },
  { id: "preview", label: "Preview", title: "Preview the invoice only", icon: PreviewIcon },
];

const HEADER_ALIGN_OPTIONS: {
  id: HeaderAlign;
  label: string;
  title: string;
}[] = [
  { id: "auto", label: "Auto", title: "Use the template's default alignment" },
  { id: "left", label: "Left", title: "Align header left" },
  { id: "center", label: "Center", title: "Align header center" },
  { id: "right", label: "Right", title: "Align header right" },
];

function loadViewMode(): ViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === "form" || saved === "both" || saved === "preview") {
      return saved;
    }
    // Migrate the old boolean: "expanded form" (preview hidden) → form-only.
    if (localStorage.getItem(LEGACY_PREVIEW_KEY) === "true") return "form";
  } catch {
    /* ignore */
  }
  return "both";
}

type SectionId =
  | "template"
  | "branding"
  | "from"
  | "billTo"
  | "details"
  | "recurring"
  | "watermark"
  | "items"
  | "totals";

const mapSection = (
  d: InvoiceData,
  sectionId: string,
  fn: (s: InvoiceData["sections"][number]) => InvoiceData["sections"][number]
): InvoiceData => ({
  ...d,
  sections: d.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
});

export default function App() {
  // The invoice store (all saved invoices) is the source of truth in storage.
  const [store, setStore] = useState(() => loadStore());
  // `data` is the working copy for the active invoice; edits sync into the
  // store below. Kept as its own state so the existing memoized editors and
  // focus handling are untouched.
  const [data, setData] = useState<InvoiceData>(() => getActive(store).data);
  const activeId = store.activeId;
  const activeStatus = getActive(store).status;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);
  const [collapsedSections, setCollapsedSections] = useState<
    Partial<Record<SectionId, boolean>>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem(SECTIONS_PREF_KEY) || "{}");
    } catch {
      return {};
    }
  });
  // Which item-sections are folded in the editor (ephemeral view state).
  const [collapsedItemSections, setCollapsedItemSections] = useState<
    Record<string, boolean>
  >({});
  const previewRef = useRef<HTMLDivElement>(null);
  const previewApiRef = useRef<PreviewApi>(null);

  // Newly added rows are focused after React commits them (an effect, not a
  // rAF, so the input is guaranteed to exist in the DOM).
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingFocusId) return;
    document
      .querySelector<HTMLInputElement>(
        `[data-item-input="${CSS.escape(pendingFocusId)}"]`
      )
      ?.focus();
    setPendingFocusId(null);
  }, [pendingFocusId]);

  // The preview renders a slightly-lagged copy of the data, so typing in the
  // form stays instant even when the invoice spans many pages.
  const [previewData, setPreviewData] = useState<InvoiceData>(data);
  useEffect(() => {
    const t = setTimeout(() => setPreviewData(data), 200);
    return () => clearTimeout(t);
  }, [data]);

  const toggleSection = (id: SectionId) =>
    setCollapsedSections((s) => ({ ...s, [id]: !s[id] }));
  const isOpen = (id: SectionId) => !collapsedSections[id];

  // Sync working-copy edits into the active store record and persist. Guarded
  // so switching invoices (which sets `data` from the store) doesn't write the
  // old data back onto the newly-selected record.
  useEffect(() => {
    setStore((s) => {
      if (getActive(s).data === data) return s;
      const next = updateActiveData(s, data);
      saveStore(next);
      return next;
    });
  }, [data]);

  // When the active invoice changes (switch / new / duplicate / delete),
  // load its data into the working copy and reset per-invoice view state.
  useEffect(() => {
    setData(getActive(store).data);
    setCollapsedItemSections({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Persist which sections are collapsed.
  useEffect(() => {
    try {
      localStorage.setItem(
        SECTIONS_PREF_KEY,
        JSON.stringify(collapsedSections)
      );
    } catch {
      /* ignore */
    }
  }, [collapsedSections]);

  // Persist the view mode (form / both / preview).
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  const SelectedTemplate = getTemplate(previewData.template).Component;
  const accent = getAccent(data.accent);
  const previewAccent = getAccent(previewData.accent);

  const showForm = viewMode !== "preview";
  const showPreview = viewMode !== "form";
  // The form gets the whole width unless both panels share the screen.
  const formIsWide = viewMode !== "both";

  // Line-item table adapts: roomier with an Amount column when the form is
  // full-width, compact when the preview shares the screen. The first column
  // is the drag handle, the last holds row actions.
  const itemGridCols = formIsWide
    ? "grid-cols-[18px_1fr_90px_120px_130px_64px]"
    : "grid-cols-[14px_1fr_50px_70px_58px]";
  const currencySymbol = symbolForCode(data.currency);
  const totalItemCount = data.sections.reduce(
    (n, s) => n + s.items.length,
    0
  );
  const totals = computeTotals(data);

  const set = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggle = (field: ToggleField, value: boolean) =>
    setData((d) => ({ ...d, visible: { ...d.visible, [field]: value } }));

  // --- Section/item handlers ---
  // All are identity-stable (functional updates, no data deps) so the
  // memoized SectionEditor and its rows skip re-renders while typing.
  const updateSectionTitle = useCallback(
    (sectionId: string, title: string) =>
      setData((d) => mapSection(d, sectionId, (s) => ({ ...s, title }))),
    []
  );

  const updateItem = useCallback(
    (sectionId: string, itemId: string, patch: Partial<LineItem>) =>
      setData((d) =>
        mapSection(d, sectionId, (s) => ({
          ...s,
          items: s.items.map((it) =>
            it.id === itemId ? { ...it, ...patch } : it
          ),
        }))
      ),
    []
  );

  const addItem = useCallback((sectionId: string, afterItemId?: string) => {
    const newId = uid();
    setData((d) =>
      mapSection(d, sectionId, (s) => {
        const items = [...s.items];
        const at = afterItemId
          ? items.findIndex((it) => it.id === afterItemId)
          : -1;
        items.splice(at === -1 ? items.length : at + 1, 0, {
          id: newId,
          description: "",
          quantity: 1,
          rate: 0,
        });
        return { ...s, items };
      })
    );
    setPendingFocusId(newId);
  }, []);

  const duplicateItem = useCallback((sectionId: string, itemId: string) => {
    const newId = uid();
    setData((d) =>
      mapSection(d, sectionId, (s) => {
        const at = s.items.findIndex((it) => it.id === itemId);
        if (at === -1) return s;
        const items = [...s.items];
        items.splice(at + 1, 0, { ...items[at], id: newId });
        return { ...s, items };
      })
    );
    setPendingFocusId(newId);
  }, []);

  const removeItem = useCallback(
    (sectionId: string, itemId: string) =>
      setData((d) =>
        mapSection(d, sectionId, (s) => ({
          ...s,
          items: s.items.filter((it) => it.id !== itemId),
        }))
      ),
    []
  );

  const moveItem = useCallback(
    (sectionId: string, from: number, to: number) =>
      setData((d) =>
        mapSection(d, sectionId, (s) => {
          if (
            from === to ||
            from < 0 ||
            to < 0 ||
            from >= s.items.length ||
            to >= s.items.length
          ) {
            return s;
          }
          const items = [...s.items];
          const [moved] = items.splice(from, 1);
          items.splice(to, 0, moved);
          return { ...s, items };
        })
      ),
    []
  );

  const removeSection = useCallback(
    (sectionId: string) =>
      setData((d) => ({
        ...d,
        sections: d.sections.filter((s) => s.id !== sectionId),
      })),
    []
  );

  const togglePageBreak = useCallback(
    (sectionId: string, value: boolean) =>
      setData((d) =>
        mapSection(d, sectionId, (s) => ({ ...s, pageBreakBefore: value }))
      ),
    []
  );

  const toggleItemSection = useCallback(
    (sectionId: string) =>
      setCollapsedItemSections((m) => ({ ...m, [sectionId]: !m[sectionId] })),
    []
  );

  // When an item row gains focus, pan the preview to that row.
  const handleFocusItem = useCallback((itemId: string) => {
    previewApiRef.current?.scrollToItem(itemId);
  }, []);

  const addSection = () =>
    setData((d) => ({
      ...d,
      sections: [
        ...d.sections,
        {
          id: uid(),
          title: "",
          items: [{ id: uid(), description: "", quantity: 1, rate: 0 }],
        },
      ],
    }));

  // Sticky-bar shortcut: append to the last section, unfolding it if needed.
  const addItemToLastSection = () => {
    const last = data.sections[data.sections.length - 1];
    if (!last) return;
    setCollapsedSections((s) => ({ ...s, items: false }));
    setCollapsedItemSections((m) =>
      m[last.id] ? { ...m, [last.id]: false } : m
    );
    addItem(last.id);
  };

  const handleReset = () => {
    if (!confirm("Reset this invoice to a blank one? Other saved invoices are kept.")) return;
    setData(structuredClone(initialData));
    setCollapsedItemSections({});
  };

  // --- Multi-invoice store handlers ---
  const commitStore = (next: typeof store) => {
    saveStore(next);
    setStore(next);
  };
  const handleSelectInvoice = (id: string) => {
    commitStore(selectInvoice(store, id));
    setDrawerOpen(false);
  };
  const handleNewInvoice = () => {
    commitStore(addInvoice(store));
    setDrawerOpen(false);
  };
  const handleDuplicateInvoice = (id: string) =>
    commitStore(duplicateInvoice(store, id));
  const handleDeleteInvoice = (id: string) => {
    if (!confirm("Delete this invoice? This can't be undone.")) return;
    commitStore(deleteInvoice(store, id));
  };
  const handleCycleStatus = (id: string, next: InvoiceStatus) =>
    commitStore(setStatus(store, id, next));

  // Advance this invoice to the next period: bump the date by the frequency
  // and increment the invoice number. Everything else carries over.
  const generateNext = () => {
    setData((d) => {
      const nextDate = advanceDate(d.date, d.recurring.frequency);
      return {
        ...d,
        number: incrementNumber(d.number),
        date: nextDate || d.date,
        dueDate: d.visible.dueDate
          ? advanceDate(d.dueDate, d.recurring.frequency) || d.dueDate
          : d.dueDate,
      };
    });
  };

  // Preview of what the next issue date would be (for the UI hint).
  const nextIssueDate = advanceDate(data.date, data.recurring.frequency);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      // Make sure the capture node reflects the very latest edits (the
      // preview normally lags the form by the debounce interval).
      flushSync(() => setPreviewData(data));
      await exportToPdf(
        previewRef.current,
        `Invoice-${data.number || "draft"}.pdf`,
        data.watermark
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      alert(
        "Sorry, the PDF could not be generated. Check the console for details."
      );
    } finally {
      setDownloading(false);
    }
  };

  // Native browser print → real, selectable, vector text paginated by the
  // browser. We flush the latest edits into the capture copy, then temporarily
  // hoist that copy to be a direct child of <body> and hide the app shell, so
  // no app chrome or blank layout space leaks onto the printed pages. The tab
  // title becomes the default "Save as PDF" filename. Everything is restored
  // after the dialog closes (afterprint), with a timeout fallback.
  const handlePrint = () => {
    flushSync(() => setPreviewData(data));

    const wrap = previewRef.current?.closest<HTMLElement>(
      ".invoice-capture-wrap"
    );
    if (!wrap) {
      window.print();
      return;
    }

    const placeholder = document.createComment("invoice-capture-home");
    const parent = wrap.parentNode;
    const prevTitle = document.title;
    let restored = false;

    const restore = () => {
      if (restored) return;
      restored = true;
      if (parent && placeholder.parentNode === parent) {
        parent.replaceChild(wrap, placeholder);
      }
      document.body.classList.remove("is-printing");
      document.title = prevTitle;
      window.removeEventListener("afterprint", restore);
    };

    parent?.replaceChild(placeholder, wrap);
    document.body.appendChild(wrap);
    document.body.classList.add("is-printing");
    document.title = `Invoice-${data.number || "draft"}`;

    window.addEventListener("afterprint", restore);
    // Let the moved DOM lay out, then open the dialog. afterprint restores;
    // the timeout is a safety net if it never fires (rare, some browsers).
    requestAnimationFrame(() => {
      window.print();
      setTimeout(restore, 1000);
    });
  };

  const frequencyLabel = FREQUENCIES.find(
    (f) => f.id === data.recurring.frequency
  )?.label;

  return (
    <div className="min-h-full">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-indigo-600 text-sm font-bold text-white">
              W
            </div>
            <span className="flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight text-slate-800">
                Wajib
              </span>
              <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                Invoice Generator
              </span>
            </span>
            {data.recurring.enabled && (
              <span className="ml-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600">
                ↻ {frequencyLabel}
              </span>
            )}
            {/* Active invoice status — click to cycle Draft → Sent → Paid */}
            <button
              onClick={() =>
                handleCycleStatus(activeId, nextStatus(activeStatus))
              }
              title="Click to change status"
              className={`ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${STATUS_META[activeStatus].chip}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${STATUS_META[activeStatus].dot}`}
              />
              {STATUS_META[activeStatus].label}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Saved-invoices drawer trigger */}
            <button
              onClick={() => setDrawerOpen(true)}
              title="Saved invoices"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="4" rx="1" />
                <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              Invoices
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                {store.invoices.length}
              </span>
            </button>
            {/* View switcher: Form / Both / Preview (large screens only) */}
            <div
              role="group"
              aria-label="View"
              className="hidden items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 lg:inline-flex"
            >
              {VIEW_OPTIONS.map((opt) => {
                const active = viewMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setViewMode(opt.id)}
                    aria-pressed={active}
                    title={opt.title}
                    className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleReset}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={handlePrint}
              title="Print, or save as PDF from the print dialog"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9V2h12v7" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" rx="1" />
              </svg>
              Print
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {downloading ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main
        className={`mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 py-8 ${
          viewMode === "both" ? "lg:grid-cols-[minmax(360px,420px)_1fr]" : ""
        }`}
      >
        {/* ---------- Form ----------
             Always mounted so its state/focus handlers survive view switches.
             The view switcher is desktop-only, so on small screens both panels
             always show (stacked); a hidden panel is only pulled off-screen at
             the lg breakpoint. */}
        <section
          className={`relative rounded-md border border-slate-200 bg-white p-6 pb-0 shadow-sm ${
            formIsWide ? "mx-auto w-full max-w-4xl" : ""
          } ${
            !showForm
              ? "lg:pointer-events-none lg:absolute lg:-left-[9999px] lg:top-0"
              : ""
          }`}
          aria-hidden={!showForm}
        >
          {/* Template */}
          <CollapsibleSection
            title="Template"
            open={isOpen("template")}
            onToggle={() => toggleSection("template")}
            summary={
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: accent.base }}
                />
                {getTemplate(data.template).name}
              </span>
            }
          >
            <TemplatePicker
              value={data.template}
              onChange={(id) => set("template", id)}
            />

            <div className="mt-5">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Accent color
              </div>
              <div className="flex gap-2">
                {accents.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    title={a.name}
                    aria-label={a.name}
                    onClick={() => set("accent", a.id)}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                      data.accent === a.id
                        ? "ring-2 ring-slate-800 ring-offset-2"
                        : ""
                    }`}
                    style={{ backgroundColor: a.base }}
                  />
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* Branding */}
          <CollapsibleSection
            title="Branding"
            open={isOpen("branding")}
            onToggle={() => toggleSection("branding")}
            summary={data.headerTitle || "INVOICE"}
          >
            <div className="space-y-4">
              <Input
                label="Header title"
                placeholder="INVOICE"
                value={data.headerTitle}
                onChange={(e) => set("headerTitle", e.target.value)}
              />
              <Input
                label="Header subtitle"
                placeholder="e.g. a tagline or business line (optional)"
                value={data.headerSubtitle}
                onChange={(e) => set("headerSubtitle", e.target.value)}
              />
              <div>
                <Label>Header alignment</Label>
                <div
                  role="group"
                  aria-label="Header alignment"
                  className="inline-flex w-full items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5"
                >
                  {HEADER_ALIGN_OPTIONS.map((opt) => {
                    const active = data.headerAlign === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => set("headerAlign", opt.id)}
                        aria-pressed={active}
                        title={opt.title}
                        className={`flex flex-1 items-center justify-center rounded-[5px] px-2 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <LogoUpload
                value={data.logo}
                onChange={(url) => set("logo", url)}
                position={data.logoPosition}
                onPositionChange={(p) => set("logoPosition", p)}
              />
            </div>
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* From */}
          <CollapsibleSection
            title="From"
            open={isOpen("from")}
            onToggle={() => toggleSection("from")}
            summary={data.from}
          >
            <div className="space-y-4">
              <Input
                label="Name / company"
                value={data.from}
                onChange={(e) => set("from", e.target.value)}
              />
              <OptionalField
                label="Email"
                enabled={data.visible.fromEmail}
                onToggle={(v) => toggle("fromEmail", v)}
              >
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={data.fromEmail}
                  onChange={(e) => set("fromEmail", e.target.value)}
                />
              </OptionalField>
              <OptionalField
                label="Address"
                enabled={data.visible.fromAddress}
                onToggle={(v) => toggle("fromAddress", v)}
              >
                <Textarea
                  className="min-h-[70px]"
                  placeholder="Street, city, country"
                  value={data.fromAddress}
                  onChange={(e) => set("fromAddress", e.target.value)}
                />
              </OptionalField>
            </div>
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* Bill to */}
          <CollapsibleSection
            title="Bill To"
            open={isOpen("billTo")}
            onToggle={() => toggleSection("billTo")}
            summary={data.billTo}
          >
            <div className="space-y-4">
              <Input
                label="Client name"
                value={data.billTo}
                onChange={(e) => set("billTo", e.target.value)}
              />
              <OptionalField
                label="Client email"
                enabled={data.visible.billToEmail}
                onToggle={(v) => toggle("billToEmail", v)}
              >
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={data.billToEmail}
                  onChange={(e) => set("billToEmail", e.target.value)}
                />
              </OptionalField>
              <OptionalField
                label="Client address"
                enabled={data.visible.billToAddress}
                onToggle={(v) => toggle("billToAddress", v)}
              >
                <Textarea
                  className="min-h-[70px]"
                  placeholder="Street, city, country"
                  value={data.billToAddress}
                  onChange={(e) => set("billToAddress", e.target.value)}
                />
              </OptionalField>
            </div>
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* Invoice meta */}
          <CollapsibleSection
            title="Details"
            open={isOpen("details")}
            onToggle={() => toggleSection("details")}
            summary={`#${data.number}`}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Invoice #"
                  value={data.number}
                  onChange={(e) => set("number", e.target.value)}
                />
                <Input
                  label="Date"
                  type="date"
                  value={data.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
              <OptionalField
                label="Due date"
                enabled={data.visible.dueDate}
                onToggle={(v) => toggle("dueDate", v)}
              >
                <Input
                  type="date"
                  value={data.dueDate}
                  onChange={(e) => set("dueDate", e.target.value)}
                />
              </OptionalField>
              <OptionalField
                label="PO / Reference #"
                enabled={data.visible.poNumber}
                onToggle={(v) => toggle("poNumber", v)}
              >
                <Input
                  placeholder="e.g. PO-2024-001"
                  value={data.poNumber}
                  onChange={(e) => set("poNumber", e.target.value)}
                />
              </OptionalField>
            </div>
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* Recurring */}
          <CollapsibleSection
            title="Recurring"
            open={isOpen("recurring")}
            onToggle={() => toggleSection("recurring")}
            summary={data.recurring.enabled ? `↻ ${frequencyLabel}` : "Off"}
          >
            <div className="space-y-3">
              <Toggle
                checked={data.recurring.enabled}
                onChange={(v) =>
                  set("recurring", { ...data.recurring, enabled: v })
                }
                label="Enable recurring"
              />

              {data.recurring.enabled && (
                <>
                  <Select
                    label="Frequency"
                    value={data.recurring.frequency}
                    onChange={(e) =>
                      set("recurring", {
                        ...data.recurring,
                        frequency: e.target
                          .value as InvoiceData["recurring"]["frequency"],
                      })
                    }
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </Select>

                  <div className="rounded-md bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                    {data.date ? (
                      <>
                        Next invoice will be dated{" "}
                        <span className="font-semibold text-slate-700">
                          {nextIssueDate ? formatDate(nextIssueDate) : "—"}
                        </span>{" "}
                        as{" "}
                        <span className="font-semibold text-slate-700">
                          #{incrementNumber(data.number)}
                        </span>
                        .
                      </>
                    ) : (
                      <>Set an invoice date to enable the next-period preview.</>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={generateNext}
                    disabled={!data.date}
                    className="w-full rounded-md bg-slate-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Generate next invoice →
                  </button>

                  <p className="text-[11px] leading-5 text-slate-400">
                    This app runs entirely in your browser, so it can’t send
                    invoices automatically. “Generate next” advances the date
                    and number for you to review and download each period.
                  </p>
                </>
              )}
            </div>
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* Watermark */}
          <CollapsibleSection
            title="Watermark"
            open={isOpen("watermark")}
            onToggle={() => toggleSection("watermark")}
            summary={
              data.watermark.enabled && data.watermark.text.trim()
                ? data.watermark.text.trim().toUpperCase()
                : "Off"
            }
          >
            <div className="space-y-4">
              <Toggle
                checked={data.watermark.enabled}
                onChange={(v) =>
                  set("watermark", { ...data.watermark, enabled: v })
                }
                label="Show watermark"
              />

              {data.watermark.enabled && (
                <>
                  <div>
                    <Input
                      label="Text"
                      placeholder="DRAFT"
                      value={data.watermark.text}
                      onChange={(e) =>
                        set("watermark", {
                          ...data.watermark,
                          text: e.target.value,
                        })
                      }
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {WATERMARK_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            set("watermark", { ...data.watermark, text: p })
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            data.watermark.text.trim().toUpperCase() === p
                              ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                              : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Color
                    </div>
                    <div className="flex gap-2">
                      {watermarkColors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          aria-label={c.name}
                          onClick={() =>
                            set("watermark", { ...data.watermark, color: c.id })
                          }
                          className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                            data.watermark.color === c.id
                              ? "ring-2 ring-slate-800 ring-offset-2"
                              : ""
                          }`}
                          style={{ backgroundColor: watermarkCss(c.id) }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <span>Opacity</span>
                      <span className="tabular-nums text-slate-500">
                        {data.watermark.opacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      value={data.watermark.opacity}
                      onChange={(e) =>
                        set("watermark", {
                          ...data.watermark,
                          opacity: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <span>Size</span>
                      <span className="tabular-nums text-slate-500">
                        {data.watermark.size}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={WATERMARK_SIZE_MIN}
                      max={WATERMARK_SIZE_MAX}
                      value={data.watermark.size}
                      onChange={(e) =>
                        set("watermark", {
                          ...data.watermark,
                          size: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </>
              )}
            </div>
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* Line items */}
          <CollapsibleSection
            title="Line Items"
            open={isOpen("items")}
            onToggle={() => toggleSection("items")}
            summary={`${totalItemCount} item${totalItemCount === 1 ? "" : "s"}${
              data.sections.length > 1 ? ` · ${data.sections.length} sections` : ""
            } · ${formatMoney(totals.subtotal, currencySymbol)}`}
          >
            <div className="space-y-3">
              {data.sections.map((section, i) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  index={i}
                  showSectionUI={data.sections.length > 1}
                  canRemoveSection={data.sections.length > 1}
                  currencySymbol={currencySymbol}
                  gridCols={itemGridCols}
                  showAmount={formIsWide}
                  collapsed={!!collapsedItemSections[section.id]}
                  onToggleCollapsed={toggleItemSection}
                  onTitleChange={updateSectionTitle}
                  onRemoveSection={removeSection}
                  onUpdateItem={updateItem}
                  onAddItem={addItem}
                  onDuplicateItem={duplicateItem}
                  onRemoveItem={removeItem}
                  onMoveItem={moveItem}
                  onTogglePageBreak={togglePageBreak}
                  onFocusItem={handleFocusItem}
                />
              ))}
            </div>

            <button
              onClick={addSection}
              className="mt-3 w-full rounded-md border border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
            >
              + Add section
            </button>

            {data.sections.length > 1 && (
              <div className="mt-4 flex items-center justify-between rounded-md bg-slate-800 px-5 py-3.5 text-white shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Grand subtotal
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {formatMoney(totals.subtotal, currencySymbol)}
                </span>
              </div>
            )}
          </CollapsibleSection>

          <div className="my-6 h-px bg-slate-100" />

          {/* Totals config + notes */}
          <CollapsibleSection
            title="Totals & Notes"
            open={isOpen("totals")}
            onToggle={() => toggleSection("totals")}
            summary={`Tax ${data.taxRate}% · ${data.currency}`}
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tax rate (%)"
                type="number"
                value={data.taxRate}
                onChange={(e) => set("taxRate", Number(e.target.value) || 0)}
              />
              <Select
                label="Currency"
                value={data.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol.trim()}) — {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-4">
              <OptionalField
                label="Discount (%)"
                enabled={data.visible.discount}
                onToggle={(v) => toggle("discount", v)}
              >
                <Input
                  type="number"
                  value={data.discountRate}
                  onChange={(e) =>
                    set("discountRate", Number(e.target.value) || 0)
                  }
                />
              </OptionalField>
            </div>

            <div className="mt-4">
              <OptionalField
                label="Notes"
                enabled={data.visible.notes}
                onToggle={(v) => toggle("notes", v)}
              >
                <Textarea
                  placeholder="Payment details, terms, thank-you note…"
                  value={data.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </OptionalField>
            </div>
          </CollapsibleSection>

          {/* Sticky action bar: running total + quick add, always in reach
              even when the item list is hundreds of rows long. */}
          <div className="sticky bottom-0 z-10 -mx-6 mt-8 flex items-center justify-between gap-3 rounded-b-md border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
            <button
              type="button"
              onClick={addItemToLastSection}
              className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
            >
              + Add item
            </button>
            <div className="text-sm text-slate-500">
              Total{" "}
              <span className="text-base font-bold tabular-nums text-slate-900">
                {formatMoney(totals.total, currencySymbol)}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- Preview ----------
             Kept mounted even when hidden so previewRef stays valid for PDF
             export; when hidden we just move it off-screen. In "both" mode the
             panel is sticky with its own scrollbar so the pages stay in view
             while you scroll a long form. */}
        <section
          className={`min-w-0 overflow-x-auto rounded-md border border-slate-200 bg-slate-100 p-4 shadow-sm sm:p-6 ${
            viewMode === "both"
              ? "lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-auto"
              : "mx-auto w-full max-w-4xl"
          } ${
            !showPreview
              ? "lg:pointer-events-none lg:absolute lg:-left-[9999px] lg:top-0 lg:w-[820px]"
              : ""
          }`}
          aria-hidden={!showPreview}
        >
          <PreviewFrame
            captureRef={previewRef}
            apiRef={previewApiRef}
            watermark={previewData.watermark}
          >
            <SelectedTemplate data={previewData} accent={previewAccent} />
          </PreviewFrame>
        </section>
      </main>

      <InvoiceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        invoices={sortedInvoices(store)}
        activeId={activeId}
        onSelect={handleSelectInvoice}
        onNew={handleNewInvoice}
        onDuplicate={handleDuplicateInvoice}
        onDelete={handleDeleteInvoice}
        onCycleStatus={handleCycleStatus}
      />
    </div>
  );
}
