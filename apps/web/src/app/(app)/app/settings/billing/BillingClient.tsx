"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { extractGymMembership, type GymMembership } from "@/lib/gymMembership";
import { useAccess } from "@/lib/useAccess";
import {
  getBillingPlans,
  postBillingCheckout,
  postBillingPortal,
  type BillingPlanSummary,
  type BillingRedirectResponse,
} from "@/services/billing";

type BillingPlan = "FREE" | "PRO" | "STRENGTH_AI" | "NUTRI_AI" | "ULTRA" | (string & {});

type BillingProfile = {
  plan?: BillingPlan;
  isPro?: boolean;
  tokens?: number;
  tokensExpiresAt?: string | null;
  subscriptionStatus?: string | null;
};

type BillingAction = "checkout" | "portal" | null;

type PlanKey = "strengthAi" | "nutriAi" | "pro";

type PlanCard = {
  key: PlanKey;
  planValues: BillingPlan[];
};

const PLAN_CARDS: PlanCard[] = [
  { key: "strengthAi", planValues: ["STRENGTH_AI"] },
  { key: "nutriAi", planValues: ["NUTRI_AI"] },
  { key: "pro", planValues: ["PRO"] },
];

function resolveStatusLabel(subscriptionStatus: string | null | undefined, t: (key: string) => string) {
  const normalizedStatus = subscriptionStatus?.toLowerCase();

  if (!normalizedStatus) {
    return t("ui.notAvailable");
  }

  return t(`billing.subscriptionStatuses.${normalizedStatus}`) === `billing.subscriptionStatuses.${normalizedStatus}`
    ? t("billing.subscriptionStatuses.unknown")
    : t(`billing.subscriptionStatuses.${normalizedStatus}`);
}

function resolvePlanLabel(plan: BillingPlan | null | undefined, t: (key: string) => string) {
  if (!plan) {
    return t("billing.planLabels.unknown");
  }

  const normalized = plan.toLowerCase();
  const messageKey = `billing.planLabels.${normalized}`;

  return t(messageKey) === messageKey ? t("billing.planLabels.unknown") : t(messageKey);
}

function resolveIntervalLabel(interval: string | undefined, t: (key: string) => string) {
  const normalized = (interval ?? "month").toLowerCase();
  const key = `billing.intervals.${normalized}`;
  return t(key) === key ? t("billing.intervals.month") : t(key);
}

