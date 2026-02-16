"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getLocaleCode } from "@/lib/i18n";
import { hasAiEntitlement, type AiEntitlementProfile } from "@/components/access/aiEntitlements";

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
  const [error, setError] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<AiEntitlementProfile["subscriptionPlan"]>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiEntitled, setAiEntitled] = useState(false);

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

  const refreshSubscription = async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as AiEntitlementProfile & {
        aiTokenBalance?: number;
      };
      setSubscriptionPlan(data.subscriptionPlan === "FREE" || data.subscriptionPlan === "PRO" ? data.subscriptionPlan : null);
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiEntitled(hasAiEntitlement(data));
    } catch {
    }
  };

  useEffect(() => {
    void refreshSubscription();
  }, []);

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
    if (!aiEntitled) {
      setError(t("ai.notPro"));
      return;
    }
    setTipLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/daily-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
        if (payload?.error === "INSUFFICIENT_TOKENS") {
          throw new Error(t("ai.insufficientTokens"));
        }
        if (response.status === 429) {
          throw new Error(payload?.message ?? t("feed.tipError"));
        }
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

  const isAiLocked = !aiEntitled || (subscriptionPlan === "FREE" && (aiTokenBalance ?? 0) <= 0);

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
          {aiEntitled ? (
            <button
              className="btn secondary"
              type="button"
              onClick={handleTip}
              disabled={tipLoading || isAiLocked}
            >
              {tipLoading ? t("feed.tipGenerating") : t("feed.tipGenerate")}
            </button>
          ) : null}
        </div>
      </div>

      {isAiLocked ? (
        <div className="feature-card" style={{ marginTop: 12 }}>
          <strong>{t("aiLockedTitle")}</strong>
          <p className="muted" style={{ marginTop: 6 }}>
            {aiEntitled ? t("aiLockedSubtitle") : t("ai.notPro")}
          </p>
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
