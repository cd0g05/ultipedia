import { useEffect, useRef, useState } from "react";
import type { Contributor, SubmissionType } from "../types";
import { sendTurn, startInterview, submitInterview, type TurnResult } from "./api";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

export function InterviewChat({
  type,
  contributor,
  onDone,
  onEscape,
}: {
  type: SubmissionType;
  contributor: Contributor;
  onDone: (submissionId: string, queued: boolean) => void;
  onEscape: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    startInterview(type, contributor)
      .then((r) => {
        if (cancelled) return;
        setSessionId(r.session_id);
        setMessages([{ role: "assistant", content: r.assistant }]);
      })
      .catch(() => !cancelled && setError("Couldn't start the interview."))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [type, contributor]);

  useEffect(() => {
    // Guard: scrollIntoView isn't implemented in jsdom / non-DOM environments.
    bottom.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);

  const apply = (r: TurnResult) => {
    setMessages((m) => [...m, { role: "assistant", content: r.assistant }]);
    if (r.done) setDone(true);
  };

  const send = async () => {
    if (!sessionId || !input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      apply(await sendTurn(sessionId, text));
    } catch {
      setError("Something went wrong — you can keep going or submit what you have.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!sessionId) return;
    setBusy(true);
    try {
      const { submission_id } = await submitInterview(sessionId);
      onDone(submission_id, false);
    } catch {
      setError("Couldn't submit — please try again.");
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto flex h-[calc(100vh-3rem)] max-w-xl flex-col px-4 py-4">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "assistant" ? "flex justify-start" : "flex justify-end"}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-base ${
                m.role === "assistant"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "bg-clay text-white"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-gray-400">…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div ref={bottom} />
      </div>

      {!done ? (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Type your answer…"
              className="flex-1 rounded-xl border border-gray-300 p-3 text-base focus:border-clay focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy}
              className="rounded-xl bg-clay px-5 font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={onEscape} className="text-gray-500 underline">
              Prefer to just type it all? Use the form
            </button>
            <button type="button" onClick={() => void finish()} className="font-semibold text-clay">
              I'm done — submit
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void finish()}
            className="w-full rounded-2xl bg-clay py-4 text-lg font-bold text-white"
          >
            Submit interview
          </button>
        </div>
      )}
    </section>
  );
}
