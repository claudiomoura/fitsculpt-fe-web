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

type BillingViewState = "ready" | "not_available" | "auth_required" | "error";

type BillingConfigError = "NO_VALID_PRICES" | "STRIPE_NOT_CONFIGURED" | null;


function isBillingConfigError(code: unknown): code is BillingConfigError {
  return code === "NO_VALID_PRICES" || code === "STRIPE_NOT_CONFIGURED";
}

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

function resolvePlanTitle(plan: BillingPlanSummary, t: (key: string) => string) {
  if (plan.title) {
    return plan.title;
  }

  return resolvePlanLabel(plan.planKey as BillingPlan, t);
}

function resolvePlanDescription(plan: BillingPlanSummary, t: (key: string) => string) {
  if (!plan.descriptionKey) {
    return t("ui.notAvailable");
  }

  const resolved = t(plan.descriptionKey);
  return resolved === plan.descriptionKey ? t("ui.notAvailable") : resolved;
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
  const checkoutStatus = searchParams.get("checkout");

  const { isAdmin, isDev } = useAccess();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [plans, setPlans] = useState<BillingPlanSummary[]>([]);
  const [gymMembership, setGymMembership] = useState<GymMembership>({ state: "unknown", gymId: null, gymName: null });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<BillingAction>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingState, setBillingState] = useState<BillingViewState>("ready");
  const [planWarnings, setPlanWarnings] = useState<string[]>([]);
  const [billingConfigError, setBillingConfigError] = useState<BillingConfigError>(null);

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
      const shouldSync = checkoutStatus === "success";

      const [statusResponse, plansResult, meResponse] = await Promise.all([
        fetch(`/api/billing/status${shouldSync ? "?sync=1" : ""}`, { cache: "no-store" }),
        getBillingPlans(),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);

      if (!statusResponse.ok) {
        setError(t("billing.loadError"));
        setBillingState("error");
        setBillingConfigError(null);
        setPlanWarnings([]);
        setProfile(null);
        setPlans([]);
        return;
      }

      setProfile((await statusResponse.json()) as BillingProfile);

      if (!plansResult.ok) {
        setPlanWarnings(plansResult.warnings);

        if (plansResult.reason === "not_available") {
          setBillingState("not_available");
          setBillingConfigError(null);
          setError(null);
          setPlans([]);
        } else if (plansResult.reason === "auth") {
          setBillingState("auth_required");
          setBillingConfigError(null);
          setError(null);
          setPlans([]);
        } else {
setBillingState("error");

if (isBillingConfigError(plansResult.errorCode)) {
  setBillingConfigError(plansResult.errorCode);
  setError(null);
} else {
  setBillingConfigError(null);
  setError(t("billing.loadError"));
}

setPlans([]);
        }
      } else {
        setBillingState("ready");
        setBillingConfigError(null);
        setPlanWarnings(plansResult.warnings);
        setPlans(plansResult.plans);
        setSelectedPlanId(null);
      }

      if (meResponse.ok) {
        const mePayload = (await meResponse.json()) as unknown;
        setGymMembership(extractGymMembership(mePayload));
      } else {
        setGymMembership({ state: "unknown", gymId: null, gymName: null });
      }

      if (shouldSync) {
        router.replace("/app/settings/billing");
      }
    } catch {
      setError(t("billing.loadError"));
      setBillingState("error");
      setPlanWarnings([]);
      setBillingConfigError(null);
      setProfile(null);
      setPlans([]);
      setSelectedPlanId(null);
    } finally {
      setLoading(false);
    }
  }, [checkoutStatus, router, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleCheckout = async () => {
    if (!selectedPlanId || selectedPlanId === currentPlan) {
      setError(t("billing.selectPlanError"));
      return;
    }

    setAction("checkout");
    setError(null);

    try {
      const response = await postBillingCheckout(selectedPlanId);
      const data = (await response.json()) as BillingRedirectResponse;

      if (!response.ok || !data.url) {
        setError(t("billing.checkoutError"));
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError(t("billing.checkoutError"));
    } finally {
      setAction(null);
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

      window.location.assign(data.url);
    } catch {
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

  const hasPlans = plans.length > 0;
  const canCheckout = Boolean(selectedPlanId && selectedPlanId !== currentPlan);
  const billingConfigIssueMessage = billingConfigError
    ? t(`billing.configErrors.${billingConfigError}`)
    : null;

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
          {planWarnings.length > 0 ? (
            <div className="rounded-lg border border-border-subtle bg-surface-2 px-4 py-3" role="status" aria-live="polite">
              <p className="muted m-0">{t("billing.warningsBannerTitle")}</p>
              <ul className="m-0 mt-2 pl-5 muted">
                {planWarnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

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
              {billingState === "not_available" ? (
                <EmptyState
                  title={t("billing.notAvailableTitle")}
                  description={t("billing.notAvailableDescription")}
                  icon="info"
                />
              ) : null}
              {billingState === "auth_required" ? (
                <EmptyState
                  title={t("billing.authRequiredTitle")}
                  description={t("billing.authRequiredDescription")}
                  icon="info"
                />
              ) : null}
              {billingState === "ready" && !hasPlans ? (
                <EmptyState title={t("billing.noPlansTitle")} description={t("billing.noPlansDescription")} icon="info" />
              ) : null}
              {billingState === "error" && billingConfigIssueMessage ? (
                <EmptyState
                  title={t("billing.configErrors.title")}
                  description={billingConfigIssueMessage}
                  icon="info"
                />
              ) : null}
              {billingState === "ready" ? plans.map((backendPlan) => {
                const isCurrent = backendPlan.planKey === currentPlan;
                const planId = backendPlan.planKey;
                const isSelected = selectedPlanId === planId;

                return (
                  <label
                    key={backendPlan.priceId || backendPlan.planKey}
                    className={`stack-sm border rounded-lg p-4 bg-surface-2 transition-colors ${
                      isCurrent ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                    } ${
                      isSelected ? "border-brand bg-brand/10" : "border-border-subtle"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="billing-plan"
                      value={planId}
                      checked={isSelected}
                      disabled={isCurrent}
                      onChange={() => {
                        if (isCurrent) {
                          return;
                        }

                        setSelectedPlanId(planId);
                        setError(null);
                      }}
                      aria-label={`${t("billing.selectPlanCta")}: ${resolvePlanTitle(backendPlan, t)}`}
                    />
                    <div className="stack-xs">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="m-0">{resolvePlanTitle(backendPlan, t)}</h3>
                        <div className="flex items-center gap-2">
                          {isSelected ? <Badge variant="info">{t("billing.selectedPlanBadge")}</Badge> : null}
                          {isCurrent ? <Badge variant="success">{t("billing.currentPlanBadge")}</Badge> : null}
                        </div>
                      </div>
                      <p className="muted m-0">{resolvePlanDescription(backendPlan, t)}</p>
                    </div>
                    <p className="muted m-0">{formatPlanPrice(backendPlan, locale, t)}</p>
                  </label>
                );
              }) : null}
              {billingState === "ready" && hasPlans ? (
                <Button
                  variant="primary"
                  loading={action === "checkout"}
                  disabled={!canCheckout || action === "portal"}
                  onClick={() => void handleCheckout()}
                >
                  {action === "checkout" ? t("billing.redirectingToCheckout") : t("billing.continueToCheckout")}
                </Button>
              ) : null}
              {billingState === "ready" && hasSubscriptionStatus ? (
                <Button
                  variant="secondary"
                  loading={action === "portal"}
                  disabled={portalDisabled}
                  onClick={() => void handlePortal()}
                >
                  {t("billing.manageSubscription")}
                </Button>
              ) : null}
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
