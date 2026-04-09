"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { createAiRequestId } from "@/lib/aiRequestId";
import {
  acknowledgeWeeklyCoachAdaptationSummary,
  getWeeklyCoachCheckInDraft,
  getWeeklyCoachState,
  saveWeeklyCoachCheckInDraft,
  submitWeeklyCoachCheckIn,
} from "@/services/weeklyAdaptiveCoach";
import {
  WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION,
  type WeeklyCoachCheckInAnswers,
  type WeeklyCoachCheckInDraftResponse,
  type WeeklyCoachCheckInSubmitRequest,
  type WeeklyCoachWeeklyStateResponse,
} from "@/types/weeklyAdaptiveCoach";

type LoadStatus = "loading" | "ready" | "error";
type ActionStatus = "idle" | "saving" | "submitting" | "accepting";

type SubmittedDecisionSurface = {
  title: string;
  body: string;
  detail: string;
  tone: "success" | "warning";
};

type FormState = {
  trainingSessionsCompleted: string;
  trainingSessionsPlanned: string;
  nutritionAdherenceScore: string;
  progressMode: "weight" | "perceived_progress";
  currentWeightKg: string;
  perceivedProgress: string;
  energyScore: string;
  hungerScore: string;
  recoveryScore: string;
  stressScore: string;
  painLevel: string;
  frictionPrimary: string;
  frictionNote: string;
  contextChangeFlag: boolean;
  contextChangeType: string;
  nextWeekConfidenceScore: string;
};

function numberToField(value?: number | null): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function textToField(value?: string | null): string {
  return typeof value === "string" ? value : "";
}

function createFormState(draft: WeeklyCoachCheckInDraftResponse): FormState {
  const answers = draft.draftAnswers;

  return {
    trainingSessionsCompleted: numberToField(answers.trainingSessionsCompleted),
    trainingSessionsPlanned: numberToField(answers.trainingSessionsPlanned),
    nutritionAdherenceScore: numberToField(answers.nutritionAdherenceScore),
    progressMode: answers.progressMode ?? "weight",
    currentWeightKg: numberToField(answers.currentWeightKg),
    perceivedProgress: textToField(answers.perceivedProgress),
    energyScore: numberToField(answers.energyScore),
    hungerScore: numberToField(answers.hungerScore),
    recoveryScore: numberToField(answers.recoveryScore),
    stressScore: numberToField(answers.stressScore),
    painLevel: textToField(answers.painLevel),
    frictionPrimary: textToField(answers.frictionPrimary),
    frictionNote: textToField(answers.frictionNote),
    contextChangeFlag: Boolean(answers.contextChangeFlag),
    contextChangeType: textToField(answers.contextChangeType),
    nextWeekConfidenceScore: numberToField(answers.nextWeekConfidenceScore),
  };
}

