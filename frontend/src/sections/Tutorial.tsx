export function Tutorial({
  onBegin,
  onLearnMore,
}: {
  onBegin: () => void;
  onLearnMore: () => void;
}) {
  return (
    <section className="mx-auto max-w-xl px-5 py-10 text-center">
      <h1 className="text-3xl font-extrabold text-clay">
        Help build the ultimate frisbee encyclopedia.
      </h1>
      <p className="mt-4 text-lg text-gray-700">
        Share a drill, strategy, or hard-won tip. Takes a couple minutes — say as
        much or as little as you like. Everything is optional.
      </p>
      <button
        type="button"
        onClick={onBegin}
        className="mt-8 w-full rounded-2xl bg-clay py-4 text-lg font-bold text-white shadow-md active:scale-[0.99]"
      >
        Begin
      </button>
      <button
        type="button"
        onClick={onLearnMore}
        className="mt-3 w-full rounded-2xl border-2 border-amber/50 py-3 font-semibold text-clay"
      >
        Learn more
      </button>
      <p className="mt-4 text-sm text-gray-500">
        Your words help coaches and new teams who don't have these resources yet.
      </p>
    </section>
  );
}
