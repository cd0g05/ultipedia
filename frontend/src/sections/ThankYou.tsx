export function ThankYou({
  queued,
  onAnother,
}: {
  queued: boolean;
  onAnother: () => void;
}) {
  return (
    <section className="mx-auto max-w-xl px-5 py-16 text-center">
      <h2 className="text-3xl font-extrabold text-clay">Thank you —</h2>
      <p className="mt-3 text-lg text-gray-700">this genuinely helps.</p>
      {queued && (
        <p className="mt-3 text-sm text-gray-500">
          Saved on your device — we'll finish sending it when you're back online.
        </p>
      )}
      <button
        type="button"
        onClick={onAnother}
        className="mt-8 w-full rounded-2xl bg-clay py-4 text-lg font-bold text-white shadow-md"
      >
        Add another
      </button>
    </section>
  );
}
