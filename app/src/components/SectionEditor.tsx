import { memo, useCallback, useRef, useState, type KeyboardEvent } from 'react';
import type { ItemSection, LineItem } from '../types';
import { formatMoney } from '../lib/format';
import { sectionSubtotal } from '../lib/totals';

type Props = {
  section: ItemSection;
  index: number;
  /** Total number of sections - used to disable the move-down arrow on the last. */
  sectionCount: number;
  showSectionUI: boolean; // show title/collapse/remove when more than one section
  canRemoveSection: boolean;
  currencySymbol: string;
  gridCols: string;
  showAmount: boolean;
  collapsed: boolean;
  onToggleCollapsed: (sectionId: string) => void;
  onTitleChange: (sectionId: string, title: string) => void;
  onRemoveSection: (sectionId: string) => void;
  /** Move this section from its current index to `to` (reorder). */
  onMoveSection: (from: number, to: number) => void;
  onUpdateItem: (
    sectionId: string,
    itemId: string,
    patch: Partial<LineItem>,
  ) => void;
  /** Append a row, or insert after `afterItemId` when given (Enter key). */
  onAddItem: (sectionId: string, afterItemId?: string) => void;
  onDuplicateItem: (sectionId: string, itemId: string) => void;
  onRemoveItem: (sectionId: string, itemId: string) => void;
  onMoveItem: (sectionId: string, from: number, to: number) => void;
  /** Toggle "start this section on a new page" (only for sections past #1). */
  onTogglePageBreak: (sectionId: string, value: boolean) => void;
  /** Fired when an item row gains focus (syncs the preview scroll). */
  onFocusItem: (itemId: string) => void;
};

const inputBase =
  'w-full rounded-sm border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15';

const rowActionBtn =
  'flex h-7 w-6 items-center justify-center rounded-sm leading-none text-slate-400 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400';

