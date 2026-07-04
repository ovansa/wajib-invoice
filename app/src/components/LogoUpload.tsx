import { useRef } from "react";
import { Label } from "./Field";
import type { LogoPosition } from "../types";

const MAX_BYTES = 512 * 1024; // 512 KB — keeps localStorage well under quota

const POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
];

type Props = {
  value: string; // data URL or ""
  onChange: (dataUrl: string) => void;
  position: LogoPosition;
  onPositionChange: (p: LogoPosition) => void;
};

export default function LogoUpload({
  value,
  onChange,
  position,
  onPositionChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      alert(
        `That image is ${(file.size / 1024).toFixed(
          0
        )} KB. Please use one under ${MAX_BYTES / 1024} KB so it saves reliably.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Label>Logo</Label>
      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="Logo preview"
            className="h-12 w-12 rounded-md border border-slate-200 object-contain p-1"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
        >
          + Upload logo
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />

      {value && (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Logo position
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-md border border-slate-200 p-1">
            {POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPositionChange(p.id)}
                className={`rounded-sm py-1.5 text-xs font-medium transition-colors ${
                  position === p.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
