"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Modal } from "@/design-system/components/Modal";
import { Button, ButtonLink } from "@/design-system/components/Button";
import { useLanguage } from "@/context/LanguageProvider";
import { hasAiEntitlement } from "@/components/access/aiEntitlements";
import { fetchAuthMe } from "@/lib/authDedup";

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

export default function CoachClient() {
  const { t, locale } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatReply, setChatReply] = useState<ContextualChatReply | null>(null);
  const [chatUsage, setChatUsage] = useState<AiUsageSummary | null>(null);
  const [chatCostEur, setChatCostEur] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiTokenBalance, setAiTokenBalance] = useState<number | null>(null);
  const [aiEntitled, setAiEntitled] = useState(false);
  const [tokensExhaustedModalOpen, setTokensExhaustedModalOpen] = useState(false);

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
      setError(t("coach.chatEmpty"));
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
          surface: "coach",
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
        throw new Error(t("coach.chatError"));
      }

      if (!payload?.reply) {
        throw new Error(t("coach.chatError"));
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
      setError(err instanceof Error ? err.message : t("coach.chatError"));
    } finally {
      setChatLoading(false);
    }
  };

  const isAiLocked = !aiEntitled || (aiTokenBalance ?? 0) <= 0;
  const search = searchParams?.toString() ?? "";
  const currentRoute = `${pathname}${search ? `?${search}` : ""}`;
  const billingHref = `/app/settings/billing?returnTo=${encodeURIComponent(currentRoute)}`;

  return (
    <section className="card form-stack">
      <div className="feature-card">
        <strong>{t("coach.surfaceTitle")}</strong>
        <p className="muted" style={{ marginTop: 6 }}>
          {t("coach.surfaceSubtitle")}
        </p>
      </div>

      {isAiLocked ? (
        <div className="feature-card">
          <strong>{t("pro.aiLockedTitle")}</strong>
          <p className="muted" style={{ marginTop: 6 }}>
            {aiEntitled ? t("pro.aiLockedSubtitle") : t("ai.notPro")}
          </p>
        </div>
      ) : null}

      <div className="feature-card">
        <strong>{t("coach.chatTitle")}</strong>
        <p className="muted" style={{ marginTop: 6 }}>
          {t("coach.chatSubtitle")}
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            placeholder={t("coach.chatPlaceholder")}
            aria-label={t("coach.chatInputAria")}
            rows={4}
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
              {chatLoading ? t("coach.chatSending") : t("coach.chatSend")}
            </button>
          </div>
        </div>

        {chatReply ? (
          <article className="feed-item" style={{ marginTop: 12 }}>
            <div>
              <h3>{chatReply.title ?? t("coach.chatReplyTitle")}</h3>
              <p>{chatReply.message}</p>
            </div>
            {chatReply.suggestions?.length ? (
              <p className="muted">{chatReply.suggestions.join(" • ")}</p>
            ) : null}
            {chatUsage ? (
              <p className="muted">
                {t("coach.chatUsage", {
                  tokens: chatUsage.totalTokens,
                  eur: (chatCostEur ?? 0).toFixed(2),
                })}
              </p>
            ) : null}
          </article>
        ) : null}
      </div>

      <div className="feature-card">
        <strong>{t("coach.examplesTitle")}</strong>
        <p className="muted" style={{ marginTop: 6 }}>
          {t("coach.examplesBody")}
        </p>
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
    </section>
  );
}
