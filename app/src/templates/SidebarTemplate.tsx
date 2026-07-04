import { forwardRef } from "react";
import type { TemplateProps } from "./index";
import { formatMoney, formatDate } from "../lib/format";
import { computeTotals } from "../lib/totals";
import { symbolForCode } from "../lib/currencies";
import SectionTableRows from "./SectionTableRows";
import {
  HeaderSubtitle,
  resolveAlign,
  textAlignClass,
} from "./HeaderBrand";
import { PAGE_HEIGHT } from "./page";

const SidebarTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const headerAlign = resolveAlign(data.headerAlign, "start");
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);

    return (
      <div
        ref={ref}
        className="mx-auto flex w-full max-w-[820px] bg-white text-[13px] text-slate-700"
        style={{ minHeight: PAGE_HEIGHT }}
      >
        {/* Colored sidebar */}
        <aside
          className="flex w-[34%] flex-col gap-8 px-7 py-12 text-white"
          style={{ backgroundColor: accent.base }}
        >
          {data.logo && (
            <img
              src={data.logo}
              alt="Logo"
              className="max-h-16 max-w-[140px] object-contain"
            />
          )}

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
              From
            </div>
            <div className="mt-1 text-[15px] font-semibold">{data.from}</div>
            {visible.fromEmail && data.fromEmail && (
              <div className="mt-0.5 text-[12px] opacity-80">
                {data.fromEmail}
              </div>
            )}
            {visible.fromAddress && data.fromAddress && (
              <div className="mt-1 whitespace-pre-wrap text-[12px] leading-5 opacity-80">
                {data.fromAddress}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
              Bill To
            </div>
            <div className="mt-1 text-[15px] font-semibold">{data.billTo}</div>
            {visible.billToEmail && data.billToEmail && (
              <div className="mt-0.5 text-[12px] opacity-80">
                {data.billToEmail}
              </div>
            )}
            {visible.billToAddress && data.billToAddress && (
              <div className="mt-1 whitespace-pre-wrap text-[12px] leading-5 opacity-80">
                {data.billToAddress}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
              Date
            </div>
            <div className="mt-1 text-[13px]">{formatDate(data.date)}</div>
            {visible.dueDate && data.dueDate && (
              <>
                <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
                  Due
                </div>
                <div className="mt-1 text-[13px]">
                  {formatDate(data.dueDate)}
                </div>
              </>
            )}
          </div>

          {visible.notes && data.notes.trim() && (
            <div data-atom className="mt-10">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
                Notes
              </div>
              <div className="mt-1 whitespace-pre-wrap text-[11px] leading-6 opacity-80">
                {data.notes}
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col px-9 py-12">
          <div className={`mb-10 ${textAlignClass[headerAlign]}`}>
            <h1
              className="text-[34px] font-light leading-none tracking-[0.15em]"
              style={{ color: accent.dark }}
            >
              {data.headerTitle || "INVOICE"}
            </h1>
            <HeaderSubtitle
              text={data.headerSubtitle}
              className="mt-1.5 text-[13px] text-slate-500"
            />
            <div className="mt-1.5 text-[12px] text-slate-400">
              #{data.number}
              {visible.poNumber && data.poNumber && (
                <span> · PO {data.poNumber}</span>
              )}
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500" style={{ borderColor: accent.base }}>
                <th className="pb-2 text-left font-semibold">Item</th>
                <th className="pb-2 text-right font-semibold">Qty</th>
                <th className="pb-2 text-right font-semibold">Rate</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <SectionTableRows
                data={data}
                accent={accent}
                colSpan={4}
                variant="sidebar"
                renderItem={(it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-3 text-left font-medium text-slate-900">
                      {it.description}
                    </td>
                    <td className="py-3 text-right">{it.quantity}</td>
                    <td className="py-3 text-right">
                      {formatMoney(it.rate, currency)}
                    </td>
                    <td className="py-3 text-right text-slate-900">
                      {formatMoney(it.quantity * it.rate, currency)}
                    </td>
                  </tr>
                )}
              />
            </tbody>
          </table>

          <div data-atom className="ml-auto mt-6 w-[70%] text-[13px]">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Subtotal</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            {visible.discount && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Discount ({discountRate}%)</span>
                <span>−{formatMoney(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Tax ({taxRate}%)</span>
              <span>{formatMoney(tax, currency)}</span>
            </div>
            <div
              className="mt-2 flex items-center justify-between rounded-sm px-3 py-2.5 text-[15px] font-bold text-white"
              style={{ backgroundColor: accent.base }}
            >
              <span>Total Due</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>
        </main>
      </div>
    );
  }
);

SidebarTemplate.displayName = "SidebarTemplate";
export default SidebarTemplate;
