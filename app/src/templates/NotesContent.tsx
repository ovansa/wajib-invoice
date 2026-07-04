import type { NotesAlign } from "../types";

const alignClass: Record<NotesAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/**
 * The inner notes markup (label + body), shared by every placement so notes
 * look identical whether they render before the totals or at the bottom.
 * Callers wrap this with their own spacing/border to match the template.
 * `align` sets the text alignment of both the label and the body.
 */
export default function NotesContent({
  notes,
  align = "left",
  labelClassName = "mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400",
  bodyClassName = "whitespace-pre-wrap text-[12.5px] leading-7 text-slate-600",
  labelStyle,
}: {
  notes: string;
  align?: NotesAlign;
  labelClassName?: string;
  bodyClassName?: string;
  labelStyle?: React.CSSProperties;
}) {
  const alignCls = alignClass[align] ?? "text-left";
  return (
    <>
      <div className={`${labelClassName} ${alignCls}`} style={labelStyle}>
        Notes
      </div>
      <div className={`${bodyClassName} ${alignCls}`}>{notes}</div>
    </>
  );
}
