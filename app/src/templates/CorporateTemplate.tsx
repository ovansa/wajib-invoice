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
 * Corporate - a formal, enterprise layout: a ruled header with an accent
 * underline, labelled info blocks, and a boxed totals panel. Understated and
 * professional for business-to-business billing.
 */
const CorporateTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ data, accent }, ref) => {
    const { taxRate, discountRate, visible } = data;
    const headerAlign = resolveAlign(data.headerAlign, 'end');
    const currency = symbolForCode(data.currency);
    const { subtotal, discount, tax, total } = computeTotals(data);

    const InfoBlock = ({
      label,
      children,
    }: {
      label: string;
      children: React.ReactNode;
    }) => (
      <div className='min-w-0'>
        <div
          className='mb-1.5 border-b pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500'
          style={{ borderColor: accent.base }}
        >
          {label}
        </div>
        {children}
      </div>
    );

    return (
      <div
        ref={ref}
        className='mx-auto w-full max-w-[820px] bg-white text-[12.5px] text-slate-700'
        style={{ minHeight: PAGE_HEIGHT }}
      >
        <div className='flex h-full flex-col px-14 py-12'>
          {/* Header */}
          <div className='flex items-start justify-between gap-8 pb-5'>
            <div className='min-w-0 flex-1 pt-1'>
              <div className='wrap-break-word text-[18px] font-semibold text-slate-900'>
                {data.from || ' '}
              </div>
              {visible.fromEmail && data.fromEmail && (
                <div className='wrap-break-word text-[12px] text-slate-500'>
                  {data.fromEmail}
                </div>
              )}
              {visible.fromAddress && data.fromAddress && (
                <div className='mt-0.5 whitespace-pre-wrap wrap-break-word text-[12px] leading-5 text-slate-500'>
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
                  <div className='text-[30px] font-semibold uppercase tracking-[0.06em] text-slate-800'>
                    {data.headerTitle || 'INVOICE'}
                  </div>
                  <HeaderSubtitle
                    text={data.headerSubtitle}
                    className='mt-1 text-[12px] text-slate-500'
                  />
                </>
              }
              subtitle={
                <div className='mt-1.5 text-[12px] font-medium text-slate-500'>
                  Invoice No. {data.number}
                  {visible.poNumber && data.poNumber && (
                    <div className='text-[11px] text-slate-400'>
                      PO / Ref: {data.poNumber}
                    </div>
                  )}
                </div>
              }
            />
          </div>

          {/* Accent rule */}
          <div
            className='h-[3px] w-full'
            style={{ backgroundColor: accent.base }}
          />

          {/* Info blocks */}
          <div className='mt-6 grid grid-cols-3 gap-8'>
            <InfoBlock label='Bill To'>
              <div className='wrap-break-word text-[13px] font-semibold text-slate-900'>
                {data.billTo}
              </div>
              {visible.billToEmail && data.billToEmail && (
                <div className='wrap-break-word text-[12px] text-slate-500'>
                  {data.billToEmail}
                </div>
              )}
              {visible.billToAddress && data.billToAddress && (
                <div className='mt-0.5 whitespace-pre-wrap wrap-break-word text-[12px] leading-5 text-slate-500'>
                  {data.billToAddress}
                </div>
              )}
            </InfoBlock>
            <InfoBlock label='Issue Date'>
              <div className='text-[13px] font-medium text-slate-800'>
                {formatDate(data.date)}
              </div>
            </InfoBlock>
            <InfoBlock
              label={visible.dueDate && data.dueDate ? 'Due Date' : 'Reference'}
            >
              <div className='text-[13px] font-medium text-slate-800'>
                {visible.dueDate && data.dueDate
                  ? formatDate(data.dueDate)
                  : `#${data.number}`}
              </div>
            </InfoBlock>
          </div>

          {/* Items */}
          <table className='mt-8 w-full border-collapse'>
            <thead>
              <tr className='border-y border-slate-300 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500'>
                <th className='px-3 py-2.5 text-left font-semibold'>
                  Description
                </th>
                <th className='px-3 py-2.5 text-right font-semibold'>Qty</th>
                <th className='px-3 py-2.5 text-right font-semibold'>
                  Unit Price
                </th>
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

          {/* Notes - before totals */}
          {notesBeforeTotals(data) && (
            <div data-atom className='mt-7 border-t border-slate-100 pt-5'>
              <NotesContent notes={data.notes} align={data.notesAlign} />
            </div>
          )}

          {/* Totals - boxed panel */}
          <div
            data-atom
            className='ml-auto mt-7 w-[48%] rounded-sm border border-slate-200 text-[12.5px]'
          >
            <div className='flex justify-between px-4 py-2'>
              <span className='text-slate-500'>Subtotal</span>
              <span className='text-slate-800'>
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            {visible.discount && (
              <div className='flex justify-between border-t border-slate-100 px-4 py-2'>
                <span className='text-slate-500'>
                  Discount ({discountRate}%)
                </span>
                <span className='text-slate-800'>
                  −{formatMoney(discount, currency)}
                </span>
              </div>
            )}
            <div className='flex justify-between border-t border-slate-100 px-4 py-2'>
              <span className='text-slate-500'>Tax ({taxRate}%)</span>
              <span className='text-slate-800'>
                {formatMoney(tax, currency)}
              </span>
            </div>
            <div
              className='flex justify-between px-4 py-3 text-[14px] font-bold text-white'
              style={{ backgroundColor: accent.dark }}
            >
              <span className='uppercase tracking-wide'>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>

          {/* Notes - bottom */}
          {notesAtBottom(data) && (
            <div data-atom className='mt-9 border-t border-slate-100 pt-5'>
              <NotesContent notes={data.notes} align={data.notesAlign} />
            </div>
          )}
        </div>
      </div>
    );
  },
);

CorporateTemplate.displayName = 'CorporateTemplate';
export default CorporateTemplate;
