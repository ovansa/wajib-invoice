import { forwardRef } from 'react';
import type { TemplateProps } from './index';
import { formatMoney, formatDate } from '../lib/format';
import { computeTotals } from '../lib/totals';
import { symbolForCode } from '../lib/currencies';
import SectionTableRows from './SectionTableRows';
import NotesContent from './NotesContent';
import { notesBeforeTotals, notesAtBottom } from '../lib/notes';
import { PAGE_WIDTH, PAGE_HEIGHT } from './page';

// A4 is 210mm across, rendered at PAGE_WIDTH px — so px per mm is fixed.
const PX_PER_MM = PAGE_WIDTH / 210;

/**
 * Letterhead-ready — no logo, title, or From block, and a configurable band of
 * blank space reserved at the top so content clears pre-printed letterhead
 * artwork (company name/address already on the paper). Shows only the invoice
 * meta (number/dates), Bill To, items, totals, and notes.
 */
const PlainTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);
    const topSpace = Math.max(0, data.letterheadSpace) * PX_PER_MM;

    return (
      <div
        ref={ref}
        className='mx-auto w-full max-w-[820px] bg-white text-[13px] text-slate-700'
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className='flex h-full flex-col px-14 pb-14'>
          {/* Reserved blank space for pre-printed letterhead. */}
          <div style={{ height: topSpace }} aria-hidden />

          {/* Meta + Bill To — no From block (it's on the letterhead paper) */}
          <div className='flex items-start justify-between gap-8'>
            <div className='min-w-0 flex-1'>
              <div className='text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400'>
                Bill To
              </div>
              <div className='mt-1 wrap-break-word text-[15px] font-semibold text-slate-900'>
                {data.billTo}
              </div>
              {visible.billToEmail && data.billToEmail && (
                <div className='mt-0.5 wrap-break-word text-[12.5px] text-slate-500'>
                  {data.billToEmail}
                </div>
              )}
              {visible.billToAddress && data.billToAddress && (
                <div className='mt-1 whitespace-pre-wrap wrap-break-word text-[12.5px] leading-5 text-slate-500'>
                  {data.billToAddress}
                </div>
              )}
            </div>
            <div className='shrink-0 text-right'>
              <div className='text-[20px] font-semibold uppercase tracking-wide text-slate-800'>
                {data.headerTitle || 'INVOICE'}
              </div>
              <div
                className='mt-1 text-[12.5px] font-medium'
                style={{ color: accent.base }}
              >
                #{data.number}
              </div>
              {visible.poNumber && data.poNumber && (
                <div className='text-[11.5px] text-slate-400'>
                  PO / Ref: {data.poNumber}
                </div>
              )}
              <div className='mt-2 text-[12.5px]'>
                <span className='text-slate-400'>Date: </span>
                <span className='font-medium text-slate-800'>
                  {formatDate(data.date)}
                </span>
              </div>
              {visible.dueDate && data.dueDate && (
                <div className='text-[12.5px]'>
                  <span className='text-slate-400'>Due: </span>
                  <span className='font-medium text-slate-800'>
                    {formatDate(data.dueDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <table className='mt-8 w-full border-collapse'>
            <thead>
              <tr
                className='border-b-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500'
                style={{ borderColor: accent.base }}
              >
                <th className='px-3 py-2.5 text-left font-semibold'>
                  Description
                </th>
                <th className='px-3 py-2.5 text-right font-semibold'>Qty</th>
                <th className='px-3 py-2.5 text-right font-semibold'>Rate</th>
                <th className='px-3 py-2.5 text-right font-semibold'>Amount</th>
              </tr>
            </thead>
            <tbody>
              <SectionTableRows
                data={data}
                accent={accent}
                colSpan={4}
                renderItem={(it) => (
                  <tr
                    key={it.id}
                    className='border-b border-slate-100 align-top'
                  >
                    <td className='px-3 py-3 text-left text-slate-900'>
                      {it.description}
                    </td>
                    <td className='px-3 py-3 text-right text-slate-600'>
                      {it.quantity}
                    </td>
                    <td className='px-3 py-3 text-right text-slate-600'>
                      {formatMoney(it.rate, currency)}
                    </td>
                    <td className='px-3 py-3 text-right font-medium text-slate-900'>
                      {formatMoney(it.quantity * it.rate, currency)}
                    </td>
                  </tr>
                )}
              />
            </tbody>
          </table>

          {/* Notes — before totals */}
          {notesBeforeTotals(data) && (
            <div data-atom className='mt-8 border-t border-slate-100 pt-6'>
              <NotesContent notes={data.notes} align={data.notesAlign} />
            </div>
          )}

          {/* Totals */}
          <div data-atom className='ml-auto mt-7 w-[48%] text-[13px]'>
            <div className='flex justify-between px-3 py-1.5'>
              <span className='text-slate-400'>Subtotal</span>
              <span className='text-slate-700'>
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            {visible.discount && (
              <div className='flex justify-between px-3 py-1.5'>
                <span className='text-slate-400'>
                  Discount ({discountRate}%)
                </span>
                <span className='text-slate-700'>
                  −{formatMoney(discount, currency)}
                </span>
              </div>
            )}
            <div className='flex justify-between px-3 py-1.5'>
              <span className='text-slate-400'>Tax ({taxRate}%)</span>
              <span className='text-slate-700'>{formatMoney(tax, currency)}</span>
            </div>
            <div
              className='mt-1.5 flex justify-between border-t-2 px-3 pt-2.5 text-[15px] font-bold text-slate-900'
              style={{ borderColor: accent.base }}
            >
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>

          {/* Notes — bottom */}
          {notesAtBottom(data) && (
            <div data-atom className='mt-12 border-t border-slate-100 pt-6'>
              <NotesContent notes={data.notes} align={data.notesAlign} />
            </div>
          )}
        </div>
      </div>
    );
  },
);

PlainTemplate.displayName = 'PlainTemplate';
export default PlainTemplate;
