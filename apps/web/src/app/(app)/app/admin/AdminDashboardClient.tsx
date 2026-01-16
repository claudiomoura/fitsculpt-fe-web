"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminSummary = {
  total?: number;
};

type MeResponse = {
  role?: string;
};

export default function AdminDashboardClient() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const me = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = (await me.json()) as MeResponse;
      if (!me.ok || meData.role !== "ADMIN") {
        if (active) {
          setUnauthorized(true);
          setLoading(false);
        }
        return;
      }

      const response = await fetch("/api/admin/users?page=1", { cache: "no-store" });
      if (!response.ok) {
        if (active) setLoading(false);
        return;
      }
      const data = (await response.json()) as { total: number };
      if (active) {
        setSummary({ total: data.total });
        setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (unauthorized) {
    return <p className="muted">No tienes acceso a esta sección.</p>;
  }

  if (loading) {
    return <p className="muted">Cargando panel...</p>;
  }

  return (
    <div className="list-grid">
      <div className="feature-card">
        <div className="info-label">Total de usuarios</div>
        <div className="info-value">{summary?.total ?? 0}</div>
      </div>
      <div className="feature-card">
        <div className="info-label">Gestión</div>
        <Link href="/app/admin/users" className="btn secondary">
          Ver usuarios
        </Link>
      </div>
      <div className="feature-card">
        <div className="info-label">Acciones</div>
        <p className="muted">Bloquea, desbloquea o elimina cuentas desde la lista.</p>
      </div>
    </div>
  );
}
