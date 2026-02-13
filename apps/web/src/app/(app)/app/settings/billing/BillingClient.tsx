"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageProvider";

type BillingProfile = {
  plan?: "FREE" | "PRO";
  isPro?: boolean;
  tokens?: number;
  tokensExpiresAt?: string | null;
  subscriptionStatus?: string | null;
};

type BillingAction = "checkout" | "portal" | null;

function resolveStatusBadgeVariant(subscriptionStatus: string | null | undefined) {
  const normalizedStatus = subscriptionStatus?.toLowerCase();

  if (!normalizedStatus) {
    return "muted" as const;
  }

  if (normalizedStatus === "active" || normalizedStatus === "trialing") {
    return "success" as const;
  }

  if (normalizedStatus === "past_due" || normalizedStatus === "incomplete") {
    return "warning" as const;
  }

  if (normalizedStatus === "canceled" || normalizedStatus === "unpaid") {
    return "danger" as const;
  }

  return "default" as const;
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

export default function BillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();

  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<BillingAction>(null);
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
      const response = await fetch(`/api/billing/status${shouldSync ? "?sync=1" : ""}`, { cache: "no-store" });

      if (!response.ok) {
        setError(t("billing.loadError"));
        setProfile(null);
        return;
      }

      const data = (await response.json()) as BillingProfile;
      setProfile(data);

      if (shouldSync) {
        router.replace("/app/settings/billing");
      }
    } catch {
      setError(t("billing.loadError"));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [router, searchParams, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleCheckout = async () => {
    setAction("checkout");
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string };

      if (!response.ok || !data.url) {
        setError(t("billing.checkoutError"));
        return;
      }

      window.location.href = data.url;
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
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await response.json()) as { url?: string };

      if (!response.ok || !data.url) {
        setError(t("billing.portalError"));
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(t("billing.portalError"));
    } finally {
      setAction(null);
    }
  };

  const isPro = profile?.isPro || profile?.plan === "PRO";
  const hasPlan = typeof profile?.plan === "string";
  const hasSubscriptionStatus = typeof profile?.subscriptionStatus === "string" && profile.subscriptionStatus.length > 0;

  const checkoutDisabled = loading || action === "portal" || Boolean(isPro);
  const portalDisabled = loading || action === "checkout" || !hasSubscriptionStatus;

  return (
    <section className="stack-md" aria-live="polite">
      <header className="stack-sm">
        <h1 className="section-title">{t("billing.title")}</h1>
        <p className="section-subtitle">{t("billing.subtitle")}</p>
      </header>

      {loading ? <LoadingState ariaLabel={t("billing.loadingStatus")} showCard={false} /> : null}

      {!loading && error && !profile ? (
        <ErrorState
          title={t("billing.loadError")}
          retryLabel={t("ui.retry")}
          onRetry={() => void loadProfile()}
          wrapInCard
          ariaLabel={t("billing.loadError")}
        />
      ) : null}

      {!loading && !error && !profile ? (
        <EmptyState
          title={t("billing.title")}
          description={t("billing.subtitle")}
          wrapInCard
          ariaLabel={t("billing.title")}
          actions={[
            {
              label: t("billing.upgradePro"),
              onClick: handleCheckout,
              disabled: checkoutDisabled,
            },
          ]}
        />
      ) : null}

      {!loading && profile ? (
        <div className="stack-md">
          <Card>
            <CardHeader>
              <CardTitle>{t("billing.currentPlanLabel")}</CardTitle>
              <CardDescription>{t("billing.stripeStatusLabel")}</CardDescription>
            </CardHeader>
            <CardContent className="stack-sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Badge variant={isPro ? "success" : "muted"}>{hasPlan ? profile.plan : t("billing.placeholderPlan")}</Badge>
                <Badge variant={resolveStatusBadgeVariant(hasSubscriptionStatus ? profile.subscriptionStatus : null)}>
                  {hasSubscriptionStatus ? resolveStatusLabel(profile.subscriptionStatus, t) : t("billing.placeholderStatus")}
                </Badge>
              </div>
              <p className="muted">
                {t("billing.tokenRenewalLabel")}: {formatDate(profile.tokensExpiresAt)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("billing.aiTokensLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                {typeof profile.tokens === "number" ? profile.tokens : t("ui.notAvailable")}
              </p>
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

          {error ? <p className="muted">{error}</p> : null}

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Button onClick={handleCheckout} loading={action === "checkout"} disabled={checkoutDisabled}>
              {action === "checkout" ? t("billing.redirecting") : t("billing.upgradePro")}
            </Button>
            <Button variant="secondary" onClick={handlePortal} loading={action === "portal"} disabled={portalDisabled}>
              {action === "portal" ? t("billing.opening") : t("billing.manageSubscription")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
