import { useId, type ReactNode } from "react";

const baseInput =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 " +
  "transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none " +
  "focus:ring-2 focus:ring-indigo-500/15";

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
    >
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, className = "", id, ...props }: InputProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <input id={fieldId} className={`${baseInput} ${className}`} {...props} />
    </div>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export function Textarea({
  label,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <textarea
        id={fieldId}
        className={`${baseInput} min-h-[120px] resize-y leading-relaxed ${className}`}
        {...props}
      />
    </div>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function Select({
  label,
  className = "",
  children,
  id,
  ...props
}: SelectProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <div>
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <select
        id={fieldId}
        className={`${baseInput} cursor-pointer appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8 ${className}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

/** Small accessible on/off switch. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-3.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/**
 * A collapsible optional field: header row with a toggle; children render
 * only when enabled. Toggling off also hides the field on the invoice.
 */
export function OptionalField({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label>
          <span className={enabled ? "" : "text-slate-400"}>{label}</span>
        </Label>
        <Toggle checked={enabled} onChange={onToggle} label={`Show ${label}`} />
      </div>
      {enabled && children}
    </div>
  );
}
