import type { TemplateId } from "../types";
import { templates } from "../templates";

type Props = {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
};

/** A tiny abstract glyph hinting at each template's layout. */
function Thumb({ id }: { id: TemplateId }) {
  if (id === "modern") {
    return (
      <div className="flex h-full flex-col gap-1 p-1.5">
        <div className="h-1 w-full rounded-full bg-indigo-500" />
        <div className="mt-0.5 h-1 w-1/2 self-end rounded-full bg-slate-300" />
        <div className="mt-auto h-2.5 w-full rounded-sm bg-slate-700" />
        <div className="h-1 w-full rounded-full bg-slate-200" />
      </div>
    );
  }
  if (id === "minimal") {
    return (
      <div className="flex h-full flex-col gap-1.5 p-2">
        <div className="h-1 w-1/2 rounded-full bg-slate-400" />
        <div className="mt-1 h-px w-full bg-slate-300" />
        <div className="h-1 w-full rounded-full bg-slate-200" />
        <div className="h-1 w-full rounded-full bg-slate-200" />
      </div>
    );
  }
  if (id === "classic") {
    return (
      <div className="h-full p-1">
        <div className="flex h-full flex-col gap-1 border border-slate-400 p-1">
          <div className="mx-auto h-1 w-1/2 rounded-full bg-slate-500" />
          <div className="mt-0.5 grid grid-cols-2 gap-1">
            <div className="h-2 border border-slate-300" />
            <div className="h-2 border border-slate-300" />
          </div>
        </div>
      </div>
    );
  }
  if (id === "sidebar") {
    return (
      <div className="flex h-full">
        <div className="w-1/3 rounded-l-sm bg-indigo-500" />
        <div className="flex flex-1 flex-col gap-1 p-1.5">
          <div className="h-1.5 w-2/3 rounded-full bg-slate-400" />
          <div className="mt-1 h-1 w-full rounded-full bg-slate-200" />
          <div className="h-1 w-full rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }
  if (id === "receipt") {
    return (
      <div className="flex h-full items-start justify-center bg-slate-100 p-1.5">
        <div className="flex w-3/5 flex-col gap-1 bg-white p-1.5 shadow-sm">
          <div className="mx-auto h-1 w-2/3 rounded-full bg-indigo-500" />
          <div className="mt-0.5 h-px w-full bg-slate-200" />
          <div className="h-1 w-full rounded-full bg-slate-200" />
          <div className="h-1 w-full rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }
  // letterhead
  return (
    <div className="flex h-full flex-col">
      <div className="h-1/3 w-full rounded-t-sm bg-indigo-500" />
      <div className="flex flex-1 flex-col gap-1 p-1.5">
        <div className="h-1 w-1/2 rounded-full bg-slate-300" />
        <div className="mt-auto h-1.5 w-full rounded-sm bg-slate-300" />
        <div className="h-1 w-full rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export default function TemplatePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {templates.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`group rounded-md border p-2 text-left transition-colors ${
              active
                ? "border-indigo-500 ring-2 ring-indigo-500/20"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="mb-1.5 aspect-[3/4] w-full overflow-hidden rounded-sm border border-slate-100 bg-white">
              <Thumb id={t.id} />
            </div>
            <div
              className={`text-xs font-semibold ${
                active ? "text-indigo-600" : "text-slate-700"
              }`}
            >
              {t.name}
            </div>
            <div className="text-[10px] leading-tight text-slate-400">
              {t.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
