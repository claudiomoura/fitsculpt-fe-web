"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { hasAiEntitlement, type AiEntitlementProfile } from "@/components/access/aiEntitlements";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageProvider";
import type { TrainingPlanListItem } from "@/lib/types";

type TrainingPlanResponse = {
  items?: TrainingPlanListItem[];
};

type UserRoleResponse = {
  role?: "ADMIN" | "USER";
};

type SectionState = "loading" | "ready" | "error" | "unavailable";

const ACTIVE_PLAN_STORAGE_KEY = "fs_active_training_plan_id";

function hasTrainerAssignmentTag(plan: TrainingPlanListItem): boolean {
  const candidate = plan as unknown as Record<string, unknown>;
  return Boolean(candidate.assignedByTrainer || candidate.assigned || candidate.assignmentSource === "trainer");
}

export default function TrainingLibraryClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [fitSculptPlans, setFitSculptPlans] = useState<TrainingPlanListItem[]>([]);
  const [gymPlans, setGymPlans] = useState<TrainingPlanListItem[]>([]);
  const [fitSculptState, setFitSculptState] = useState<SectionState>("loading");
  const [gymState, setGymState] = useState<SectionState>("loading");
  const [aiEligible, setAiEligible] = useState(false);
  const [storedPlanId] = useState(() => (typeof window === "undefined" ? "" : window.localStorage.getItem(ACTIVE_PLAN_STORAGE_KEY)?.trim() ?? ""));

  const queryPlanId = searchParams.get("planId")?.trim() ?? "";
  const activePlanId = queryPlanId || storedPlanId || null;

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
    const controller = new AbortController();

    const loadRole = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as UserRoleResponse & AiEntitlementProfile;
        setAiEligible(hasAiEntitlement(data));
      } catch {
      }
    };

    void loadRole();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadPlans = async () => {
      setFitSculptState("loading");
      setGymState("loading");

      const params = new URLSearchParams();
      params.set("limit", "100");
      if (query.trim()) params.set("query", query.trim());

      try {
        const fitSculptResponse = await fetch(`/api/training-plans?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!fitSculptResponse.ok) {
          setFitSculptPlans([]);
          setFitSculptState("unavailable");
        } else {
          const data = (await fitSculptResponse.json()) as TrainingPlanResponse;
          setFitSculptPlans(data.items ?? []);
          setFitSculptState("ready");
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFitSculptPlans([]);
        setFitSculptState("error");
      }

      try {
        const gymResponse = await fetch(`/api/trainer/plans?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!gymResponse.ok) {
          setGymPlans([]);
          setGymState((gymResponse.status === 401 || gymResponse.status === 403 || gymResponse.status === 404 || gymResponse.status === 405) ? "unavailable" : "error");
          return;
        }

        const data = (await gymResponse.json()) as TrainingPlanResponse;
        setGymPlans(data.items ?? []);
        setGymState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGymPlans([]);
        setGymState("unavailable");
      }
    };

    void loadPlans();
    return () => controller.abort();
  }, [query]);

  const noPlansAvailable = useMemo(
    () => fitSculptState === "ready" && gymState === "ready" && fitSculptPlans.length === 0 && gymPlans.length === 0,
    [fitSculptPlans.length, fitSculptState, gymPlans.length, gymState]
  );

  const selectPlan = (planId: string) => {
    const normalizedPlanId = planId.trim();
    if (!normalizedPlanId) return;

    window.localStorage.setItem(ACTIVE_PLAN_STORAGE_KEY, normalizedPlanId);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("planId", normalizedPlanId);
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const renderSection = (titleKey: string, plans: TrainingPlanListItem[], state: SectionState) => (
    <section className="card">
      <h2 className="section-title section-title-sm">{t(titleKey)}</h2>

      {state === "loading" ? (
        <div className="mt-12" style={{ display: "grid", gap: 12 }}>
          {Array.from({ length: 2 }).map((_, index) => <SkeletonCard key={`${titleKey}-${index}`} />)}
        </div>
      ) : null}

      {state === "error" ? <p className="muted mt-12">{t("library.training.sectionError")}</p> : null}
      {state === "unavailable" ? <p className="muted mt-12">{t("library.training.sectionUnavailable")}</p> : null}
      {state === "ready" && plans.length === 0 ? <p className="muted mt-12">{t("library.training.sectionEmpty")}</p> : null}

      {state === "ready" && plans.length > 0 ? (
        <div className="mt-12" style={{ display: "grid", gap: 12 }}>
          {plans.map((plan) => {
            const isSelected = activePlanId === plan.id;
            return (
              <article key={plan.id} className="feature-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <h3 className="m-0">{plan.title}</h3>
                    <p className="muted mt-6">
                      {t("library.training.planMeta", { days: plan.daysCount, level: plan.level })}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {hasTrainerAssignmentTag(plan) ? <Badge variant="muted">{t("library.training.assignedByTrainer")}</Badge> : null}
                    {isSelected ? <Badge variant="success">{t("library.training.selected")}</Badge> : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Button variant={isSelected ? "secondary" : "default"} onClick={() => selectPlan(plan.id)}>
                    {isSelected ? t("library.training.selected") : t("library.training.choose")}
                  </Button>
                  <Link href={`/app/biblioteca/entrenamientos/${plan.id}`} className="btn secondary">
                    {t("trainingPlans.viewDetail")}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );

  return (
    <>
      <section className="card">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("trainingPlans.searchPlaceholder")}
          label={t("trainingPlans.searchLabel")}
          helperText={t("trainingPlans.searchHelper")}
        />
      </section>

      {renderSection("library.training.sections.fitsculpt", fitSculptPlans, fitSculptState)}
      {renderSection("library.training.sections.gym", gymPlans, gymState)}

      <section className="card">
        <h2 className="section-title section-title-sm">{t("library.training.sections.ai")}</h2>
        {!aiEligible ? (
          <div className="feature-card mt-12" role="status">
            <strong>{t("library.training.aiLockedTitle")}</strong>
            <p className="muted mt-6">{t("library.training.aiLockedDescription")}</p>
          </div>
        ) : (
          <div className="feature-card mt-12">
            <strong>{t("library.training.aiPlaceholderTitle")}</strong>
            <p className="muted mt-6">{t("library.training.aiPlaceholderDescription")}</p>
            <div className="mt-12">
              <Link href="/app/entrenamiento?ai=1" className="btn">{t("trainingPlans.aiCta")}</Link>
            </div>
          </div>
        )}
      </section>

      {noPlansAvailable ? (
        <section className="card">
          <p className="muted">{t("library.training.noAssignedOrAvailable")}</p>
        </section>
      ) : null}
    </>
  );
}
