export function LearnMore({ onBack }: { onBack: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-5 py-8">
      <h2 className="text-2xl font-bold text-clay">About Ulti-pedia</h2>

      <div className="mt-4 space-y-4 text-gray-700">
        <p>
          Ultimate is a small sport, so good coaching resources are scarce —
          especially for new teams, high-school programs, and first-time coaches.
          Ulti-pedia is an effort to build a shared encyclopedia of drills and
          strategies, contributed by the people who actually know the game.
        </p>
        <p>
          <strong>What this form is:</strong> a low-friction way to share a drill,
          a strategy, or a hard-won tip. Everything is optional — contribute a
          single sentence or a full breakdown, whatever you have time for.
        </p>
        <p>
          <strong>What happens to it:</strong> your submission is stored so it can
          later be organized into the encyclopedia. Nothing is required, and you
          choose whether your contribution can be used publicly.
        </p>
        <p>
          <strong>What's coming:</strong> an AI-guided interview mode that asks
          follow-up questions and lets you just talk instead of type — so sharing
          what you know gets even easier.
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-8 w-full rounded-2xl bg-clay py-4 text-lg font-bold text-white shadow-md"
      >
        Back
      </button>
    </section>
  );
}
