"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { getLocaleCode } from "@/lib/i18n";
import { getUserRoleFlags } from "@/lib/userCapabilities";
import { trainerApiCapabilities } from "@/lib/trainer/capabilities";
import type { Exercise } from "@/lib/types";
import type { ClientRow, LoadState } from "./types";

type AuthUser = Record<string, unknown>;
type ClientsResponse = { users?: ClientRow[] };
type ExerciseResponse = { items?: Exercise[] };

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export default function TrainerClientContext() {
  const { t, locale } = useLanguage();
  const localeCode = getLocaleCode(locale);
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientState, setClientState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [search, setSearch] = useState("");
  const [exerciseState, setExerciseState] = useState<LoadState>("ready");
  const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([]);
  const [builder, setBuilder] = useState<Record<number, Exercise[]>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meResponse.ok) {
          if (active) setPermissionState("error");
          return;
        }
        const roleFlags = getUserRoleFlags((await meResponse.json()) as AuthUser);
        if (!active) return;
        const canAccess = roleFlags.isTrainer || roleFlags.isAdmin;
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");
        if (!canAccess || !trainerApiCapabilities.canListClients) return;

        setClientState("loading");
        const clientsResponse = await fetch("/api/admin/users?page=1", { cache: "no-store" });
        if (!clientsResponse.ok) {
          if (active) setClientState("error");
          return;
        }

        const data = (await clientsResponse.json()) as ClientsResponse;
        if (!active) return;
        const users = Array.isArray(data.users) ? data.users : [];
        setClient(users.find((user) => user.id === clientId && user.role !== "ADMIN") ?? null);
        setClientState("ready");
      } catch {
        if (active) {
          setPermissionState("error");
          setClientState("error");
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [clientId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadExercises = async () => {
      if (!search.trim()) {
        setExerciseOptions([]);
        setExerciseState("ready");
        return;
      }

      setExerciseState("loading");
      try {
        const params = new URLSearchParams({ query: search.trim(), limit: "30" });
        const response = await fetch(`/api/exercises?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setExerciseState("error");
          setExerciseOptions([]);
          return;
        }
        const data = (await response.json()) as ExerciseResponse;
        setExerciseOptions(Array.isArray(data.items) ? data.items : []);
        setExerciseState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setExerciseState("error");
        setExerciseOptions([]);
      }
    };

    void loadExercises();
    return () => controller.abort();
  }, [search]);

  const dayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeCode, { weekday: "short" });
    const monday = new Date();
    const offset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - offset);

    return DAYS.map((dayOffset) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + dayOffset);
      return formatter.format(date);
    });
  }, [localeCode]);

  const selectedExercises = builder[activeDay] ?? [];
  const clientName = client?.name?.trim() || client?.email || t("trainer.clientContext.unknownClient");

  const addExercise = (exercise: Exercise) => {
    setBuilder((prev) => ({ ...prev, [activeDay]: [...(prev[activeDay] ?? []), exercise] }));
  };

  if (permissionState === "loading") return <p className="muted">{t("trainer.loading")}</p>;
  if (permissionState === "error") return <p className="muted">{t("trainer.error")}</p>;
  if (!canAccessTrainer) {
    return (
      <div className="card form-stack">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link className="btn secondary" href="/app">{t("trainer.backToDashboard")}</Link>
      </div>
    );
  }

  if (clientState === "loading") return <p className="muted">{t("trainer.clientContext.loading")}</p>;
  if (clientState === "error") {
    return (
      <div className="card form-stack">
        <p className="muted">{t("trainer.clientContext.error")}</p>
        <button className="btn secondary" type="button" onClick={() => window.location.reload()}>{t("trainer.retry")}</button>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <section className="card form-stack">
        <h2 style={{ margin: 0 }}>{clientName}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
      </section>

      <section className="card form-stack">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {dayLabels.map((label, index) => (
            <button
              key={DAYS[index]}
              className={index === activeDay ? "btn" : "btn secondary"}
              type="button"
              onClick={() => setActiveDay(index)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="muted" htmlFor="trainer-exercise-search">{t("library.searchLabel")}</label>
        <input
          id="trainer-exercise-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("library.searchPlaceholder")}
        />

        {exerciseState === "loading" ? <p className="muted">{t("ui.loading")}</p> : null}
        {exerciseState === "error" ? <p className="muted">{t("library.loadErrorList")}</p> : null}

        <div className="form-stack">
          {exerciseOptions.map((exercise) => (
            <button key={exercise.id} type="button" className="btn secondary" onClick={() => addExercise(exercise)}>
              {exercise.name}
            </button>
          ))}
        </div>

        <div className="form-stack">
          {selectedExercises.map((exercise, index) => (
            <div key={`${exercise.id}-${index}`} className="feature-card">
              {exercise.name}
            </div>
          ))}
          {!selectedExercises.length ? <p className="muted">{t("trainer.clientContext.unavailable")}</p> : null}
        </div>

        <button type="button" className="btn" disabled={!trainerApiCapabilities.canAssignTrainingPlan}>
          {t("ui.save")}
        </button>
        {!trainerApiCapabilities.canAssignTrainingPlan ? <p className="muted">{t("trainer.clientContext.unavailable")}</p> : null}
      </section>

      <Link href="/app/treinador" className="btn secondary">{t("trainer.back")}</Link>
    </div>
  );
}
