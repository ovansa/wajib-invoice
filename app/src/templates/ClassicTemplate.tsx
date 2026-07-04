import { forwardRef } from "react";
import type { TemplateProps } from "./index";
import { formatMoney, formatDate } from "../lib/format";
import { computeTotals } from "../lib/totals";
import { symbolForCode } from "../lib/currencies";
import HeaderBrand from "./HeaderBrand";
import SectionTableRows from "./SectionTableRows";
import { PAGE_HEIGHT } from "./page";

const ClassicTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);

    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[820px] bg-white font-serif text-[13px] text-slate-700"
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className="flex h-full flex-col border-[3px] border-double border-slate-800 px-14 py-12">
          {/* Centered title */}
          <div className="flex flex-col items-center border-b-2 border-slate-800 pb-4 text-center">
            <HeaderBrand
              logo={data.logo}
              position={data.logoPosition}
              align="center"
              title={
                <h1
                  className="text-[30px] font-bold uppercase tracking-[0.25em]"
                  style={{ color: accent.dark }}
                >
                  {data.headerTitle || "INVOICE"}
                </h1>
              }
              subtitle={
                <div className="mt-1 text-[12px] tracking-wide text-slate-500">
                  Invoice No. {data.number}
                  {visible.poNumber && data.poNumber && (
                    <span> &nbsp;|&nbsp; PO/Ref: {data.poNumber}</span>
                  )}
                </div>
              }
            />
          </div>

          {/* From / To / Dates */}
          <div className="mt-6 flex justify-between gap-8">
            <div className="max-w-[48%]">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                From
              </div>
              <div className="font-bold text-slate-900">{data.from}</div>
              {visible.fromEmail && data.fromEmail && (
                <div className="mt-0.5 text-[12.5px] text-slate-600">
                  {data.fromEmail}
                </div>
              )}
              {visible.fromAddress && data.fromAddress && (
                <div className="mt-1 whitespace-pre-wrap text-[12.5px] leading-5 text-slate-600">
                  {data.fromAddress}
                </div>
              )}
            </div>
            <div className="max-w-[48%] text-right">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Bill To
              </div>
              <div className="font-bold text-slate-900">{data.billTo}</div>
              {visible.billToEmail && data.billToEmail && (
                <div className="mt-0.5 text-[12.5px] text-slate-600">
                  {data.billToEmail}
                </div>
              )}
              {visible.billToAddress && data.billToAddress && (
                <div className="mt-1 whitespace-pre-wrap text-[12.5px] leading-5 text-slate-600">
                  {data.billToAddress}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-between border-y border-slate-300 py-2 text-[12.5px]">
            <span>
              {data.date && (
                <>
                  <span className="font-bold text-slate-800">Date: </span>
                  {formatDate(data.date)}
                </>
              )}
            </span>
            {visible.dueDate && data.dueDate && (
              <span>
                <span className="font-bold text-slate-800">Due: </span>
                {formatDate(data.dueDate)}
              </span>
            )}
          </div>

          {/* Items — fully bordered */}
          <table className="mt-6 w-full border-collapse border border-slate-800">
            <thead>
              <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-800">
                <th className="border border-slate-800 px-3 py-2 text-left">
                  Description
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  Qty
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  Rate
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <SectionTableRows
                data={data}
                accent={accent}
                colSpan={4}
                variant="classic"
                renderItem={(it) => (
                  <tr key={it.id}>
                    <td className="border border-slate-300 px-3 py-2.5 text-left text-slate-900">
                      {it.description}
                    </td>
                    <td className="border border-slate-300 px-3 py-2.5 text-right">
                      {it.quantity}
                    </td>
                    <td className="border border-slate-300 px-3 py-2.5 text-right">
                      {formatMoney(it.rate, currency)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2.5 text-right text-slate-900">
                      {formatMoney(it.quantity * it.rate, currency)}
                    </td>
                  </tr>
                )}
              />
            </tbody>
          </table>

          {/* Totals — boxed */}
          <div
            data-atom
            className="ml-auto mt-5 w-[50%] border border-slate-800 text-[12.5px]"
          >
            <div className="flex justify-between px-3 py-1.5">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            {visible.discount && (
              <div className="flex justify-between border-t border-slate-300 px-3 py-1.5">
                <span>Discount ({discountRate}%)</span>
                <span>−{formatMoney(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-300 px-3 py-1.5">
              <span>Tax ({taxRate}%)</span>
              <span>{formatMoney(tax, currency)}</span>
            </div>
            <div
              className="flex justify-between border-t-2 border-slate-800 px-3 py-2 text-[14px] font-bold"
              style={{ backgroundColor: accent.soft, color: accent.onSoft }}
            >
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>

          {/* Notes */}
          {visible.notes && data.notes.trim() && (
            <div data-atom className="mt-auto border-t border-slate-300 pt-5">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Notes
              </div>
              <div className="whitespace-pre-wrap text-[12px] leading-7 text-slate-600">
                {data.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ClassicTemplate.displayName = "ClassicTemplate";
export default ClassicTemplate;
