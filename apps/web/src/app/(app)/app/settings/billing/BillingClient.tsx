"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  return Number.isNaN(date.getTime()) ? "-" : formatter.format(date);
};

type BillingProfile = {
  subscriptionPlan?: "FREE" | "PRO";
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  aiTokenBalance?: number;
  aiTokenMonthlyAllowance?: number;
  aiTokenRenewalAt?: string | null;
};

type BillingAction = "checkout" | "portal" | null;

export default function BillingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<BillingAction>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const shouldSync = searchParams.get("checkout") === "success";
        const response = await fetch(`/api/billing/status${shouldSync ? "?sync=1" : ""}`, { cache: "no-store" });
        if (!response.ok) {
          setError("No pudimos cargar tu estado de suscripción.");
          return;
        }
        const data = (await response.json()) as BillingProfile;
        setProfile(data);
        if (shouldSync) {
          router.replace("/app/settings/billing");
        }
      } catch {
        setError("No pudimos cargar tu estado de suscripción.");
      } finally {
        setLoading(false);
      }
    };
    void loadProfile();
  }, [router, searchParams]);

  const handleCheckout = async () => {
    setAction("checkout");
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string };
      if (!response.ok || !data.url) {
        setError("No pudimos iniciar el checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("No pudimos iniciar el checkout.");
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
        setError("No pudimos abrir el portal de facturación.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("No pudimos abrir el portal de facturación.");
    } finally {
      setAction(null);
    }
  };

  return (
    <section className="card">
      <h1 className="section-title">Facturación</h1>
      <p className="section-subtitle">Gestiona tu suscripción y acceso a PRO.</p>

      {loading ? (
        <p className="muted">Cargando estado de suscripción...</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Plan actual
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{profile?.subscriptionPlan ?? "FREE"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Estado de Stripe
                </div>
                <div>{profile?.subscriptionStatus ?? "-"}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Próxima renovación
                </div>
                <div>{formatDate(profile?.currentPeriodEnd)}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Tokens IA disponibles
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{profile?.aiTokenBalance ?? 0}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Tokens mensuales
                </div>
                <div>{profile?.aiTokenMonthlyAllowance ?? 0}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Renovación de tokens
                </div>
                <div>{formatDate(profile?.aiTokenRenewalAt)}</div>
              </div>
            </div>
          </div>

          {error ? <p className="muted">{error}</p> : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={handleCheckout} disabled={action === "checkout"}>
              {action === "checkout" ? "Redirigiendo..." : "Mejorar a PRO"}
            </button>
            <button type="button" className="btn secondary" onClick={handlePortal} disabled={action === "portal"}>
              {action === "portal" ? "Abriendo..." : "Gestionar suscripción"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
