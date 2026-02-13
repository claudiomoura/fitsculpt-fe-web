"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserRoleFlags } from "@/lib/userCapabilities";
import { trainerApiCapabilities } from "@/lib/trainer/capabilities";
import type { ClientRow, LoadState } from "./types";

type AuthUser = Record<string, unknown>;
type ClientsResponse = { users?: ClientRow[] };

export default function TrainerHome() {
  const { t } = useLanguage();
  const [permissionState, setPermissionState] = useState<LoadState>("loading");
  const [clientsState, setClientsState] = useState<LoadState>("loading");
  const [canAccessTrainer, setCanAccessTrainer] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [createState, setCreateState] = useState<LoadState | "idle">("idle");

  const loadClients = useCallback(async () => {
    if (!trainerApiCapabilities.canListClients) {
      setClients([]);
      setClientsState("ready");
      return;
    }

    setClientsState("loading");
    try {
      const response = await fetch("/api/admin/users?page=1", { cache: "no-store" });
      if (!response.ok) {
        setClientsState("error");
        return;
      }
      const data = (await response.json()) as ClientsResponse;
      const list = Array.isArray(data.users) ? data.users : [];
      setClients(list.filter((client) => client.role !== "ADMIN"));
      setClientsState("ready");
    } catch {
      setClientsState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadPermission = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) setPermissionState("error");
          return;
        }
        const roleFlags = getUserRoleFlags((await response.json()) as AuthUser);
        if (!active) return;
        const canAccess = roleFlags.isTrainer || roleFlags.isAdmin;
        setCanAccessTrainer(canAccess);
        setPermissionState("ready");
        if (canAccess) void loadClients();
      } catch {
        if (active) setPermissionState("error");
      }
    };

    void loadPermission();
    return () => {
      active = false;
    };
  }, [loadClients]);

  const listBody = useMemo(() => {
    if (!trainerApiCapabilities.canListClients) {
      return <p className="muted">{t("trainer.notAvailable")}</p>;
    }

    if (clientsState === "loading") {
      return <p className="muted">{t("trainer.loading")}</p>;
    }
    if (clientsState === "error") {
      return (
        <div className="form-stack">
          <p className="muted">{t("trainer.clients.error")}</p>
          <button className="btn secondary" type="button" onClick={() => void loadClients()}>
            {t("trainer.retry")}
          </button>
        </div>
      );
    }
    if (!clients.length) {
      return <p className="muted">{t("trainer.clients.empty")}</p>;
    }

    return (
      <ul className="form-stack" aria-label={t("trainer.clients.title")}>
        {clients.map((client) => {
          const clientName = client.name?.trim() || client.email;
          return (
            <li key={client.id} className="card">
              <Link className="sidebar-link" href={`/app/trainer/clients/${client.id}`}>
                {clientName}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }, [clients, clientsState, loadClients, t]);

  const createClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trainerApiCapabilities.canCreateClient) return;

    setCreateState("loading");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role: "USER" }),
      });
      if (!response.ok) {
        setCreateState("error");
        return;
      }
      setCreateState("ready");
      setEmail("");
      setName("");
      setPassword("");
      await loadClients();
    } catch {
      setCreateState("error");
    }
  };

  if (permissionState === "loading") return <p className="muted">{t("trainer.loading")}</p>;
  if (permissionState === "error") return <p className="muted">{t("trainer.error")}</p>;
  if (!canAccessTrainer) {
    return (
      <div className="card form-stack">
        <p className="muted">{t("trainer.unauthorized")}</p>
        <Link className="btn secondary" href="/app">{t("trainer.backToDashboard")}</Link>
      </div>
    );
  }

  return (
    <div className="form-stack">
      <div className="card form-stack">
        <h2 style={{ margin: 0 }}>{t("trainer.modeTitle")}</h2>
        <p className="muted" style={{ margin: 0 }}>{t("trainer.viewingAsCoach")}</p>
      </div>

      <section className="card form-stack">
        <h3 style={{ margin: 0 }}>{t("trainer.clients.title")}</h3>
        {listBody}
      </section>

      <section className="card form-stack">
        <h3 style={{ margin: 0 }}>{t("auth.registerTitle")}</h3>
        {!trainerApiCapabilities.canCreateClient ? (
          <p className="muted">{t("trainer.notAvailable")}</p>
        ) : (
          <form className="form-stack" onSubmit={createClient}>
            <label className="muted" htmlFor="trainer-client-email">{t("auth.email")}</label>
            <input id="trainer-client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label className="muted" htmlFor="trainer-client-name">{t("auth.name")}</label>
            <input id="trainer-client-name" value={name} onChange={(e) => setName(e.target.value)} required />
            <label className="muted" htmlFor="trainer-client-password">{t("auth.password")}</label>
            <input id="trainer-client-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn" type="submit" disabled={createState === "loading"}>{t("auth.registerSubmit")}</button>
            {createState === "error" ? <p className="muted">{t("trainer.error")}</p> : null}
            {createState === "ready" ? <p className="muted">{t("auth.registerSuccess")}</p> : null}
          </form>
        )}
      </section>
    </div>
  );
}