function formatPlanPrice(
  plan: BillingPlanSummary,
  locale: string,
  t: (key: string) => string,
) {
  const currency = plan.price?.currency?.toUpperCase() || "USD";
  const amount = typeof plan.price?.amount === "number" ? plan.price.amount : 0;
  const intervalLabel = resolveIntervalLabel(plan.price?.interval, t);

  const formatted = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted}/${intervalLabel}`;
}

export default function BillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();

  const { isAdmin, isDev } = useAccess();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [plans, setPlans] = useState<BillingPlanSummary[]>([]);
  const [gymMembership, setGymMembership] = useState<GymMembership>({ state: "unknown", gymId: null, gymName: null });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<BillingAction>(null);
  const [targetPlanKey, setTargetPlanKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL;

  const formatDate = useMemo(() => {
    const intlLocale = locale === "es" ? "es-ES" : "en-US";
    const formatter = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" });

    return (value?: string | null) => {
      if (!value) {
        return t("ui.notAvailable");
      }

      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? t("ui.notAvailable") : formatter.format(date);
    };
  }, [locale, t]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const shouldSync = searchParams.get("checkout") === "success";

      const [statusResponse, plansResponse, meResponse] = await Promise.all([
        fetch(`/api/billing/status${shouldSync ? "?sync=1" : ""}`, { cache: "no-store" }),
        getBillingPlans(),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);

      if (!statusResponse.ok || !plansResponse.ok) {
        setError(t("billing.loadError"));
        setProfile(null);
        setPlans([]);
        return;
      }

      setProfile((await statusResponse.json()) as BillingProfile);

      const plansPayload = (await plansResponse.json()) as { plans?: BillingPlanSummary[] } | BillingPlanSummary[];
      const plansList = Array.isArray(plansPayload) ? plansPayload : plansPayload.plans;
      setPlans(Array.isArray(plansList) ? plansList : []);

      if (meResponse.ok) {
        const mePayload = (await meResponse.json()) as unknown;
        setGymMembership(extractGymMembership(mePayload));
      } else {
        setGymMembership({ state: "unknown", gymId: null, gymName: null });
      }

      if (shouldSync) {
        router.replace("/app/settings/billing");
      }
    } catch (_err) {
      setError(t("billing.loadError"));
      setProfile(null);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [router, searchParams, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleCheckout = async (planKey: string) => {
    setAction("checkout");
    setTargetPlanKey(planKey);
    setError(null);

    try {
      const response = await postBillingCheckout(planKey);
      const data = (await response.json()) as BillingRedirectResponse;

      if (!response.ok || !data.url) {
        setError(t("billing.checkoutError"));
        return;
      }

      window.location.href = data.url;
    } catch (_err) {
      setError(t("billing.checkoutError"));
    } finally {
      setAction(null);
      setTargetPlanKey(null);
    }
  };

  const handlePortal = async () => {
    setAction("portal");
    setError(null);

    try {
      const response = await postBillingPortal();
      const data = (await response.json()) as BillingRedirectResponse;

      if (!response.ok || !data.url) {
        setError(t("billing.portalError"));
        return;
      }

      window.location.href = data.url;
    } catch (_err) {
      setError(t("billing.portalError"));
    } finally {
      setAction(null);
    }
  };

  const currentPlan = profile?.plan;
  const hasSubscriptionStatus = typeof profile?.subscriptionStatus === "string" && profile.subscriptionStatus.length > 0;
  const portalDisabled = loading || action === "checkout" || !hasSubscriptionStatus;
  const hasGymSelectionEndpoint = false;
  const canSeeDevNote = (isAdmin || isDev) && !hasGymSelectionEndpoint;

  const plansByKey = useMemo(() => {
    const map = new Map<string, BillingPlanSummary>();
    for (const plan of plans) {
      if (plan?.planKey) {
        map.set(plan.planKey.toUpperCase(), plan);
      }
    }
    return map;
  }, [plans]);

  return (
    <section className="stack-md" aria-live="polite">
      <header className="stack-sm">
        <h1 className="section-title">{t("billing.title")}</h1>
        <p className="section-subtitle">{t("billing.subtitle")}</p>
      </header>

      {loading ? <LoadingState ariaLabel={t("billing.loadingStatus")} showCard={false} /> : null}

      {!loading && error ? (
        <ErrorState
          title={t("billing.loadError")}
          retryLabel={t("ui.retry")}
          onRetry={() => void loadProfile()}
          wrapInCard
          ariaLabel={t("billing.loadError")}
        />
      ) : null}

      {!loading && !error ? (
        <div className="stack-md">
          <Card>
            <CardHeader>
              <CardTitle>{t("billing.currentPlanLabel")}</CardTitle>
              <CardDescription>{t("billing.stripeStatusLabel")}</CardDescription>
            </CardHeader>
            <CardContent className="stack-sm">
              <Badge variant={currentPlan ? "success" : "muted"}>{resolvePlanLabel(currentPlan, t)}</Badge>
              <p className="muted m-0">{`${t("billing.stripeStatusLabel")}: ${resolveStatusLabel(profile?.subscriptionStatus, t)}`}</p>
              <p className="muted m-0">{`${t("billing.tokenRenewalLabel")}: ${formatDate(profile?.tokensExpiresAt)}`}</p>
              <p className="muted m-0">{`${t("billing.aiTokensLabel")}: ${profile?.tokens ?? t("ui.notAvailable")}`}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("billing.planSelectionTitle")}</CardTitle>
              <CardDescription>{t("billing.planSelectionDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="stack-md">
              {PLAN_CARDS.map((plan) => {
                const matchedPlan = plan.planValues.find((value) => plansByKey.has(value));
                if (!matchedPlan) {
                  return null;
                }

                const backendPlan = plansByKey.get(matchedPlan);
                if (!backendPlan) {
                  return null;
                }

                const isCurrent = plan.planValues.some((value) => value === currentPlan);
                const checkoutDisabled = loading || action === "portal" || action === "checkout" || isCurrent;

                return (
                  <div key={plan.key} className="stack-sm border border-border-subtle rounded-lg p-4 bg-surface-2">
                    <div className="stack-xs">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="m-0">{t(`billing.plans.${plan.key}.name`)}</h3>
                        {isCurrent ? <Badge variant="success">{t("billing.currentPlanBadge")}</Badge> : null}
                      </div>
                      <p className="muted m-0">{t(`billing.plans.${plan.key}.description`)}</p>
                    </div>
                    <p className="muted m-0">{formatPlanPrice(backendPlan, locale, t)}</p>
                    {isCurrent ? (
                      <Button
                        variant="secondary"
                        loading={action === "portal"}
                        disabled={portalDisabled}
                        onClick={() => void handlePortal()}
                      >
                        {t("billing.manageSubscription")}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        loading={action === "checkout" && targetPlanKey === backendPlan.planKey}
                        disabled={checkoutDisabled}
                        onClick={() => void handleCheckout(backendPlan.planKey)}
                      >
                        {t("billing.subscribe")}
                      </Button>
                    )}
                  </div>
                );
              })}
              {error ? <p className="muted m-0">{error}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("billing.gym.title")}</CardTitle>
            </CardHeader>
            <CardContent className="stack-sm">
              {gymMembership.state === "in_gym" ? (
                <>
                  <Badge variant="success">{t("billing.gym.statusYes")}</Badge>
                  {gymMembership.gymName ? <p className="muted m-0">{`${t("billing.gym.nameLabel")}: ${gymMembership.gymName}`}</p> : null}
                  {gymMembership.gymId ? <p className="muted m-0">{`${t("billing.gym.idLabel")}: ${gymMembership.gymId}`}</p> : null}
                </>
              ) : null}

              {gymMembership.state === "not_in_gym" ? (
                <EmptyState title={t("billing.gym.statusNo")} description={t("billing.gym.notInGymDescription")} icon="info" />
              ) : null}

              {gymMembership.state === "unknown" ? (
                <EmptyState title={t("billing.gym.unknownTitle")} description={t("billing.gym.unknownDescription")} icon="info" />
              ) : null}

              {canSeeDevNote ? <p className="muted m-0">{t("billing.gym.linkRequiresImplementation")}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.sections.support.title")}</CardTitle>
              <CardDescription>{t("billing.supportDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {supportUrl ? (
                <ButtonLink href={supportUrl} target="_blank" rel="noreferrer" variant="secondary">
                  {t("billing.supportAction")}
                </ButtonLink>
              ) : (
                <p className="muted m-0">{t("billing.supportPlaceholder")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
