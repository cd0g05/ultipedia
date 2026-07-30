import { Tooltip } from "./Tooltip";

export function Field({
  label,
  value,
  onChange,
  onComplete,
  tooltip,
  multiline = true,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onComplete?: () => void; // fired on blur when the field has content (analytics)
  tooltip?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const handleBlur = () => {
    if (onComplete && value.trim()) onComplete();
  };
  return (
    <div className="block">
      {/* Tooltip lives OUTSIDE the label so the control's accessible name is
          exactly the label text (and the control is associated exactly once). */}
      <div className="flex items-center">
        <label htmlFor={id} className="text-sm font-semibold text-gray-800">
          {label}
        </label>
        {tooltip && <Tooltip text={tooltip} />}
      </div>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={3}
          className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-base focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/30"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-base focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/30"
        />
      )}
    </div>
  );
}
