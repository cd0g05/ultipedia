import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tutorial } from "./sections/Tutorial";
import { LearnMore } from "./sections/LearnMore";
import { PathSelect } from "./sections/PathSelect";
import { FormSection } from "./sections/FormSection";
import { ContributorSection } from "./sections/ContributorSection";
import { ThankYou } from "./sections/ThankYou";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Toast } from "./ui/Toast";
import { Collapsible, MotionStep } from "./ui/motion";
import {
  clearDraft,
  debounce,
  draftHasContent,
  loadContributor,
  loadDraft,
  saveContributor,
  saveDraft,
} from "./state/draft";
import { flushQueue, submit, trackEvent } from "./api/client";
import { initAnalytics } from "./api/analytics";
import { emptyDraft, type Contributor, type Draft, type SubmissionType } from "./types";

type Step = "tutorial" | "learnmore" | "path" | "form" | "contributor" | "thankyou";

export default function App() {
  const [step, setStep] = useState<Step>("tutorial");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [contributor, setContributor] = useState<Contributor>({
    consent_to_credit: false,
  });
  const [pendingSwitch, setPendingSwitch] = useState<SubmissionType | "select" | null>(
    null
  );
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastQueued, setLastQueued] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const started = useRef(false);

  // Restore autosaved draft + contributor on load; retry queued submits; load analytics.
  useEffect(() => {
    initAnalytics();
    const restored = loadDraft();
    setContributor(loadContributor());
    void flushQueue();
    if (restored && restored.type && draftHasContent(restored)) {
      setDraft(restored);
      setStep("form");
    }
  }, []);

  // Debounced autosave whenever the draft changes.
  const persist = useMemo(() => debounce((d: Draft) => saveDraft(d), 400), []);
  useEffect(() => {
    if (draft.type) persist(draft);
  }, [draft, persist]);

  const beginStart = useCallback(() => {
    if (!started.current) {
      started.current = true;
      void trackEvent("form_started");
    }
    setStep("path");
  }, []);

  const pickType = useCallback((type: SubmissionType) => {
    setDraft({ ...emptyDraft(), type });
    setStep("form");
  }, []);

  const requestSwitch = useCallback(
    (target: SubmissionType | "select") => {
      if (draftHasContent(draft)) {
        setPendingSwitch(target);
      } else if (target === "select") {
        setStep("path");
      } else {
        pickType(target);
      }
    },
    [draft, pickType]
  );

  const confirmSwitch = useCallback(() => {
    const target = pendingSwitch;
    setPendingSwitch(null);
    clearDraft();
    if (target === "select" || target === null) {
      setDraft(emptyDraft());
      setStep("path");
    } else {
      pickType(target);
    }
  }, [pendingSwitch, pickType]);

  const doSubmit = useCallback(async () => {
    setShowSubmitConfirm(false);
    const result = await submit({
      type: draft.type as SubmissionType,
      contributor,
      fields: draft.fields,
      raw_freeform: draft.raw_freeform || undefined,
    });
    if (result.rejected) {
      setToast(result.detail ?? "Couldn't submit — please adjust and retry.");
      return;
    }
    saveContributor(contributor);
    clearDraft();
    setLastQueued(Boolean(result.queued));
    void trackEvent("submitted", { queued: Boolean(result.queued) });
    setStep("thankyou");
  }, [draft, contributor]);

  const another = useCallback(() => {
    setDraft(emptyDraft());
    setStep("path");
  }, []);

  const showInfoBar = step !== "tutorial" && step !== "learnmore";

  const renderStep = () => {
    switch (step) {
      case "tutorial":
        return <Tutorial onBegin={beginStart} onLearnMore={() => setStep("learnmore")} />;
      case "learnmore":
        return <LearnMore onBack={() => setStep("tutorial")} />;
      case "path":
        return <PathSelect onPick={pickType} />;
      case "form":
        return (
          <FormSection
            draft={draft}
            onFieldChange={(key, value) =>
              setDraft((d) => ({ ...d, fields: { ...d.fields, [key]: value } }))
            }
            onFreeformChange={(value) => setDraft((d) => ({ ...d, raw_freeform: value }))}
            onFieldComplete={(key) => void trackEvent("field_completed", { field: key })}
            onSave={() => {
              saveDraft(draft);
              setToast("Draft saved.");
            }}
            onContinue={() => setStep("contributor")}
            onSwitchPath={() => requestSwitch("select")}
          />
        );
      case "contributor":
        return (
          <ContributorSection
            contributor={contributor}
            onChange={setContributor}
            onBack={() => setStep("form")}
            onReview={() => setShowSubmitConfirm(true)}
          />
        );
      case "thankyou":
        return <ThankYou queued={lastQueued} onAnother={another} />;
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {showInfoBar && (
        <div className="border-b border-amber/30 bg-white/70 backdrop-blur">
          <button
            type="button"
            onClick={() => setInfoOpen((o) => !o)}
            aria-expanded={infoOpen}
            className="mx-auto flex w-full max-w-xl items-center justify-between px-5 py-3 text-sm font-semibold text-clay"
          >
            About this form
            <span aria-hidden>{infoOpen ? "▲" : "▼"}</span>
          </button>
          <Collapsible open={infoOpen}>
            <p className="mx-auto max-w-xl px-5 pb-3 text-sm text-gray-600">
              Share a drill, strategy, or tip for the ultimate frisbee
              encyclopedia. Everything's optional — say as much or as little as you
              like, and you choose whether it can be used publicly.
            </p>
          </Collapsible>
        </div>
      )}

      <MotionStep key={step}>{renderStep()}</MotionStep>

      {pendingSwitch && (
        <ConfirmDialog
          title="Switch type?"
          body="You'll lose what you've written here."
          confirmLabel="Switch anyway"
          onConfirm={confirmSwitch}
          onCancel={() => setPendingSwitch(null)}
        />
      )}
      {showSubmitConfirm && (
        <ConfirmDialog
          title="Submit this?"
          body="You can add another after."
          confirmLabel="Submit"
          onConfirm={() => void doSubmit()}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