type ItemRowProps = {
  item: LineItem;
  index: number;
  gridCols: string;
  showAmount: boolean;
  currencySymbol: string;
  canRemove: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onUpdate: (itemId: string, patch: Partial<LineItem>) => void;
  onInsertAfter: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onFocus: (itemId: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
};

/**
 * One editable line-item row. Memoized so typing in one row doesn't re-render
 * the hundreds of siblings a long invoice can have.
 */
const ItemRow = memo(function ItemRow({
  item,
  index,
  gridCols,
  showAmount,
  currencySymbol,
  canRemove,
  isDragging,
  isDragOver,
  onUpdate,
  onInsertAfter,
  onDuplicate,
  onRemove,
  onFocus,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ItemRowProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onInsertAfter(item.id);
    }
  };
  const handleFocus = () => onFocus(item.id);

  return (
    <div
      className={`grid items-center gap-2 rounded-sm ${gridCols} ${
        isDragging ? 'opacity-40' : ''
      } ${isDragOver ? 'ring-2 ring-indigo-300' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
    >
      <span
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(index);
        }}
        onDragEnd={onDragEnd}
        title='Drag to reorder'
        className='cursor-grab select-none text-center text-[13px] leading-none tracking-[-1px] text-slate-300 hover:text-slate-500'
      >
        ⋮⋮
      </span>
      <input
        className={inputBase}
        placeholder='Description'
        data-item-input={item.id}
        value={item.description}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
      />
      <input
        type='number'
        className={`${inputBase} px-2 text-right`}
        value={item.quantity}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onChange={(e) =>
          onUpdate(item.id, { quantity: Number(e.target.value) || 0 })
        }
      />
      <input
        type='number'
        className={`${inputBase} px-2 text-right`}
        value={item.rate}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onChange={(e) =>
          onUpdate(item.id, { rate: Number(e.target.value) || 0 })
        }
      />
      {showAmount && (
        <div className='truncate px-2 text-right text-sm font-medium tabular-nums text-slate-700'>
          {formatMoney(item.quantity * item.rate, currencySymbol)}
        </div>
      )}
      <div className='flex justify-end'>
        <button
          type='button'
          onClick={() => onDuplicate(item.id)}
          className={`${rowActionBtn} text-sm hover:bg-indigo-50 hover:text-indigo-600`}
          title='Duplicate item'
        >
          ⧉
        </button>
        <button
          type='button'
          onClick={() => onRemove(item.id)}
          disabled={!canRemove}
          className={`${rowActionBtn} text-lg hover:bg-red-50 hover:text-red-500`}
          title='Remove item'
        >
          ×
        </button>
      </div>
    </div>
  );
});

function SectionEditor({
  section,
  index,
  sectionCount,
  showSectionUI,
  canRemoveSection,
  currencySymbol,
  gridCols,
  showAmount,
  collapsed,
  onToggleCollapsed,
  onTitleChange,
  onRemoveSection,
  onMoveSection,
  onUpdateItem,
  onAddItem,
  onDuplicateItem,
  onRemoveItem,
  onMoveItem,
  onTogglePageBreak,
  onFocusItem,
}: Props) {
  const sectionId = section.id;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // Mirror of dragIndex read inside drop() without re-creating callbacks.
  const dragFrom = useRef<number | null>(null);

  // Section-scoped, stable callbacks so memoized rows don't re-render.
  const update = useCallback(
    (itemId: string, patch: Partial<LineItem>) =>
      onUpdateItem(sectionId, itemId, patch),
    [onUpdateItem, sectionId],
  );
  const insertAfter = useCallback(
    (itemId: string) => onAddItem(sectionId, itemId),
    [onAddItem, sectionId],
  );
  const duplicate = useCallback(
    (itemId: string) => onDuplicateItem(sectionId, itemId),
    [onDuplicateItem, sectionId],
  );
  const remove = useCallback(
    (itemId: string) => onRemoveItem(sectionId, itemId),
    [onRemoveItem, sectionId],
  );
  const dragStart = useCallback((i: number) => {
    dragFrom.current = i;
    setDragIndex(i);
  }, []);
  const dragOver = useCallback((i: number) => setOverIndex(i), []);
  const dragEnd = useCallback(() => {
    dragFrom.current = null;
    setDragIndex(null);
    setOverIndex(null);
  }, []);
  const drop = useCallback(
    (i: number) => {
      const from = dragFrom.current;
      dragFrom.current = null;
      setDragIndex(null);
      setOverIndex(null);
      if (from !== null && from !== i) onMoveItem(sectionId, from, i);
    },
    [onMoveItem, sectionId],
  );

  const summary = `${section.items.length} item${
    section.items.length === 1 ? '' : 's'
  } · ${formatMoney(sectionSubtotal(section), currencySymbol)}`;
  const open = !showSectionUI || !collapsed;

  return (
    <div
      className={
        showSectionUI
          ? 'rounded-md border border-slate-200 bg-slate-50/60 p-3'
          : ''
      }
    >
      {showSectionUI && (
        <div className={`flex items-center gap-2 ${open ? 'mb-2.5' : ''}`}>
          <button
            type='button'
            onClick={() => onToggleCollapsed(sectionId)}
            aria-expanded={open}
            title={open ? 'Collapse section' : 'Expand section'}
            className='flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
          >
            <svg
              viewBox='0 0 24 24'
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M6 9l6 6 6-6' />
            </svg>
          </button>
          <input
            className='flex-1 rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15'
            placeholder={`Section ${index + 1} name (e.g. Building 1)`}
            value={section.title}
            onChange={(e) => onTitleChange(sectionId, e.target.value)}
          />
          {!open && (
            <span className='flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-slate-400'>
              {index > 0 && section.pageBreakBefore && (
                <span
                  title='Starts on a new page'
                  className='rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500'
                >
                  ⤓ new page
                </span>
              )}
              {summary}
            </span>
          )}
          {/* Reorder this section up/down */}
          <div className='flex shrink-0 items-center'>
            <button
              type='button'
              onClick={() => onMoveSection(index, index - 1)}
              disabled={index === 0}
              title='Move section up'
              aria-label='Move section up'
              className='flex h-7 w-6 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent'
            >
              <svg
                viewBox='0 0 24 24'
                className='h-3.5 w-3.5'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M18 15l-6-6-6 6' />
              </svg>
            </button>
            <button
              type='button'
              onClick={() => onMoveSection(index, index + 1)}
              disabled={index === sectionCount - 1}
              title='Move section down'
              aria-label='Move section down'
              className='flex h-7 w-6 items-center justify-center rounded-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent'
            >
              <svg
                viewBox='0 0 24 24'
                className='h-3.5 w-3.5'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M6 9l6 6 6-6' />
              </svg>
            </button>
          </div>
          <button
            type='button'
            onClick={() => onRemoveSection(sectionId)}
            disabled={!canRemoveSection}
            className='shrink-0 rounded-sm px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent'
            title='Remove section'
          >
            Remove
          </button>
        </div>
      )}

      {open && (
        <>
          {/* Column headers */}
          <div
            className={`mb-1.5 grid gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 ${gridCols}`}
          >
            <span />
            <span>Description</span>
            <span className='text-right'>Qty</span>
            <span className='text-right'>Rate</span>
            {showAmount && <span className='text-right'>Amount</span>}
            <span />
          </div>

          <div className='space-y-2'>
            {section.items.map((it, i) => (
              <ItemRow
                key={it.id}
                item={it}
                index={i}
                gridCols={gridCols}
                showAmount={showAmount}
                currencySymbol={currencySymbol}
                canRemove={section.items.length > 1}
                isDragging={dragIndex === i}
                isDragOver={
                  overIndex === i && dragIndex !== null && dragIndex !== i
                }
                onUpdate={update}
                onInsertAfter={insertAfter}
                onDuplicate={duplicate}
                onRemove={remove}
                onFocus={onFocusItem}
                onDragStart={dragStart}
                onDragOver={dragOver}
                onDrop={drop}
                onDragEnd={dragEnd}
              />
            ))}
          </div>

          <div className='mt-2.5'>
            <button
              type='button'
              onClick={() => onAddItem(sectionId)}
              className='rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50'
              title='Add item (or press Enter in a row)'
            >
              + Add item
            </button>
          </div>

          {showSectionUI && (
            <>
              {/* Prominent per-section subtotal. */}
              <div className='mt-3 flex items-center justify-between rounded-md border border-slate-200 bg-white px-3.5 py-2.5'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Section subtotal
                </span>
                <span className='text-[15px] font-bold tabular-nums text-slate-900'>
                  {formatMoney(sectionSubtotal(section), currencySymbol)}
                </span>
              </div>

              {/* Page-break setting (a break before the first section is a no-op). */}
              {index > 0 && (
                <label className='mt-2.5 flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs text-slate-500 transition-colors hover:text-slate-700'>
                  <input
                    type='checkbox'
                    checked={!!section.pageBreakBefore}
                    onChange={(e) =>
                      onTogglePageBreak(sectionId, e.target.checked)
                    }
                    className='h-3.5 w-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500/30'
                  />
                  Start this section on a new page
                </label>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default memo(SectionEditor);
