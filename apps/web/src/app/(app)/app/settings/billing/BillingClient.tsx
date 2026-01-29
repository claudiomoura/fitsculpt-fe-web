"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  return (
    <section className="card">
      <h1 className="section-title">{t("billing.title")}</h1>
      <p className="section-subtitle">{t("billing.subtitle")}</p>

      {loading ? (
        <p className="muted">{t("billing.loadingStatus")}</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t("billing.currentPlanLabel")}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{planLabel}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t("billing.stripeStatusLabel")}
                </div>
                <div>{profile?.subscriptionStatus ?? "-"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t("billing.tokenRenewalLabel")}
                </div>
                <div>{formatDate(tokenRenewalDate)}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t("billing.aiTokensLabel")}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{tokenLabel ?? "-"}</div>
              </div>
            </div>
          </div>

          {error ? <p className="muted">{error}</p> : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={handleCheckout} disabled={action === "checkout"}>
              {action === "checkout" ? t("billing.redirecting") : t("billing.upgradePro")}
            </button>
            <button type="button" className="btn secondary" onClick={handlePortal} disabled={action === "portal"}>
              {action === "portal" ? t("billing.opening") : t("billing.manageSubscription")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
