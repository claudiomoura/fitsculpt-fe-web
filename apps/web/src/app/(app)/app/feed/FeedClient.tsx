"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Modal } from "@/design-system/components/Modal";
import { Button, ButtonLink } from "@/design-system/components/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { getLocaleCode } from "@/lib/i18n";
import { hasAiEntitlement } from "@/components/access/aiEntitlements";
import { fetchAuthMe } from "@/lib/authDedup";

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

type ContextualChatReply = {
  title?: string;
  message: string;
  suggestions?: string[];
};

type AiUsageSummary = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const localeCode = getLocaleCode(locale);
  const [items, setItems] = useState<FeedPost[]>([]);
  const [tip, setTip] = useState<DailyTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatReply, setChatReply] = useState<ContextualChatReply | null>(null);
  const [chatUsage, setChatUsage] = useState<AiUsageSummary | null>(null);
  const [chatCostEur, setChatCostEur] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiEntitled, setAiEntitled] = useState(false);
  const [tokensExhaustedModalOpen, setTokensExhaustedModalOpen] = useState(false);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/feed", { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t("feed.errorUnauthorized"));
        }
        throw new Error(t("feed.errorLoad"));
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(t("feed.errorUnexpected"));
      }
      const data = await response.json();
      let feedItems: FeedPost[];
      
      if (Array.isArray(data)) {
        feedItems = data;
      } else if (data && typeof data === 'object') {
        // Handle potential API response wrapping
        if (Array.isArray(data.items)) {
          feedItems = data.items;
        } else if (Array.isArray(data.data)) {
          feedItems = data.data;
        } else if (Array.isArray(data.posts)) {
          feedItems = data.posts;
        } else {
          throw new Error(t("feed.errorUnexpected"));
        }
      } else {
        throw new Error(t("feed.errorUnexpected"));
      }

      setItems(feedItems);
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
      const data = await fetchAuthMe();
      setAiTokenBalance(typeof data.aiTokenBalance === "number" ? data.aiTokenBalance : null);
      setAiEntitled(hasAiEntitlement(data));
    } catch (_err) {
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
    if ((aiTokenBalance ?? 0) <= 0) {
      setTokensExhaustedModalOpen(true);
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
        if (payload?.error === "INSUFFICIENT_TOKENS" || payload?.error === "AI_TOKENS_EXHAUSTED") {
          setTokensExhaustedModalOpen(true);
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
      if (typeof data.aiTokenBalance === "number") {
        setAiTokenBalance(data.aiTokenBalance);
      }
      void refreshSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feed.tipError"));
    } finally {
      setTipLoading(false);
    }
  };

  const handleContextualChat = async () => {
    if (!aiEntitled) {
      setError(t("ai.notPro"));
      return;
    }
    if ((aiTokenBalance ?? 0) <= 0) {
      setTokensExhaustedModalOpen(true);
      return;
    }
    const message = chatInput.trim();
    if (!message) {
      setError(t("feed.chatEmpty"));
      return;
    }

    setChatLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/chat/contextual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          surface: "feed",
          locale,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            reason?: string;
            providerCode?: string;
            reply?: ContextualChatReply;
            aiTokenBalance?: number;
            usage?: AiUsageSummary;
            costEur?: number;
          }
        | null;

      if (!response.ok) {
        if (
          payload?.error === "INSUFFICIENT_TOKENS" ||
          payload?.error === "AI_TOKENS_EXHAUSTED" ||
          payload?.error === "AI_QUOTA_EXCEEDED"
        ) {
          setTokensExhaustedModalOpen(true);
          throw new Error(t("ai.insufficientTokens"));
        }
        if (payload?.error === "AI_NOT_CONFIGURED") {
          throw new Error("IA no configurada en backend (OPENAI_API_KEY).");
        }
        if (payload?.providerCode === "invalid_api_key") {
          throw new Error("La clave de OpenAI es invalida. Actualiza OPENAI_API_KEY en apps/api y reinicia el backend.");
        }
        if (payload?.error === "AI_REQUEST_FAILED" && payload?.reason) {
          throw new Error(`IA no disponible (${payload.reason}).`);
        }
        throw new Error(t("feed.chatError"));
      }

      if (!payload?.reply) {
        throw new Error(t("feed.chatError"));
      }

      setChatReply(payload.reply);
      const usage = payload.usage;
      if (
        usage &&
        typeof usage.totalTokens === "number" &&
        typeof usage.promptTokens === "number" &&
        typeof usage.completionTokens === "number"
      ) {
        setChatUsage(usage);
      } else {
        setChatUsage(null);
      }
      setChatCostEur(
        typeof payload.costEur === "number" && Number.isFinite(payload.costEur)
          ? payload.costEur
          : null,
      );
      setChatInput("");
      if (typeof payload.aiTokenBalance === "number") {
        setAiTokenBalance(payload.aiTokenBalance);
      }
      void refreshSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feed.chatError"));
    } finally {
      setChatLoading(false);
    }
  };

  const isAiLocked = !aiEntitled || (aiTokenBalance ?? 0) <= 0;
  const currentRoute = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const billingHref = `/app/settings/billing?returnTo=${encodeURIComponent(currentRoute)}`;

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
          <strong>{t("pro.aiLockedTitle")}</strong>
          <p className="muted" style={{ marginTop: 6 }}>
            {aiEntitled ? t("pro.aiLockedSubtitle") : t("ai.notPro")}
          </p>
        </div>
      ) : null}

      <div className="feature-card" style={{ marginTop: 12 }}>
        <strong>{t("feed.chatTitle")}</strong>
        <p className="muted" style={{ marginTop: 6 }}>
          {t("feed.chatSubtitle")}
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder={t("feed.chatPlaceholder")}
            aria-label={t("feed.chatInputAria")}
            rows={3}
            maxLength={1200}
            style={{ width: "100%", resize: "vertical" }}
            disabled={chatLoading || isAiLocked}
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span className="muted">{chatInput.trim().length}/1200</span>
            <button
              className="btn secondary"
              type="button"
              onClick={handleContextualChat}
              disabled={chatLoading || isAiLocked}
            >
              {chatLoading ? t("feed.chatSending") : t("feed.chatSend")}
            </button>
          </div>
        </div>

        {chatReply ? (
          <article className="feed-item" style={{ marginTop: 12 }}>
            <div>
              <h3>{chatReply.title ?? t("feed.chatReplyTitle")}</h3>
              <p>{chatReply.message}</p>
            </div>
            {chatReply.suggestions?.length ? (
              <p className="muted">{chatReply.suggestions.join(" • ")}</p>
            ) : null}
            {chatUsage ? (
              <p className="muted">
                {t("feed.chatUsage", {
                  tokens: chatUsage.totalTokens,
                  eur: (chatCostEur ?? 0).toFixed(2),
                })}
              </p>
            ) : null}
          </article>
        ) : null}
      </div>


      <Modal
        open={tokensExhaustedModalOpen}
        onClose={() => setTokensExhaustedModalOpen(false)}
        title={t("ai.tokensExhaustedTitle")}
        description={t("ai.tokensExhaustedDescription")}
        footer={(
          <div className="inline-actions-sm">
            <Button variant="secondary" onClick={() => setTokensExhaustedModalOpen(false)}>{t("ui.close")}</Button>
            <ButtonLink href={billingHref}>{t("billing.manageBilling")}</ButtonLink>
          </div>
        )}
      >
        <p className="muted m-0">{t("ai.insufficientTokens")}</p>
      </Modal>

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
        {items.map((item, index) => (
          <article key={item.id || `${item.createdAt}-${index}`} className="feed-item">
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
