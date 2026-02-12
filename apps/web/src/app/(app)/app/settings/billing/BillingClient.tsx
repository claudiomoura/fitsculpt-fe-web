"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageProvider";

type BillingProfile = {
  plan?: "FREE" | "PRO";
  isPro?: boolean;
  tokens?: number;
  tokensExpiresAt?: string | null;
  subscriptionStatus?: string | null;
};

type BillingAction = "checkout" | "portal" | null;

export default function BillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();

  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<BillingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenRenewalDate = profile?.tokensExpiresAt ?? null;
  const planLabel = profile?.plan ?? (error ? "-" : "FREE");
  const tokenLabel = typeof profile?.tokens === "number" ? profile.tokens : error ? null : 0;

  const formatDate = useMemo(() => {
    const intlLocale = locale === "es" ? "es-ES" : "en-US";
    const formatter = new Intl.DateTimeFormat(intlLocale, { day: "2-digit", month: "2-digit", year: "numeric" });
    return (value?: string | null) => {
      if (!value) return "-";
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "-" : formatter.format(date);
    };
  }, [locale]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setError(null);
        const shouldSync = searchParams.get("checkout") === "success";
        const response = await fetch(`/api/billing/status${shouldSync ? "?sync=1" : ""}`, { cache: "no-store" });
        if (!response.ok) {
          setError(t("billing.loadError"));
          return;
        }
        const data = (await response.json()) as BillingProfile;
        setProfile(data);
        if (shouldSync) {
          router.replace("/app/settings/billing");
        }
      } catch {
        setError(t("billing.loadError"));
      } finally {
        setLoading(false);
      }
    };
    void loadProfile();
  }, [router, searchParams, t]);

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

  if (loading) {
    return <LoadingState ariaLabel={t("billing.loadingBilling")} title={t("billing.title")} lines={4} />;
  }

  if (error && !profile) {
    return (
      <ErrorState
        title={t("billing.loadError")}
        description={t("billing.portalError")}
        actions={[{ label: t("billing.manageSubscription"), href: "/app/settings", variant: "secondary" }]}
        wrapInCard
      />
    );
  }

  return (
    <section className="form-stack" aria-labelledby="billing-title">
      <header className="form-stack">
        <h1 id="billing-title" className="section-title">
          {t("billing.title")}
        </h1>
        <p className="section-subtitle">{t("billing.subtitle")}</p>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("billing.currentPlanLabel")}</CardTitle>
            <CardDescription>{t("billing.stripeStatusLabel")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("billing.currentPlanLabel")}</div>
            <div className="info-value">{planLabel}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("billing.stripeStatusLabel")}</div>
            <div className="info-value">{profile?.subscriptionStatus ?? "-"}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("billing.tokenRenewalLabel")}</div>
            <div className="info-value">{formatDate(tokenRenewalDate)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("billing.aiTokensLabel")}</div>
            <div className="info-value">{tokenLabel ?? "-"}</div>
          </div>
        </CardContent>
        <CardFooter style={{ justifyContent: "flex-start" }}>
          <Button onClick={handleCheckout} disabled={action === "checkout"}>
            {action === "checkout" ? t("billing.redirecting") : t("billing.upgradePro")}
          </Button>
          <Button variant="secondary" onClick={handlePortal} disabled={action === "portal"}>
            {action === "portal" ? t("billing.opening") : t("billing.manageSubscription")}
          </Button>
        </CardFooter>
      </Card>

      {error ? <p className="muted">{error}</p> : null}
    </section>
  );
}
