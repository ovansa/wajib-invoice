import { STATUS_META, STATUS_ORDER } from '../lib/store';
import { formatDate, formatMoney } from '../lib/format';

import type { InvoiceStatus } from '../types';
import type { SavedInvoice } from '../lib/store';
import { computeTotals } from '../lib/totals';
import { symbolForCode } from '../lib/currencies';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  invoices: SavedInvoice[]; // already sorted newest-first
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSetStatus: (id: string, status: InvoiceStatus) => void;
};

const TrashIcon = (
  <svg
    viewBox='0 0 24 24'
    className='h-4 w-4'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6' />
    <line x1='10' y1='11' x2='10' y2='17' />
    <line x1='14' y1='11' x2='14' y2='17' />
  </svg>
);

const CopyIcon = (
  <svg
    viewBox='0 0 24 24'
    className='h-4 w-4'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <rect x='9' y='9' width='11' height='11' rx='2' />
    <path d='M5 15V5a2 2 0 0 1 2-2h10' />
  </svg>
);

export default function InvoiceDrawer({
  open,
  onClose,
  invoices,
  activeId,
  onSelect,
  onNew,
  onDuplicate,
  onDelete,
  onSetStatus,
}: Props) {
  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-slate-900/30 transition-opacity ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Panel */}
      <aside
        role='dialog'
        aria-label='Saved invoices'
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(400px,100vw)] flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className='flex items-center justify-between border-b border-slate-200 px-5 py-4'>
          <h2 className='text-sm font-semibold text-slate-800'>
            Invoices
            <span className='ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500'>
              {invoices.length}
            </span>
          </h2>
          <button
            onClick={onClose}
            aria-label='Close'
            className='rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
          >
            <svg
              viewBox='0 0 24 24'
              className='h-4 w-4'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            >
              <line x1='6' y1='6' x2='18' y2='18' />
              <line x1='18' y1='6' x2='6' y2='18' />
            </svg>
          </button>
        </div>

        <div className='border-b border-slate-100 p-3'>
          <button
            onClick={onNew}
            className='inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500'
          >
            <svg
              viewBox='0 0 24 24'
              className='h-4 w-4'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            >
              <line x1='12' y1='5' x2='12' y2='19' />
              <line x1='5' y1='12' x2='19' y2='12' />
            </svg>
            New invoice
          </button>
        </div>

        <ul className='flex-1 divide-y divide-slate-100 overflow-y-auto'>
          {invoices.map((inv) => {
            const symbol = symbolForCode(inv.data.currency);
            const total = computeTotals(inv.data).total;
            const isActive = inv.id === activeId;
            const meta = STATUS_META[inv.status];
            const client = inv.data.billTo.trim() || 'No client';
            const number = inv.data.number.trim() || '-';
            const dateLabel = formatDate(inv.data.date);
            return (
              <li key={inv.id}>
                <div
                  className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
                    isActive ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    onClick={() => onSelect(inv.id)}
                    className='min-w-0 flex-1 text-left'
                  >
                    <div className='flex items-center gap-2'>
                      <span className='truncate text-sm font-semibold text-slate-800'>
                        {number}
                      </span>
                      {isActive && (
                        <span className='rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600'>
                          Active
                        </span>
                      )}
                    </div>
                    <div className='mt-0.5 truncate text-sm text-slate-500'>
                      {client}
                    </div>
                    <div className='mt-1 flex items-center gap-2 text-xs text-slate-400'>
                      <span className='font-medium text-slate-600'>
                        {formatMoney(total, symbol)}
                      </span>
                      {dateLabel && <span>· {dateLabel}</span>}
                    </div>
                  </button>

                  <div className='flex flex-col items-end gap-2'>
                    {/* Status pill - pick any status directly */}
                    <div
                      className={`relative inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                      />
                      {meta.label}
                      <select
                        value={inv.status}
                        onChange={(e) =>
                          onSetStatus(inv.id, e.target.value as InvoiceStatus)
                        }
                        title='Change status'
                        aria-label='Status'
                        className='absolute inset-0 cursor-pointer opacity-0'
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                      <button
                        onClick={() => onDuplicate(inv.id)}
                        title='Duplicate'
                        className='rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600'
                      >
                        {CopyIcon}
                      </button>
                      <button
                        onClick={() => onDelete(inv.id)}
                        title='Delete'
                        className='rounded p-1 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600'
                      >
                        {TrashIcon}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
