"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/i18n";

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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FeedClient() {
  const c = copy.es;
  const [items, setItems] = useState<FeedPost[]>([]);
  const [tip, setTip] = useState<DailyTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/feed", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("No pudimos cargar el feed.");
      }
      const data = (await response.json()) as FeedPost[];
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/feed/generate", { method: "POST", credentials: "include" });
      if (!response.ok) {
        throw new Error("No pudimos generar el resumen.");
      }
      const post = (await response.json()) as FeedPost;
      setItems((prev) => [post, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setGenerating(false);
    }
  };

  const handleTip = async () => {
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
        throw new Error(c.app.tipError);
      }
      const data = (await response.json()) as DailyTip;
      setTip(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.app.tipError);
    } finally {
      setTipLoading(false);
    }
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h2 className="section-title">{c.app.feedSectionTitle}</h2>
          <p className="section-subtitle">{c.app.feedSectionSubtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={handleGenerate} disabled={generating}>
            {generating ? c.app.feedGenerating : c.app.feedGenerate}
          </button>
          <button className="btn secondary" type="button" onClick={handleTip} disabled={tipLoading}>
            {tipLoading ? c.app.tipGenerating : c.app.tipGenerate}
          </button>
        </div>
      </div>

      {error ? <p className="muted">{error}</p> : null}
      {loading ? <p className="muted">{c.app.feedLoading}</p> : null}
      {!loading && items.length === 0 ? (
        <p className="muted">{c.app.feedEmpty}</p>
      ) : null}

      <div className="feed-list">
        {tip ? (
          <article className="feed-item">
            <div>
              <h3>{tip.title}</h3>
              <p className="muted">{c.app.tipSubtitle}</p>
            </div>
            <p>{tip.message}</p>
          </article>
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="feed-item">
            <div>
              <h3>{item.title}</h3>
              <p className="muted">{formatDate(item.createdAt)}</p>
            </div>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