function parseIntegerField(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

function parseScoreField(value: string): number | undefined {
  const parsed = parseIntegerField(value);
  if (parsed === undefined || parsed < 1 || parsed > 5) return undefined;
  return parsed;
}

function parseWeightField(value: string): number | null | undefined {
  if (!value.trim()) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function buildDraftAnswers(form: FormState): WeeklyCoachCheckInAnswers {
  const answers: WeeklyCoachCheckInAnswers = {
    progressMode: form.progressMode,
    currentWeightKg: form.progressMode === "weight" ? parseWeightField(form.currentWeightKg) ?? null : null,
    perceivedProgress: form.progressMode === "perceived_progress" ? form.perceivedProgress.trim() || null : null,
    frictionNote: form.frictionNote.trim() || null,
    contextChangeFlag: form.contextChangeFlag,
    contextChangeType: form.contextChangeFlag ? form.contextChangeType.trim() || null : null,
  };

  const completed = parseIntegerField(form.trainingSessionsCompleted);
  const planned = parseIntegerField(form.trainingSessionsPlanned);
  const nutrition = parseScoreField(form.nutritionAdherenceScore);
  const energy = parseScoreField(form.energyScore);
  const hunger = parseScoreField(form.hungerScore);
  const recovery = parseScoreField(form.recoveryScore);
  const stress = parseScoreField(form.stressScore);
  const confidence = parseScoreField(form.nextWeekConfidenceScore);

  if (completed !== undefined) answers.trainingSessionsCompleted = completed;
  if (planned !== undefined) answers.trainingSessionsPlanned = planned;
  if (nutrition !== undefined) answers.nutritionAdherenceScore = nutrition;
  if (energy !== undefined) answers.energyScore = energy;
  if (hunger !== undefined) answers.hungerScore = hunger;
  if (recovery !== undefined) answers.recoveryScore = recovery;
  if (stress !== undefined) answers.stressScore = stress;
  if (confidence !== undefined) answers.nextWeekConfidenceScore = confidence;
  if (form.painLevel.trim()) answers.painLevel = form.painLevel.trim();
  if (form.frictionPrimary.trim()) answers.frictionPrimary = form.frictionPrimary.trim();

  return answers;
}

function buildSubmitPayload(form: FormState): WeeklyCoachCheckInSubmitRequest | null {
  const trainingSessionsCompleted = parseIntegerField(form.trainingSessionsCompleted);
  const trainingSessionsPlanned = parseIntegerField(form.trainingSessionsPlanned);
  const nutritionAdherenceScore = parseScoreField(form.nutritionAdherenceScore);
  const energyScore = parseScoreField(form.energyScore);
  const hungerScore = parseScoreField(form.hungerScore);
  const recoveryScore = parseScoreField(form.recoveryScore);
  const stressScore = parseScoreField(form.stressScore);
  const nextWeekConfidenceScore = parseScoreField(form.nextWeekConfidenceScore);
  const painLevel = form.painLevel.trim();
  const frictionPrimary = form.frictionPrimary.trim();
  const frictionNote = form.frictionNote.trim() || null;
  const contextChangeType = form.contextChangeFlag ? form.contextChangeType.trim() || null : null;

  if (
    trainingSessionsCompleted === undefined ||
    trainingSessionsPlanned === undefined ||
    trainingSessionsPlanned < 1 ||
    trainingSessionsCompleted > trainingSessionsPlanned ||
    nutritionAdherenceScore === undefined ||
    energyScore === undefined ||
    hungerScore === undefined ||
    recoveryScore === undefined ||
    stressScore === undefined ||
    nextWeekConfidenceScore === undefined ||
    !painLevel ||
    !frictionPrimary
  ) {
    return null;
  }

  if (form.progressMode === "weight") {
    const currentWeightKg = parseWeightField(form.currentWeightKg);
    if (currentWeightKg === undefined || currentWeightKg === null) return null;

    return {
      contractVersion: WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION,
      clientRequestId: createAiRequestId(),
      trainingSessionsCompleted,
      trainingSessionsPlanned,
      nutritionAdherenceScore,
      progressMode: form.progressMode,
      currentWeightKg,
      perceivedProgress: null,
      energyScore,
      hungerScore,
      recoveryScore,
      stressScore,
      painLevel,
      frictionPrimary,
      frictionNote,
      contextChangeFlag: form.contextChangeFlag,
      contextChangeType,
      nextWeekConfidenceScore,
    };
  }

  const perceivedProgress = form.perceivedProgress.trim();
  if (!perceivedProgress) return null;

  return {
    contractVersion: WEEKLY_ADAPTIVE_COACH_CONTRACT_VERSION,
    clientRequestId: createAiRequestId(),
    trainingSessionsCompleted,
    trainingSessionsPlanned,
    nutritionAdherenceScore,
    progressMode: form.progressMode,
    currentWeightKg: null,
    perceivedProgress,
    energyScore,
    hungerScore,
    recoveryScore,
    stressScore,
    painLevel,
    frictionPrimary,
    frictionNote,
    contextChangeFlag: form.contextChangeFlag,
    contextChangeType,
    nextWeekConfidenceScore,
  };
}

function formatDateRange(validFrom: string, validTo: string): string {
  return `${validFrom} to ${validTo}`;
}

function formatError(message?: string): string {
  return message?.trim() || "Unable to load the weekly check-in scaffold right now.";
}

function getSubmittedDecisionSurface(
  weeklyState: WeeklyCoachWeeklyStateResponse,
  draft: WeeklyCoachCheckInDraftResponse,
): SubmittedDecisionSurface | null {
  if (draft.checkInState !== "submitted") {
    return null;
  }

  if (!weeklyState.featureFlags.adaptationEnabled) {
    return {
      title: "Current decision",
      body: "Keep following the current weekly plan. Adaptation is not enabled for this account yet.",
      detail: "Your check-in has been recorded and no automatic changes were applied.",
      tone: "warning",
    };
  }

  const latestAdaptationSummary = weeklyState.latestAdaptationSummary?.trim();
  if (!latestAdaptationSummary) {
    return {
      title: "Current decision",
      body: "Keep following the current weekly plan until a coach adaptation is available.",
      detail: "This result is still scaffolded, so there are no plan changes to review yet.",
      tone: "warning",
    };
  }

  return {
    title: "Current decision",
    body: latestAdaptationSummary,
    detail: weeklyState.currentWeek?.acceptedAt
      ? `Summary acknowledged at ${weeklyState.currentWeek.acceptedAt}. Full plan application stays out of scope in this slice.`
      : "Keep following the current plan unless this summary says otherwise.",
    tone: "success",
  };
}

export default function WeeklyCoachCheckInCard() {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [weeklyState, setWeeklyState] = useState<WeeklyCoachWeeklyStateResponse | null>(null);
  const [draft, setDraft] = useState<WeeklyCoachCheckInDraftResponse | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function loadCard() {
    setLoadStatus("loading");
    setErrorMessage(null);

    const [weeklyStateResult, draftResult] = await Promise.all([
      getWeeklyCoachState(),
      getWeeklyCoachCheckInDraft(),
    ]);

    if (!weeklyStateResult.ok) {
      setWeeklyState(null);
      setDraft(null);
      setForm(null);
      setErrorMessage(formatError(weeklyStateResult.message));
      setLoadStatus("error");
      return;
    }

    if (!draftResult.ok) {
      setWeeklyState(null);
      setDraft(null);
      setForm(null);
      setErrorMessage(formatError(draftResult.message));
      setLoadStatus("error");
      return;
    }

    setWeeklyState(weeklyStateResult.data);
    setDraft(draftResult.data);
    setForm(createFormState(draftResult.data));
    setLoadStatus("ready");
  }

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const [weeklyStateResult, draftResult] = await Promise.all([
          getWeeklyCoachState(),
          getWeeklyCoachCheckInDraft(),
        ]);

        if (cancelled) return;

        if (!weeklyStateResult.ok) {
          setWeeklyState(null);
          setDraft(null);
          setForm(null);
          setErrorMessage(formatError(weeklyStateResult.message));
          setLoadStatus("error");
          return;
        }

        if (!draftResult.ok) {
          setWeeklyState(null);
          setDraft(null);
          setForm(null);
          setErrorMessage(formatError(draftResult.message));
          setLoadStatus("error");
          return;
        }

        setWeeklyState(weeklyStateResult.data);
        setDraft(draftResult.data);
        setForm(createFormState(draftResult.data));
        setLoadStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load the weekly check-in scaffold right now.");
        setLoadStatus("error");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadStatus === "loading") {
    return <LoadingState title="Weekly coach check-in" ariaLabel="Loading weekly coach check-in" lines={6} />;
  }

  if (loadStatus === "error" || !weeklyState || !draft || !form) {
    return (
      <ErrorState
        title="Weekly coach check-in unavailable"
        description={errorMessage ?? "Unable to load the weekly check-in scaffold right now."}
        retryLabel="Retry"
        onRetry={() => void loadCard()}
        wrapInCard
      />
    );
  }

  const canUseWeeklyCoach = weeklyState.featureFlags.weeklyCoachEnabled && weeklyState.featureFlags.weeklyCheckInEnabled;
  const submitPayload = buildSubmitPayload(form);
  const isSubmitted = draft.checkInState === "submitted";
  const isBusy = actionStatus !== "idle";
  const submittedDecisionSurface = getSubmittedDecisionSurface(weeklyState, draft);
  const isAdaptationAccepted = Boolean(weeklyState.currentWeek?.acceptedAt);
  const canAcknowledgeAdaptation = Boolean(canUseWeeklyCoach && submittedDecisionSurface && weeklyState.latestAdaptationSummary && !isAdaptationAccepted);

  async function handleSaveDraft() {
    if (!form) return;

    setActionStatus("saving");
    setActionMessage(null);
    setErrorMessage(null);

    const result = await saveWeeklyCoachCheckInDraft(buildDraftAnswers(form));

    if (!result.ok) {
      setActionStatus("idle");
      setErrorMessage(formatError(result.message));
      return;
    }

    setDraft(result.data);
    setForm(createFormState(result.data));
    setActionStatus("idle");
    setActionMessage("Draft saved to the weekly coach scaffold.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submitPayload) {
      setErrorMessage("Complete the required weekly check-in fields before submitting.");
      return;
    }

    setActionStatus("submitting");
    setActionMessage(null);
    setErrorMessage(null);

    const result = await submitWeeklyCoachCheckIn(submitPayload);

    if (!result.ok) {
      setActionStatus("idle");
      setErrorMessage(formatError(result.message));
      return;
    }

    setDraft(result.data);
    setForm(createFormState(result.data));

    const refreshedState = await getWeeklyCoachState();
    if (refreshedState.ok) {
      setWeeklyState(refreshedState.data);
    } else {
      setWeeklyState((current) => current ? {
        ...current,
        loopState: "check_in_submitted",
        nextAction: "await_adaptation_generation",
        checkInDue: false,
      } : current);
    }

    setActionStatus("idle");
    setActionMessage("Weekly check-in submitted. Reloaded the persisted coach summary.");
  }

  async function handleAcknowledgeAdaptation() {
    setActionStatus("accepting");
    setActionMessage(null);
    setErrorMessage(null);

    const result = await acknowledgeWeeklyCoachAdaptationSummary();

    if (!result.ok) {
      setActionStatus("idle");
      setErrorMessage(formatError(result.message));
      return;
    }

    setWeeklyState(result.data);
    setActionStatus("idle");
    setActionMessage("Adaptation summary acknowledged and persisted.");
  }

  return (
    <section
      id="weekly-coach-checkin"
      className="card form-stack"
      data-testid="weekly-coach-checkin-card"
      style={{ scrollMarginTop: 24 }}
    >
      <div className="form-stack">
        <div>
          <h2 className="section-title">Weekly coach check-in</h2>
          <p className="section-subtitle">
            Thin FIT-19 surface on weekly review: load weekly state, review the persisted draft, and submit a check-in.
          </p>
        </div>
        <div className="status-card" role="status" aria-live="polite">
          <p className="muted m-0">
            Weekly loop: <strong>{weeklyState.loopState}</strong>
            {weeklyState.currentWeek ? ` | Week ${weeklyState.currentWeek.weekIndex} | ${formatDateRange(weeklyState.currentWeek.validFrom, weeklyState.currentWeek.validTo)}` : ""}
          </p>
          {weeklyState.nextAction ? <p className="muted m-0">Next action: {weeklyState.nextAction}</p> : null}
          {draft.deadline ? <p className="muted m-0">Check-in deadline: {draft.deadline}</p> : null}
          <p className="muted m-0">Scaffold note: adaptation output and broader coach UX are intentionally out of scope in this slice.</p>
        </div>
        {weeklyState.planSummary ? (
          <div className="form-stack">
            <strong>Current plan summary</strong>
            {weeklyState.planSummary.trainingSummary.length > 0 ? <p className="muted m-0">Training: {weeklyState.planSummary.trainingSummary.join(" ")}</p> : null}
            {weeklyState.planSummary.nutritionSummary.length > 0 ? <p className="muted m-0">Nutrition: {weeklyState.planSummary.nutritionSummary.join(" ")}</p> : null}
          </div>
        ) : null}
        {!canUseWeeklyCoach ? (
          <div className="status-card status-card--warning" role="alert">
            <p className="muted m-0">Weekly coach is currently scaffolded off for this account.</p>
          </div>
        ) : null}
        {draft.completionState.missingRequiredFields.length > 0 ? (
          <div className="status-card" role="status">
            <p className="muted m-0">Draft still missing: {draft.completionState.missingRequiredFields.join(", ")}</p>
          </div>
        ) : null}
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="form-stack" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Input
            label="Sessions completed"
            inputMode="numeric"
            value={form.trainingSessionsCompleted}
            onChange={(event) => setForm((current) => current ? { ...current, trainingSessionsCompleted: event.target.value } : current)}
          />
          <Input
            label="Sessions planned"
            inputMode="numeric"
            value={form.trainingSessionsPlanned}
            onChange={(event) => setForm((current) => current ? { ...current, trainingSessionsPlanned: event.target.value } : current)}
          />
          <Input
            label="Nutrition adherence (1-5)"
            inputMode="numeric"
            value={form.nutritionAdherenceScore}
            onChange={(event) => setForm((current) => current ? { ...current, nutritionAdherenceScore: event.target.value } : current)}
          />
          <label className="form-stack">
            <span>Progress mode</span>
            <select
              value={form.progressMode}
              onChange={(event) => setForm((current) => current ? { ...current, progressMode: event.target.value as FormState["progressMode"] } : current)}
            >
              <option value="weight">Weight</option>
              <option value="perceived_progress">Perceived progress</option>
            </select>
          </label>
          {form.progressMode === "weight" ? (
            <Input
              label="Current weight (kg)"
              inputMode="decimal"
              value={form.currentWeightKg}
              onChange={(event) => setForm((current) => current ? { ...current, currentWeightKg: event.target.value } : current)}
            />
          ) : (
            <Input
              label="Perceived progress"
              value={form.perceivedProgress}
              onChange={(event) => setForm((current) => current ? { ...current, perceivedProgress: event.target.value } : current)}
            />
          )}
          <Input
            label="Energy (1-5)"
            inputMode="numeric"
            value={form.energyScore}
            onChange={(event) => setForm((current) => current ? { ...current, energyScore: event.target.value } : current)}
          />
          <Input
            label="Hunger (1-5)"
            inputMode="numeric"
            value={form.hungerScore}
            onChange={(event) => setForm((current) => current ? { ...current, hungerScore: event.target.value } : current)}
          />
          <Input
            label="Recovery (1-5)"
            inputMode="numeric"
            value={form.recoveryScore}
            onChange={(event) => setForm((current) => current ? { ...current, recoveryScore: event.target.value } : current)}
          />
          <Input
            label="Stress (1-5)"
            inputMode="numeric"
            value={form.stressScore}
            onChange={(event) => setForm((current) => current ? { ...current, stressScore: event.target.value } : current)}
          />
          <Input
            label="Pain level"
            value={form.painLevel}
            onChange={(event) => setForm((current) => current ? { ...current, painLevel: event.target.value } : current)}
          />
          <Input
            label="Primary friction"
            value={form.frictionPrimary}
            onChange={(event) => setForm((current) => current ? { ...current, frictionPrimary: event.target.value } : current)}
          />
          <Input
            label="Next week confidence (1-5)"
            inputMode="numeric"
            value={form.nextWeekConfidenceScore}
            onChange={(event) => setForm((current) => current ? { ...current, nextWeekConfidenceScore: event.target.value } : current)}
          />
          <label className="form-stack">
            <span>Context changed this week?</span>
            <select
              value={form.contextChangeFlag ? "yes" : "no"}
              onChange={(event) => setForm((current) => current ? { ...current, contextChangeFlag: event.target.value === "yes" } : current)}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          {form.contextChangeFlag ? (
            <Input
              label="Context change type"
              value={form.contextChangeType}
              onChange={(event) => setForm((current) => current ? { ...current, contextChangeType: event.target.value } : current)}
            />
          ) : null}
        </div>

        <label className="form-stack">
          <span>Friction note</span>
          <textarea
            rows={3}
            value={form.frictionNote}
            onChange={(event) => setForm((current) => current ? { ...current, frictionNote: event.target.value } : current)}
          />
        </label>

        {errorMessage ? (
          <div className="status-card status-card--warning" role="alert">
            <p className="muted m-0">{errorMessage}</p>
          </div>
        ) : null}
        {actionMessage ? (
          <div className="status-card status-card--success" role="status" aria-live="polite">
            <p className="muted m-0">{actionMessage}</p>
          </div>
        ) : null}
        {submittedDecisionSurface ? (
          <div
            className={`status-card ${submittedDecisionSurface.tone === "warning" ? "status-card--warning" : "status-card--success"}`}
            role="status"
            aria-live="polite"
          >
            <p className="m-0"><strong>{submittedDecisionSurface.title}:</strong> {submittedDecisionSurface.body}</p>
            <p className="muted m-0 mt-2">{submittedDecisionSurface.detail}</p>
          </div>
        ) : null}
        {submittedDecisionSurface ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleAcknowledgeAdaptation()}
            loading={actionStatus === "accepting"}
            disabled={!canAcknowledgeAdaptation || isBusy}
          >
            {isAdaptationAccepted ? "Summary acknowledged" : "Acknowledge summary"}
          </Button>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleSaveDraft()}
            loading={actionStatus === "saving"}
            disabled={!canUseWeeklyCoach || isSubmitted || isBusy}
          >
            Save draft
          </Button>
          <Button
            type="submit"
            loading={actionStatus === "submitting"}
            disabled={!canUseWeeklyCoach || isSubmitted || isBusy || !submitPayload}
          >
            {isSubmitted ? "Already submitted" : "Submit weekly check-in"}
          </Button>
        </div>
      </form>
    </section>
  );
}
