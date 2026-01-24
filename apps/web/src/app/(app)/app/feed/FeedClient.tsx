"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getLocaleCode } from "@/lib/i18n";

type FeedPost = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
};

type DailyTip = {
  title: string;
  message: string;
};

function formatDate(value: string, localeCode: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(localeCode, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FeedClient() {
  const { t, locale } = useLanguage();
  const localeCode = getLocaleCode(locale);
  const [items, setItems] = useState<FeedPost[]>([]);
  const [tip, setTip] = useState<DailyTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<"FREE" | "PRO" | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/feed", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(t("feed.errorLoad"));
      }
      const data = (await response.json()) as FeedPost[];
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feed.errorUnexpected"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          setSubscriptionPlan("FREE");
          return;
        }
        const data = (await response.json()) as { subscriptionPlan?: "FREE" | "PRO" };
        setSubscriptionPlan(data.subscriptionPlan ?? "FREE");
      } catch {
        setSubscriptionPlan("FREE");
      }
    };
    void loadSubscription();
  }, []);

  const isPro = subscriptionPlan === "PRO";

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string };
      if (!response.ok || !data.url) {
        setError(t("pro.checkoutError"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("pro.checkoutError"));
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/feed/generate", { method: "POST", credentials: "include" });
      if (!response.ok) {
        throw new Error(t("feed.errorGenerate"));
      }
      const post = (await response.json()) as FeedPost;
      setItems((prev) => [post, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feed.errorUnexpected"));
    } finally {
      setGenerating(false);
    }
  };

  const handleTip = async () => {
    setTipLoading(true);
    setError(null);
    if (!isPro) {
      setTipLoading(false);
      setError(t("pro.aiLockedHint"));
      return;
    }
    try {
      const response = await fetch("/api/ai/daily-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(t("feed.tipError"));
      }
      const data = (await response.json()) as { tip?: DailyTip; aiTokenBalance?: number; aiTokenRenewalAt?: string | null };
      const tip = data.tip ?? (data as unknown as DailyTip);
      setTip(tip);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feed.tipError"));
    } finally {
      setTipLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t("app.feedSectionTitle")}</h2>
          <p className="section-subtitle">{t("app.feedSectionSubtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={handleGenerate} disabled={generating}>
            {generating ? t("feed.generating") : t("feed.generate")}
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={handleTip}
            disabled={tipLoading || !isPro}
            title={!isPro ? t("pro.aiLockedHint") : undefined}
          >
            {tipLoading ? t("feed.tipGenerating") : t("feed.tipGenerate")}
          </button>
        </div>
      </div>

      {subscriptionPlan === "FREE" ? (
        <div className="card ai-card" style={{ marginTop: 16 }}>
          <div className="ai-card-content">
            <div>
              <p className="ai-card-eyebrow">PRO</p>
              <h3 style={{ margin: 0 }}>{t("pro.aiLockedTitle")}</h3>
              <p className="muted" style={{ marginTop: 6 }}>
                {t("pro.aiLockedSubtitle")}
              </p>
            </div>
            <div className="ai-card-actions">
              <button type="button" className="btn" onClick={handleUpgrade} disabled={upgradeLoading}>
                {upgradeLoading ? "..." : t("pro.aiLockedCta")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="muted">{error}</p> : null}
      {loading ? <p className="muted">{t("feed.loading")}</p> : null}
      {!loading && items.length === 0 ? (
        <p className="muted">{t("feed.empty")}</p>
      ) : null}

      <div className="feed-list">
        {tip ? (
          <article className="feed-item">
            <div>
              <h3>{tip.title}</h3>
              <p className="muted">{t("feed.tipSubtitle")}</p>
            </div>
            <p>{tip.message}</p>
          </article>
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="feed-item">
            <div>
              <h3>{item.title}</h3>
              <p className="muted">{formatDate(item.createdAt, localeCode)}</p>
            </div>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
