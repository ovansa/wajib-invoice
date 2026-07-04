import { forwardRef } from "react";
import type { TemplateProps } from "./index";
import { formatMoney, formatDate } from "../lib/format";
import { computeTotals } from "../lib/totals";
import { symbolForCode } from "../lib/currencies";
import HeaderBrand, {
  HeaderSubtitle,
  resolveAlign,
} from "./HeaderBrand";
import SectionTableRows from "./SectionTableRows";
import { PAGE_HEIGHT } from "./page";

const ModernTemplate = forwardRef<HTMLDivElement, TemplateProps>(
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
        <div className="h-1.5 w-full" style={{ backgroundColor: accent.base }} />

        <div className="flex h-full flex-col px-16 pb-16 pt-12">
          {/* Header */}
          <div className="mb-12 flex items-start justify-between gap-8">
            <div className="pt-1">
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                From
              </div>
              <div className="mt-1 text-[17px] font-semibold text-slate-900">
                {data.from || " "}
              </div>
              {visible.fromEmail && data.fromEmail && (
                <div className="mt-0.5 text-[12.5px] text-slate-500">
                  {data.fromEmail}
                </div>
              )}
              {visible.fromAddress && data.fromAddress && (
                <div className="mt-1 whitespace-pre-wrap text-[12.5px] leading-5 text-slate-500">
                  {data.fromAddress}
                </div>
              )}
            </div>
            <HeaderBrand
              logo={data.logo}
              position={data.logoPosition}
              align={headerAlign}
              title={
                <>
                  <div className="text-[38px] font-light leading-none tracking-[0.12em] text-slate-800">
                    {data.headerTitle || "INVOICE"}
                  </div>
                  <HeaderSubtitle
                    text={data.headerSubtitle}
                    className="mt-1.5 text-[13px] text-slate-500"
                  />
                </>
              }
              subtitle={
                <div>
                  <div
                    className="mt-1.5 text-[12px] font-medium tracking-wide"
                    style={{ color: accent.base }}
                  >
                    #{data.number}
                  </div>
                  {visible.poNumber && data.poNumber && (
                    <div className="mt-0.5 text-[11.5px] text-slate-400">
                      PO / Ref: {data.poNumber}
                    </div>
                  )}
                </div>
              }
            />
          </div>

          {/* Meta */}
          <div className="mb-6 flex items-start justify-between gap-8">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Bill To
              </div>
              <div className="mt-1 text-[15px] font-semibold text-slate-900">
                {data.billTo}
              </div>
              {visible.billToEmail && data.billToEmail && (
                <div className="mt-0.5 text-[12.5px] text-slate-500">
                  {data.billToEmail}
                </div>
              )}
              {visible.billToAddress && data.billToAddress && (
                <div className="mt-1 whitespace-pre-wrap text-[12.5px] leading-5 text-slate-500">
                  {data.billToAddress}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Date
              </div>
              <div className="mt-1 text-[14px] font-medium text-slate-800">
                {formatDate(data.date)}
              </div>
              {visible.dueDate && data.dueDate && (
                <>
                  <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Due Date
                  </div>
                  <div className="mt-1 text-[14px] font-medium text-slate-800">
                    {formatDate(data.dueDate)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Balance due */}
          <div
            data-atom
            className="mb-9 flex items-center justify-between rounded-sm px-5 py-3.5"
            style={{ backgroundColor: accent.soft }}
          >
            <span
              className="text-[13px] font-semibold uppercase tracking-wide"
              style={{ color: accent.onSoft }}
            >
              Balance Due
            </span>
            <span
              className="text-[18px] font-bold"
              style={{ color: accent.onSoft }}
            >
              {formatMoney(total, currency)}
            </span>
          </div>

          {/* Items */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-[11px] font-medium uppercase tracking-wide text-white">
                <th className="rounded-l-sm px-4 py-3 text-left font-medium">
                  Item
                </th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
                <th className="rounded-r-sm px-4 py-3 text-right font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionTableRows
                data={data}
                accent={accent}
                colSpan={4}
                renderItem={(it) => (
                  <tr key={it.id} className="border-b border-slate-100 align-top">
                    <td className="px-4 py-3.5 text-left font-semibold text-slate-900">
                      {it.description}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-600">
                      {it.quantity}
                    </td>
                    <td className="px-4 py-3.5 text-right text-slate-600">
                      {formatMoney(it.rate, currency)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {formatMoney(it.quantity * it.rate, currency)}
                    </td>
                  </tr>
                )}
              />
            </tbody>
          </table>

          {/* Totals */}
          <div data-atom className="ml-auto mt-7 w-[52%] text-[13px]">
            <div className="flex justify-between px-4 py-1.5">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-700">
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            {visible.discount && (
              <div className="flex justify-between px-4 py-1.5">
                <span className="text-slate-400">
                  Discount ({discountRate}%)
                </span>
                <span className="text-slate-700">
                  −{formatMoney(discount, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between px-4 py-1.5">
              <span className="text-slate-400">Tax ({taxRate}%)</span>
              <span className="text-slate-700">
                {formatMoney(tax, currency)}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between border-t-2 border-slate-800 px-4 pt-2.5 text-[15px] font-bold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>

          {/* Notes */}
          {visible.notes && data.notes.trim() && (
            <div data-atom className="mt-auto border-t border-slate-100 pt-6">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Notes
              </div>
              <div className="whitespace-pre-wrap text-[12.5px] leading-7 text-slate-600">
                {data.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ModernTemplate.displayName = "ModernTemplate";
export default ModernTemplate;
