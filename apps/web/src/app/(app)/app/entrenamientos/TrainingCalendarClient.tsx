"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanDetail } from "@/lib/types";

const ACTIVE_PLAN_STORAGE_KEY = "fs_active_training_plan_id";

type LoadState = "idle" | "loading" | "ready" | "empty";

export default function TrainingCalendarClient() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [storedPlanId] = useState(() => (typeof window === "undefined" ? "" : window.localStorage.getItem(ACTIVE_PLAN_STORAGE_KEY)?.trim() ?? ""));
  const [plan, setPlan] = useState<TrainingPlanDetail | null>(null);
  const [state, setState] = useState<LoadState>("idle");

  const queryPlanId = searchParams.get("planId")?.trim() ?? "";
  const planId = queryPlanId || storedPlanId || null;

  useEffect(() => {
    if (queryPlanId) {
      window.localStorage.setItem(ACTIVE_PLAN_STORAGE_KEY, queryPlanId);
      return;
    }

    if (!storedPlanId) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("planId", storedPlanId);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [pathname, queryPlanId, router, searchParams, storedPlanId]);

  useEffect(() => {
    if (!planId) return;

    const controller = new AbortController();

    const loadPlan = async () => {
      setState("loading");

      try {
        const userPlanResponse = await fetch(`/api/training-plans/${planId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (userPlanResponse.ok) {
          const data = (await userPlanResponse.json()) as TrainingPlanDetail;
          setPlan(data);
          setState("ready");
          return;
        }

        if ([401, 403, 404, 501].includes(userPlanResponse.status)) {
          setPlan(null);
          setState("empty");
          return;
        }

        const gymPlanResponse = await fetch(`/api/trainer/plans/${planId}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (gymPlanResponse.ok) {
          const data = (await gymPlanResponse.json()) as TrainingPlanDetail;
          setPlan(data);
          setState("ready");
          return;
        }

        setPlan(null);
        setState("empty");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPlan(null);
        setState("empty");
      }
    };

    void loadPlan();
    return () => controller.abort();
  }, [planId]);

  const days = useMemo(() => {
    if (!plan?.days) return [];

    const formatter = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    return plan.days.map((day) => ({
      ...day,
      dateLabel: day.date ? formatter.format(new Date(day.date)) : day.label,
    }));
  }, [locale, plan]);

  if (state === "loading") {
    return (
      <section className="card" aria-busy="true">
        <SkeletonCard />
        <div className="mt-12">
          <SkeletonCard />
        </div>
      </section>
    );
  }

  if (!planId || state === "empty") {
    return (
      <section className="card centered-card">
        <div className="empty-state">
          <h3 className="m-0">{t("training.calendar.noPlanSelected")}</h3>
          <p className="muted">{t("training.calendar.noPlanSelectedDescription")}</p>
          <ButtonLink href="/app/biblioteca/entrenamientos">{t("training.calendar.goToPlansCta")}</ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="page-header">
        <div className="page-header-body">
          <h2 className="section-title section-title-sm">{plan.title}</h2>
          <p className="section-subtitle">{t("training.calendar.filteredByPlan")}</p>
        </div>
        <div className="page-header-actions">
          <Link className="btn secondary" href={`/app/biblioteca/entrenamientos?planId=${plan.id}`}>
            {t("training.calendar.changePlan")}
          </Link>
        </div>
      </div>

      {days.length === 0 ? (
        <p className="muted mt-12">{t("library.training.sectionEmpty")}</p>
      ) : (
        <div className="form-stack mt-12">
          {days.map((day) => (
            <article key={day.id} className="calendar-day-card">
              <div className="calendar-day-card-header">
                <strong>{day.dateLabel}</strong>
                <span className="muted">{day.focus}</span>
              </div>
              <div className="calendar-day-card-body">
                <p className="muted">{day.duration} {t("training.minutesLabel")}</p>
                <ul className="list">
                  {day.exercises.map((exercise) => (
                    <li key={exercise.id}>
                      <strong>{exercise.name}</strong> <span className="muted">{exercise.sets} {exercise.reps ? `x ${exercise.reps}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
