import { Field } from "../ui/Field";
import { FIELD_SETS, TYPE_LABELS } from "./fields";
import { SECTION_ACCENT } from "./theme";
import type { Draft, SubmissionType } from "../types";

export function FormSection({
  draft,
  onFieldChange,
  onFreeformChange,
  onFieldComplete,
  onSave,
  onContinue,
  onSwitchPath,
}: {
  draft: Draft;
  onFieldChange: (key: string, value: string) => void;
  onFreeformChange: (value: string) => void;
  onFieldComplete?: (key: string) => void;
  onSave: () => void;
  onContinue: () => void;
  onSwitchPath: () => void;
}) {
  const type = draft.type as SubmissionType;
  const fields = FIELD_SETS[type];
  const accent = SECTION_ACCENT[type];

  return (
    <section
      className="mx-auto max-w-xl px-5 py-6"
      style={{ backgroundColor: accent.tint, borderTop: `4px solid ${accent.bar}` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: accent.text }}>
          {TYPE_LABELS[type]}
        </h2>
        <button
          type="button"
          onClick={onSwitchPath}
          className="text-sm font-semibold text-clay underline"
        >
          Change type
        </button>
      </div>

      <p className="mb-4 text-sm text-gray-500">All optional — fill in whatever you've got.</p>

      <div className="space-y-4">
        {fields.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            tooltip={f.tooltip}
            value={draft.fields[f.key] ?? ""}
            onChange={(v) => onFieldChange(f.key, v)}
            onComplete={() => onFieldComplete?.(f.key)}
          />
        ))}

        <Field
          label={
            type === "other" ? "What should people know?" : "Anything else"
          }
          tooltip="A free space — write as much as you like, in your own words."
          value={draft.raw_freeform}
          onChange={onFreeformChange}
          onComplete={() => onFieldComplete?.("raw_freeform")}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 rounded-xl bg-clay py-3 font-semibold text-white"
        >
          Continue
        </button>
      </div>
    </section>
  );
}
