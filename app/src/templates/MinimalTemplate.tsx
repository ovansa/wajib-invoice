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
import NotesContent from "./NotesContent";
import { notesBeforeTotals, notesAtBottom } from "../lib/notes";
import { PAGE_HEIGHT } from "./page";

const MinimalTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const headerAlign = resolveAlign(data.headerAlign, "start");
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);

    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[820px] bg-white text-[13px] text-slate-600"
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className="flex h-full flex-col px-20 py-20">
          {/* Title */}
          <div className="mb-16">
            <HeaderBrand
              logo={data.logo}
              position={data.logoPosition}
              align={headerAlign}
              title={
                <>
                  <h1 className="text-[26px] font-light tracking-[0.3em] text-slate-900">
                    {data.headerTitle || "INVOICE"}
                  </h1>
                  <HeaderSubtitle
                    text={data.headerSubtitle}
                    className="mt-1.5 text-[12.5px] tracking-wide text-slate-500"
                  />
                </>
              }
              subtitle={
                <div className="mt-1 text-[12px] tracking-wide text-slate-400">
                  No. {data.number}
                  {visible.poNumber && data.poNumber && (
                    <span> · PO {data.poNumber}</span>
                  )}
                </div>
              }
            />
          </div>

          {/* Parties + dates */}
          <div className="mb-16 grid grid-cols-3 gap-8 text-[12.5px]">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                From
              </div>
              <div className="font-medium text-slate-900">{data.from}</div>
              {visible.fromEmail && data.fromEmail && (
                <div className="mt-0.5 text-slate-500">{data.fromEmail}</div>
              )}
              {visible.fromAddress && data.fromAddress && (
                <div className="mt-1 whitespace-pre-wrap leading-5 text-slate-500">
                  {data.fromAddress}
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                To
              </div>
              <div className="font-medium text-slate-900">{data.billTo}</div>
              {visible.billToEmail && data.billToEmail && (
                <div className="mt-0.5 text-slate-500">{data.billToEmail}</div>
              )}
              {visible.billToAddress && data.billToAddress && (
                <div className="mt-1 whitespace-pre-wrap leading-5 text-slate-500">
                  {data.billToAddress}
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Issued
              </div>
              <div className="font-medium text-slate-900">
                {formatDate(data.date)}
              </div>
              {visible.dueDate && data.dueDate && (
                <>
                  <div className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Due
                  </div>
                  <div className="font-medium text-slate-900">
                    {formatDate(data.dueDate)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Items — borderless, thin rules */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                <th className="pb-2 text-left font-semibold">Description</th>
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
                variant="minimal"
                renderItem={(it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-3.5 text-left text-slate-900">
                      {it.description}
                    </td>
                    <td className="py-3.5 text-right">{it.quantity}</td>
                    <td className="py-3.5 text-right">
                      {formatMoney(it.rate, currency)}
                    </td>
                    <td className="py-3.5 text-right text-slate-900">
                      {formatMoney(it.quantity * it.rate, currency)}
                    </td>
                  </tr>
                )}
              />
            </tbody>
          </table>

          {/* Notes — before totals */}
          {notesBeforeTotals(data) && (
            <div data-atom className="mt-8 pt-6">
              <NotesContent
                notes={data.notes}
                labelClassName="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400"
                bodyClassName="whitespace-pre-wrap text-[12px] leading-7 text-slate-500"
              />
            </div>
          )}

          {/* Totals */}
          <div data-atom className="ml-auto mt-8 w-[45%] text-[12.5px]">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Subtotal</span>
              <span>{formatMoney(subtotal, currency)}</span>
            </div>
            {visible.discount && (
              <div className="flex justify-between py-1">
                <span className="text-slate-400">
                  Discount ({discountRate}%)
                </span>
                <span>−{formatMoney(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Tax ({taxRate}%)</span>
              <span>{formatMoney(tax, currency)}</span>
            </div>
            <div
              className="mt-2 flex justify-between border-t-2 pt-3 text-[16px] font-light"
              style={{ borderColor: accent.base, color: accent.dark }}
            >
              <span className="tracking-wide">Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>

          {/* Notes — bottom (after totals) */}
          {notesAtBottom(data) && (
            <div data-atom className="mt-14 pt-10">
              <NotesContent
                notes={data.notes}
                labelClassName="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400"
                bodyClassName="whitespace-pre-wrap text-[12px] leading-7 text-slate-500"
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

MinimalTemplate.displayName = "MinimalTemplate";
export default MinimalTemplate;
