import { Field } from "../ui/Field";
import type { Contributor } from "../types";

export function ContributorSection({
  contributor,
  onChange,
  onBack,
  onReview,
}: {
  contributor: Contributor;
  onChange: (c: Contributor) => void;
  onBack: () => void;
  onReview: () => void;
}) {
  return (
    <section className="mx-auto max-w-xl px-5 py-6">
      <h2 className="text-2xl font-bold text-gray-900">About you</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Optional — so we can credit you and follow up if we have a question.
      </p>

      <div className="space-y-4">
        <Field
          label="Name"
          multiline={false}
          value={contributor.name ?? ""}
          onChange={(v) => onChange({ ...contributor, name: v })}
        />
        <Field
          label="Email"
          multiline={false}
          value={contributor.email ?? ""}
          onChange={(v) => onChange({ ...contributor, email: v })}
        />
        <Field
          label="Phone (optional)"
          multiline={false}
          value={contributor.phone ?? ""}
          onChange={(v) => onChange({ ...contributor, phone: v })}
        />

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={contributor.consent_to_credit}
            onChange={(e) =>
              onChange({ ...contributor, consent_to_credit: e.target.checked })
            }
            className="mt-1 h-5 w-5"
          />
          OK to use this in a public ultimate knowledge base?
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onReview}
          className="flex-1 rounded-xl bg-clay py-3 font-semibold text-white"
        >
          Review &amp; submit
        </button>
      </div>
    </section>
  );
}
