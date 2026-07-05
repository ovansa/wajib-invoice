import { forwardRef } from "react";
import type { TemplateProps } from "./index";
import { formatMoney, formatDate } from "../lib/format";
import { computeTotals, sectionSubtotal, hasNamedSections } from "../lib/totals";
import { symbolForCode } from "../lib/currencies";
import HeaderBrand, {
  HeaderSubtitle,
  resolveAlign,
} from "./HeaderBrand";
import { notesBeforeTotals, notesAtBottom } from "../lib/notes";
import { PAGE_HEIGHT } from "./page";

const alignItemsCls = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const;

const ReceiptTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);
    const showSections = hasNamedSections(data);
    const headerAlign = resolveAlign(data.headerAlign, "center");

    // Receipt notes use a dashed rule and no label; alignment follows the
    // notesAlign setting (defaulting to the receipt's centered look feel is
    // dropped in favor of respecting the user's choice). The same markup is
    // dropped into whichever position is selected.
    const notesAlignCls =
      data.notesAlign === "left"
        ? "text-left"
        : data.notesAlign === "right"
          ? "text-right"
          : "text-center";
    const receiptNotes = (
      <div
        data-atom
        className={`border-t border-dashed border-slate-300 pt-5 ${notesAlignCls}`}
      >
        <div className="whitespace-pre-wrap text-[11px] leading-6 text-slate-500">
          {data.notes}
        </div>
      </div>
    );

    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[820px] bg-slate-50 text-[13px] text-slate-700"
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className="flex h-full justify-center pt-14">
          {/* Receipt card */}
          <div className="h-fit w-[62%] bg-white px-10 py-10 shadow-sm">
            {/* Header */}
            <div
              data-atom
              className={`border-b border-dashed border-slate-300 pb-6 ${alignItemsCls[headerAlign]}`}
            >
              <HeaderBrand
                logo={data.logo}
                position={data.logoPosition}
                align={headerAlign}
                title={
                  <>
                    <h1
                      className="text-[22px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: accent.dark }}
                    >
                      {data.headerTitle || "INVOICE"}
                    </h1>
                    <HeaderSubtitle
                      text={data.headerSubtitle}
                      className="mt-1 text-[12px] text-slate-500"
                    />
                  </>
                }
                subtitle={
                  <div className="mt-1 text-[11px] tracking-wide text-slate-400">
                    #{data.number}
                    {visible.poNumber && data.poNumber && (
                      <span> · PO {data.poNumber}</span>
                    )}
                  </div>
                }
              />
            </div>

            {/* Meta rows */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 py-5 text-[12px]">
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-slate-400">From</span>
                <span className="min-w-0 wrap-break-word text-right font-medium text-slate-900">
                  {data.from}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="shrink-0 text-slate-400">Billed to</span>
                <span className="min-w-0 wrap-break-word text-right font-medium text-slate-900">
                  {data.billTo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span>{formatDate(data.date)}</span>
              </div>
              {visible.dueDate && data.dueDate && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Due</span>
                  <span>{formatDate(data.dueDate)}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-slate-300 py-5">
              {data.sections.map((section, si) => (
                <div key={section.id} className="mb-4 last:mb-0">
                  {showSections && (
                    <div
                      className="mb-2 text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: accent.dark }}
                      data-section-break={
                        si > 0 && section.pageBreakBefore ? "" : undefined
                      }
                    >
                      {section.title.trim() || "Section"}
                    </div>
                  )}
                  {section.items.map((it) => (
                    <div
                      key={it.id}
                      data-atom
                      data-item-id={it.id}
                      className="mb-3 last:mb-0"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium text-slate-900">
                          {it.description}
                        </span>
                        <span className="text-slate-900">
                          {formatMoney(it.quantity * it.rate, currency)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {it.quantity} × {formatMoney(it.rate, currency)}
                      </div>
                    </div>
                  ))}
                  {showSections && (
                    <div className="mt-2 flex justify-between border-t border-dashed border-slate-200 pt-1.5 text-[11px] font-semibold text-slate-500">
                      <span>Section subtotal</span>
                      <span className="text-slate-800">
                        {formatMoney(sectionSubtotal(section), currency)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Notes — before totals */}
            {notesBeforeTotals(data) && <div className="py-5">{receiptNotes}</div>}

            {/* Totals */}
            <div data-atom className="py-5 text-[12.5px]">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Subtotal</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              {visible.discount && (
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">
                    Discount ({discountRate}%)
                  </span>
                  <span>−{formatMoney(discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">Tax ({taxRate}%)</span>
                <span>{formatMoney(tax, currency)}</span>
              </div>
              <div
                className="mt-2 flex justify-between border-t-2 border-dashed pt-2 text-[16px] font-bold"
                style={{ borderColor: accent.base, color: accent.dark }}
              >
                <span>Total</span>
                <span>{formatMoney(total, currency)}</span>
              </div>
            </div>

            {/* Notes — bottom (after totals) */}
            {notesAtBottom(data) && <div className="pt-5">{receiptNotes}</div>}
          </div>
        </div>
      </div>
    );
  }
);

ReceiptTemplate.displayName = "ReceiptTemplate";
export default ReceiptTemplate;
