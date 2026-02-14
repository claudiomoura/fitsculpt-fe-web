"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

type LabStatus = "read-only" | "sem backend" | "beta";

type LabItem = {
  id: string;
  href: string;
  status: LabStatus;
};

const LAB_ITEMS: LabItem[] = [
  { id: "adminDashboard", href: "/app/admin", status: "read-only" },
  { id: "adminUsers", href: "/app/admin/users", status: "read-only" },
  { id: "adminGymRequests", href: "/app/admin/gym-requests", status: "sem backend" },
  { id: "trainerHome", href: "/app/trainer", status: "beta" },
  { id: "trainerExercises", href: "/app/trainer/exercises", status: "beta" },
  { id: "trainerExerciseCreate", href: "/app/trainer/exercises/new", status: "beta" },
  { id: "trainingLibrary", href: "/app/biblioteca/entrenamientos", status: "read-only" },
  { id: "recipeLibrary", href: "/app/biblioteca/recetas", status: "read-only" },
  { id: "nutrition", href: "/app/nutricion", status: "sem backend" },
  { id: "tracking", href: "/app/seguimiento", status: "read-only" },
  { id: "profile", href: "/app/profile", status: "read-only" },
];

function getStatusKey(status: LabStatus): "adminLabs.badgeReadOnly" | "adminLabs.badgeNoBackend" | "adminLabs.badgeBeta" {
  if (status === "read-only") return "adminLabs.badgeReadOnly";
  if (status === "sem backend") return "adminLabs.badgeNoBackend";
  return "adminLabs.badgeBeta";
}

export default function AdminLabsClient() {
  const { t } = useLanguage();
  const { isAdmin, isLoading, error } = useAccess();

  if (isLoading) {
    return <p className="muted">{t("adminLabs.loading")}</p>;
  }

  if (error) {
    return <p className="muted">{t("adminLabs.error")}</p>;
  }

  if (!isAdmin) {
    return <p className="muted">{t("adminLabs.unauthorized")}</p>;
  }

  if (LAB_ITEMS.length === 0) {
    return (
      <div className="form-stack">
        <h2 style={{ margin: 0 }}>{t("adminLabs.emptyTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("adminLabs.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <ul className="form-stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {LAB_ITEMS.map((item) => (
        <li key={item.id} className="feature-card" style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <strong>{t(`adminLabs.items.${item.id}.title`)}</strong>
            <span className="pill">{t(getStatusKey(item.status))}</span>
          </div>
          <p className="muted" style={{ margin: 0 }}>{t(`adminLabs.items.${item.id}.description`)}</p>
          <div>
            <Link href={item.href} className="btn secondary">
              {t("adminLabs.statusLabel")}: {t(getStatusKey(item.status))}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
