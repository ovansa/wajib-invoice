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
 * Bold - a punchy, contemporary layout: a solid accent header band with the
 * invoice title reversed out in white, and a large accent-filled total block.
 */
const BoldTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const headerAlign = resolveAlign(data.headerAlign, 'end');
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);

    return (
      <div
        ref={ref}
        className='mx-auto w-full max-w-[820px] bg-white text-[13px] text-slate-700'
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className='flex h-full flex-col'>
          {/* Accent header band */}
          <div
            className='flex items-start justify-between gap-8 px-14 py-10 text-white'
            style={{ backgroundColor: accent.base }}
          >
            <HeaderBrand
              logo={data.logo}
              position={data.logoPosition}
              align='start'
              title={
                <>
                  <div className='text-[40px] font-extrabold uppercase leading-none tracking-tight'>
                    {data.headerTitle || 'INVOICE'}
                  </div>
                  <HeaderSubtitle
                    text={data.headerSubtitle}
                    className='mt-2 text-[13px] font-medium text-white/80'
                  />
                </>
              }
              subtitle={
                <div className='mt-2 text-[13px] font-semibold text-white/90'>
                  #{data.number}
                  {visible.poNumber && data.poNumber && (
                    <span className='text-white/70'> · PO {data.poNumber}</span>
                  )}
                </div>
              }
            />
            <div
              className='shrink-0 text-right text-[12px]'
              style={{ textAlign: headerAlign === 'start' ? 'left' : 'right' }}
            >
              <div className='font-semibold uppercase tracking-wide text-white/70'>
                Date
              </div>
              <div className='text-[14px] font-bold'>
                {formatDate(data.date)}
              </div>
              {visible.dueDate && data.dueDate && (
                <>
                  <div className='mt-2 font-semibold uppercase tracking-wide text-white/70'>
                    Due
                  </div>
                  <div className='text-[14px] font-bold'>
                    {formatDate(data.dueDate)}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className='flex flex-1 flex-col px-14 pb-14 pt-10'>
            {/* Parties */}
            <div className='mb-9 grid grid-cols-2 gap-10'>
              <div className='min-w-0'>
                <div
                  className='mb-1 text-[10px] font-bold uppercase tracking-[0.18em]'
                  style={{ color: accent.base }}
                >
                  From
                </div>
                <div className='wrap-break-word text-[15px] font-bold text-slate-900'>
                  {data.from || ' '}
                </div>
                {visible.fromEmail && data.fromEmail && (
                  <div className='wrap-break-word text-[12.5px] text-slate-500'>
                    {data.fromEmail}
                  </div>
                )}
                {visible.fromAddress && data.fromAddress && (
                  <div className='mt-1 whitespace-pre-wrap wrap-break-word text-[12.5px] leading-5 text-slate-500'>
                    {data.fromAddress}
                  </div>
                )}
              </div>
              <div className='min-w-0'>
                <div
                  className='mb-1 text-[10px] font-bold uppercase tracking-[0.18em]'
                  style={{ color: accent.base }}
                >
                  Bill To
                </div>
                <div className='wrap-break-word text-[15px] font-bold text-slate-900'>
                  {data.billTo}
                </div>
                {visible.billToEmail && data.billToEmail && (
                  <div className='wrap-break-word text-[12.5px] text-slate-500'>
                    {data.billToEmail}
                  </div>
                )}
                {visible.billToAddress && data.billToAddress && (
                  <div className='mt-1 whitespace-pre-wrap wrap-break-word text-[12.5px] leading-5 text-slate-500'>
                    {data.billToAddress}
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <table className='w-full border-collapse'>
              <thead>
                <tr className='border-b-2 border-slate-900 text-[11px] font-bold uppercase tracking-wide text-slate-900'>
                  <th className='py-2.5 pl-4 pr-3 text-left font-bold'>Item</th>
                  <th className='px-3 py-2.5 text-right font-bold'>Qty</th>
                  <th className='px-3 py-2.5 text-right font-bold'>Rate</th>
                  <th className='py-2.5 pl-3 pr-4 text-right font-bold'>
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
                    <tr
                      key={it.id}
                      className='border-b border-slate-100 align-top'
                    >
                      <td className='py-3 pl-4 pr-3 text-left font-semibold text-slate-900'>
                        {it.description}
                      </td>
                      <td className='px-3 py-3 text-right text-slate-600'>
                        {it.quantity}
                      </td>
                      <td className='px-3 py-3 text-right text-slate-600'>
                        {formatMoney(it.rate, currency)}
                      </td>
                      <td className='py-3 pl-3 pr-4 text-right font-bold text-slate-900'>
                        {formatMoney(it.quantity * it.rate, currency)}
                      </td>
                    </tr>
                  )}
                />
              </tbody>
            </table>

            {/* Notes - before totals */}
            {notesBeforeTotals(data) && (
              <div data-atom className='mt-8 border-t border-slate-100 pt-6'>
                <NotesContent notes={data.notes} align={data.notesAlign} />
              </div>
            )}

            {/* Totals */}
            <div data-atom className='ml-auto mt-8 w-[55%]'>
              <div className='text-[13px]'>
                <div className='flex justify-between py-1.5'>
                  <span className='text-slate-400'>Subtotal</span>
                  <span className='text-slate-700'>
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>
                {visible.discount && (
                  <div className='flex justify-between py-1.5'>
                    <span className='text-slate-400'>
                      Discount ({discountRate}%)
                    </span>
                    <span className='text-slate-700'>
                      −{formatMoney(discount, currency)}
                    </span>
                  </div>
                )}
                <div className='flex justify-between py-1.5'>
                  <span className='text-slate-400'>Tax ({taxRate}%)</span>
                  <span className='text-slate-700'>
                    {formatMoney(tax, currency)}
                  </span>
                </div>
              </div>
              <div
                className='mt-3 flex items-center justify-between rounded-md px-5 py-4 text-white'
                style={{ backgroundColor: accent.base }}
              >
                <span className='text-[13px] font-bold uppercase tracking-wide'>
                  Total Due
                </span>
                <span className='text-[22px] font-extrabold'>
                  {formatMoney(total, currency)}
                </span>
              </div>
            </div>

            {/* Notes - bottom */}
            {notesAtBottom(data) && (
              <div data-atom className='mt-10 border-t border-slate-100 pt-6'>
                <NotesContent notes={data.notes} align={data.notesAlign} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

BoldTemplate.displayName = 'BoldTemplate';
export default BoldTemplate;
