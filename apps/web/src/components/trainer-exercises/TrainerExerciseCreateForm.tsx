"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { useToast } from "@/components/ui/Toast";
import { getUserRoleFlags } from "@/lib/userCapabilities";
import { auditTrainerExerciseCapabilities } from "@/lib/trainer-exercises/capabilityAudit";

type AuthUser = Record<string, unknown>;

type CreateExerciseResponse = {
  id?: string;
  exercise?: { id?: string };
};

export default function TrainerExerciseCreateForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const { notify } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [canCreateExercise, setCanCreateExercise] = useState(false);
  const [accessState, setAccessState] = useState<"loading" | "ready" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAccess = async () => {
      try {
        const [meResponse, capabilities] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          auditTrainerExerciseCapabilities(),
        ]);

        if (!meResponse.ok) {
          if (active) setAccessState("error");
          return;
        }

        const profile = (await meResponse.json()) as AuthUser;
        const flags = getUserRoleFlags(profile);

        if (!active) return;

        setCanAccessTrainer(flags.isAdmin || flags.isTrainer);
        setCanCreateExercise(capabilities.canCreateExercise);
        setAccessState("ready");
      } catch {
        if (active) setAccessState("error");
      }
    };

    void loadAccess();

    return () => {
      active = false;
    };
  }, []);

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || submitting || !canCreateExercise) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        notify({
          title: t("trainer.error"),
          description: t("library.loadError"),
          variant: "error",
        });
        return;
      }

      const payload = (await response.json()) as CreateExerciseResponse;
      const createdId = payload.id ?? payload.exercise?.id;

      notify({
        title: t("ui.save"),
        description: t("library.favoriteToastDescription"),
        variant: "success",
      });

      if (createdId) {
        router.push(`/app/biblioteca/${createdId}`);
        return;
      }

      router.push("/app/trainer/exercises");
    } catch {
      notify({
        title: t("trainer.error"),
        description: t("library.loadError"),
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (accessState === "loading") return <p className="muted">{t("trainer.loading")}</p>;
  if (accessState === "error") return <p className="muted">{t("trainer.error")}</p>;

  if (!canAccessTrainer) {
    return (
      <div className="feature-card form-stack" role="status">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link href="/app" className="btn secondary" style={{ width: "fit-content" }}>
          {t("trainer.backToDashboard")}
        </Link>
      </div>
    );
  }

  if (!canCreateExercise) {
    return <p className="muted">{t("trainer.notAvailable")}</p>;
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <label className="form-field">
        <span>{t("workouts.name")}</span>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={submitting}
          required
        />
      </label>

      <label className="form-field">
        <span>{t("ui.description")}</span>
        <textarea
          className="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={submitting}
          rows={4}
        />
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn primary" type="submit" disabled={!isValid || submitting}>
          {submitting ? t("ui.loading") : t("ui.save")}
        </button>
        <Link href="/app/trainer/exercises" className="btn secondary">
          {t("ui.cancel")}
        </Link>
      </div>
    </form>
  );
}
