"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";

type UnknownRecord = Record<string, unknown>;

type TrainerDualPlanAssignmentProps = {
  clientPlans: unknown;
  canAssignDualPlans: boolean;
};

type PlanContext = "home" | "gym";

type PlanSummary = {
  id: string | null;
  label: string | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function readPlanSummary(value: unknown): PlanSummary {
  if (!isRecord(value)) return { id: null, label: null };

  const id =
    getTrimmedString(value.id) ??
    getTrimmedString(value.planId) ??
    getTrimmedString(value.trainingPlanId) ??
    getTrimmedString(value._id);

  const label =
    getTrimmedString(value.name) ??
    getTrimmedString(value.title) ??
    getTrimmedString(value.planName) ??
    id;

  return { id, label };
}

function readPlansByContext(source: unknown): Record<PlanContext, PlanSummary> | null {
  if (!isRecord(source)) return null;

  const home = readPlanSummary(source.home);
  const gym = readPlanSummary(source.gym);

  const hasDistinctContextKeys = "home" in source || "gym" in source;
  if (!hasDistinctContextKeys) return null;

  return { home, gym };
}

export default function TrainerDualPlanAssignment({
  clientPlans,
  canAssignDualPlans,
}: TrainerDualPlanAssignmentProps) {
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState<string | null>(null);

  const plansByContext = useMemo(() => readPlansByContext(clientPlans), [clientPlans]);

  if (!plansByContext) {
    return (
      <section className="card form-stack" aria-live="polite">
        <h4 style={{ margin: 0 }}>{t("trainer.clientContext.training.dualPlans.title")}</h4>
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clientContext.training.dualPlans.emptyUnsupported")}
        </p>
      </section>
    );
  }

  const contexts: PlanContext[] = ["home", "gym"];

  return (
    <section className="card form-stack" aria-live="polite">
      <h4 style={{ margin: 0 }}>{t("trainer.clientContext.training.dualPlans.title")}</h4>
      <p className="muted" style={{ margin: 0 }}>
        {t("trainer.clientContext.training.dualPlans.description")}
      </p>

      {contexts.map((context) => {
        const planSummary = plansByContext[context];
        const labelKey =
          context === "home"
            ? "trainer.clientContext.training.dualPlans.homeLabel"
            : "trainer.clientContext.training.dualPlans.gymLabel";

        return (
          <article key={context} className="feature-card form-stack">
            <p style={{ margin: 0, fontWeight: 600 }}>{t(labelKey)}</p>
            <p className="muted" style={{ margin: 0 }}>
              {planSummary.label ?? t("trainer.clientContext.training.dualPlans.unassigned")}
            </p>
            {canAssignDualPlans ? (
              <button
                type="button"
                className="btn secondary"
                style={{ width: "fit-content" }}
                onClick={() => setFeedback(t("trainer.clientContext.training.dualPlans.assignConfirmation"))}
              >
                {t("trainer.clientContext.training.dualPlans.assignAction")}
              </button>
            ) : null}
          </article>
        );
      })}

      {!canAssignDualPlans ? (
        <p className="muted" style={{ margin: 0 }}>
          {t("trainer.clientContext.training.dualPlans.assignUnavailable")}
        </p>
      ) : null}

      {feedback ? (
        <p className="muted" role="status" style={{ margin: 0 }}>
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
