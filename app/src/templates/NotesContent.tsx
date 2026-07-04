/**
 * The inner notes markup (label + body), shared by every placement so notes
 * look identical whether they render after a section (inside the items table),
 * before the totals, or at the bottom. Callers wrap this with their own
 * spacing/border to match the template.
 */
export default function NotesContent({
  notes,
  labelClassName = "mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400",
  bodyClassName = "whitespace-pre-wrap text-[12.5px] leading-7 text-slate-600",
  labelStyle,
}: {
  notes: string;
  labelClassName?: string;
  bodyClassName?: string;
  labelStyle?: React.CSSProperties;
}) {
  return (
    <>
      <div className={labelClassName} style={labelStyle}>
        Notes
      </div>
      <div className={bodyClassName}>{notes}</div>
    </>
  );
}
