import HeaderBrand, { HeaderSubtitle, resolveAlign } from './HeaderBrand';
import { formatDate, formatMoney } from '../lib/format';
import { notesAtBottom, notesBeforeTotals } from '../lib/notes';

import NotesContent from './NotesContent';
import { PAGE_HEIGHT } from './page';
import SectionTableRows from './SectionTableRows';
import type { TemplateProps } from './index';
import { computeTotals } from '../lib/totals';
import { forwardRef } from 'react';
import { symbolForCode } from '../lib/currencies';

/**
 * Compact - dense, business-like layout with tight margins and a single-line
 * meta band. Suited to invoices with many line items that should fit one page.
 */
const CompactTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const headerAlign = resolveAlign(data.headerAlign, 'end');
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);

    return (
      <div
        ref={ref}
        className='mx-auto w-full max-w-[820px] bg-white text-[12px] text-slate-700'
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className='flex h-full flex-col px-12 py-10'>
          {/* Header */}
          <div
            className='flex items-start justify-between gap-6 border-b-2 pb-4'
            style={{ borderColor: accent.base }}
          >
            <div className='min-w-0 flex-1'>
              <div className='wrap-break-word text-[15px] font-bold text-slate-900'>
                {data.from || ' '}
              </div>
              {visible.fromEmail && data.fromEmail && (
                <div className='wrap-break-word text-[11.5px] text-slate-500'>
                  {data.fromEmail}
                </div>
              )}
              {visible.fromAddress && data.fromAddress && (
                <div className='mt-0.5 whitespace-pre-wrap wrap-break-word text-[11.5px] leading-4 text-slate-500'>
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
                  <div
                    className='text-[24px] font-bold uppercase leading-none tracking-wide'
                    style={{ color: accent.dark }}
                  >
                    {data.headerTitle || 'INVOICE'}
                  </div>
                  <HeaderSubtitle
                    text={data.headerSubtitle}
                    className='mt-1 text-[11.5px] text-slate-500'
                  />
                </>
              }
              subtitle={
                <div className='mt-1 text-[11px] font-medium text-slate-500'>
                  #{data.number}
                  {visible.poNumber && data.poNumber && (
                    <span className='ml-1 text-slate-400'>
                      · PO {data.poNumber}
                    </span>
                  )}
                </div>
              }
            />
          </div>

          {/* Meta band - Bill To + dates on one row */}
          <div className='mt-4 flex items-start justify-between gap-6'>
            <div className='min-w-0 flex-1'>
              <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
                Bill To{' '}
              </span>
              <span className='wrap-break-word text-[13px] font-semibold text-slate-900'>
                {data.billTo}
              </span>
              {visible.billToEmail && data.billToEmail && (
                <div className='wrap-break-word text-[11.5px] text-slate-500'>
                  {data.billToEmail}
                </div>
              )}
              {visible.billToAddress && data.billToAddress && (
                <div className='mt-0.5 whitespace-pre-wrap wrap-break-word text-[11.5px] leading-4 text-slate-500'>
                  {data.billToAddress}
                </div>
              )}
            </div>
            <div className='shrink-0 text-right text-[11.5px]'>
              <div>
                <span className='text-slate-400'>Date: </span>
                <span className='font-medium text-slate-800'>
                  {formatDate(data.date)}
                </span>
              </div>
              {visible.dueDate && data.dueDate && (
                <div className='mt-0.5'>
                  <span className='text-slate-400'>Due: </span>
                  <span className='font-medium text-slate-800'>
                    {formatDate(data.dueDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <table className='mt-5 w-full border-collapse'>
            <thead>
              <tr
                className='text-[10px] font-semibold uppercase tracking-wide text-white'
                style={{ backgroundColor: accent.base }}
              >
                <th className='px-3 py-2 text-left font-semibold'>Item</th>
                <th className='px-3 py-2 text-right font-semibold'>Qty</th>
                <th className='px-3 py-2 text-right font-semibold'>Rate</th>
                <th className='px-3 py-2 text-right font-semibold'>Amount</th>
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
                    <td className='px-3 py-2 text-left text-slate-900'>
                      {it.description}
                    </td>
                    <td className='px-3 py-2 text-right text-slate-600'>
                      {it.quantity}
                    </td>
                    <td className='px-3 py-2 text-right text-slate-600'>
                      {formatMoney(it.rate, currency)}
                    </td>
                    <td className='px-3 py-2 text-right font-medium text-slate-900'>
                      {formatMoney(it.quantity * it.rate, currency)}
                    </td>
                  </tr>
                )}
              />
            </tbody>
          </table>

          {/* Notes - before totals */}
          {notesBeforeTotals(data) && (
            <div data-atom className='mt-5 border-t border-slate-100 pt-4'>
              <NotesContent notes={data.notes} align={data.notesAlign} />
            </div>
          )}

          {/* Totals */}
          <div data-atom className='ml-auto mt-4 w-[45%] text-[12px]'>
            <div className='flex justify-between px-3 py-1'>
              <span className='text-slate-400'>Subtotal</span>
              <span className='text-slate-700'>
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            {visible.discount && (
              <div className='flex justify-between px-3 py-1'>
                <span className='text-slate-400'>
                  Discount ({discountRate}%)
                </span>
                <span className='text-slate-700'>
                  −{formatMoney(discount, currency)}
                </span>
              </div>
            )}
            <div className='flex justify-between px-3 py-1'>
              <span className='text-slate-400'>Tax ({taxRate}%)</span>
              <span className='text-slate-700'>
                {formatMoney(tax, currency)}
              </span>
            </div>
            <div
              className='mt-1 flex justify-between px-3 py-2 text-[14px] font-bold text-white'
              style={{ backgroundColor: accent.base }}
            >
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>

          {/* Notes - bottom */}
          {notesAtBottom(data) && (
            <div data-atom className='mt-8 border-t border-slate-100 pt-4'>
              <NotesContent notes={data.notes} align={data.notesAlign} />
            </div>
          )}
        </div>
      </div>
    );
  },
);

CompactTemplate.displayName = 'CompactTemplate';
export default CompactTemplate;
