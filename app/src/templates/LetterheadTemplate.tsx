import { forwardRef } from "react";
import type { TemplateProps } from "./index";
import { formatMoney, formatDate } from "../lib/format";
import { computeTotals } from "../lib/totals";
import { symbolForCode } from "../lib/currencies";
import SectionTableRows from "./SectionTableRows";
import NotesContent from "./NotesContent";
import { notesBeforeTotals, notesAtBottom } from "../lib/notes";
import {
  HeaderSubtitle,
  resolveAlign,
  textAlignClass,
} from "./HeaderBrand";
import { PAGE_HEIGHT } from "./page";

const LetterheadTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const headerAlign = resolveAlign(data.headerAlign, "end");
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);

    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[820px] bg-white text-[13px] text-slate-700"
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className="flex h-full flex-col">
          {/* Full-width letterhead band */}
          <div
            className="flex items-center justify-between gap-8 px-14 py-9 text-white"
            style={{ backgroundColor: accent.base }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {data.logo && (
                <img
                  src={data.logo}
                  alt="Logo"
                  className="max-h-14 max-w-[120px] shrink-0 bg-white/95 object-contain p-1"
                  style={{ borderRadius: 2 }}
                />
              )}
              <div className="min-w-0">
                <div className="wrap-break-word text-[15px] font-semibold">
                  {data.from}
                </div>
                {visible.fromEmail && data.fromEmail && (
                  <div className="wrap-break-word text-[12px] opacity-85">
                    {data.fromEmail}
                  </div>
                )}
                {visible.fromAddress && data.fromAddress && (
                  <div className="whitespace-pre-wrap wrap-break-word text-[11.5px] leading-5 opacity-85">
                    {data.fromAddress}
                  </div>
                )}
              </div>
            </div>
            <div className={`shrink-0 ${textAlignClass[headerAlign]}`}>
              <div className="text-[30px] font-light leading-none tracking-[0.12em]">
                {data.headerTitle || "INVOICE"}
              </div>
              <HeaderSubtitle
                text={data.headerSubtitle}
                className="mt-1 text-[13px] opacity-90"
              />
              <div className="mt-1 text-[12px] opacity-85">#{data.number}</div>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-14 py-10">
            {/* Bill to + dates */}
            <div className="mb-8 flex items-start justify-between gap-8">
              <div className="min-w-0 flex-1">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                  style={{ color: accent.dark }}
                >
                  Bill To
                </div>
                <div className="mt-1 wrap-break-word text-[15px] font-semibold text-slate-900">
                  {data.billTo}
                </div>
                {visible.billToEmail && data.billToEmail && (
                  <div className="mt-0.5 wrap-break-word text-[12.5px] text-slate-500">
                    {data.billToEmail}
                  </div>
                )}
                {visible.billToAddress && data.billToAddress && (
                  <div className="mt-1 whitespace-pre-wrap wrap-break-word text-[12.5px] leading-5 text-slate-500">
                    {data.billToAddress}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right text-[12.5px]">
                {data.date && (
                  <div>
                    <span className="text-slate-400">Date: </span>
                    {formatDate(data.date)}
                  </div>
                )}
                {visible.dueDate && data.dueDate && (
                  <div className="mt-1">
                    <span className="text-slate-400">Due: </span>
                    {formatDate(data.dueDate)}
                  </div>
                )}
                {visible.poNumber && data.poNumber && (
                  <div className="mt-1 text-slate-400">
                    PO/Ref: {data.poNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <table className="w-full border-collapse">
              <thead>
                <tr
                  className="text-[11px] font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: accent.dark }}
                >
                  <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Rate</th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <SectionTableRows
                  data={data}
                  accent={accent}
                  colSpan={4}
                  variant="letterhead"
                  renderItem={(it) => (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-left font-medium text-slate-900">
                        {it.description}
                      </td>
                      <td className="px-4 py-3 text-right">{it.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(it.rate, currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {formatMoney(it.quantity * it.rate, currency)}
                      </td>
                    </tr>
                  )}
                />
              </tbody>
            </table>

            {/* Notes — before totals */}
            {notesBeforeTotals(data) && (
              <div data-atom className="mt-8 border-t border-slate-100 pt-6">
                <NotesContent
                  notes={data.notes}
                  align={data.notesAlign}
                  labelClassName="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]"
                  labelStyle={{ color: accent.dark }}
                />
              </div>
            )}

            {/* Totals */}
            <div data-atom className="ml-auto mt-6 w-[50%] text-[13px]">
              <div className="flex justify-between px-4 py-1.5">
                <span className="text-slate-400">Subtotal</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              {visible.discount && (
                <div className="flex justify-between px-4 py-1.5">
                  <span className="text-slate-400">
                    Discount ({discountRate}%)
                  </span>
                  <span>−{formatMoney(discount, currency)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-1.5">
                <span className="text-slate-400">Tax ({taxRate}%)</span>
                <span>{formatMoney(tax, currency)}</span>
              </div>
              <div
                className="mt-1.5 flex justify-between border-t-2 px-4 pt-2.5 text-[15px] font-bold"
                style={{ borderColor: accent.base, color: accent.dark }}
              >
                <span>Total</span>
                <span>{formatMoney(total, currency)}</span>
              </div>
            </div>

            {/* Notes — bottom (after totals) */}
            {notesAtBottom(data) && (
              <div data-atom className="mt-12 border-t border-slate-100 pt-6">
                <NotesContent
                  notes={data.notes}
                  align={data.notesAlign}
                  labelClassName="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]"
                  labelStyle={{ color: accent.dark }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

LetterheadTemplate.displayName = "LetterheadTemplate";
export default LetterheadTemplate;
