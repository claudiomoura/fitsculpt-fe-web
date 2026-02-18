"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";

type Gym = { id: string; name: string };
type Member = { user?: { id?: string; name?: string | null; email?: string | null }; status?: string };

function parseGyms(payload: unknown): Gym[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      const row = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const id = typeof row.id === "string" ? row.id : null;
      const name = typeof row.name === "string" ? row.name : null;
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((row): row is Gym => Boolean(row));
}

export default function TrainerAdminNoGymPanel() {
  const { t } = useLanguage();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    let active = true;
    const loadGyms = async () => {
      setLoadingGyms(true);
      try {
        const response = await fetch("/api/admin/gyms", { cache: "no-store", credentials: "include" });
        if (!response.ok) {
          if (active) setGyms([]);
          return;
        }
        const payload = (await response.json()) as unknown;
        if (!active) return;
        const parsed = parseGyms(payload);
        setGyms(parsed);
        setSelectedGymId(parsed[0]?.id ?? "");
      } catch (_err) {
        if (active) setGyms([]);
      } finally {
        if (active) setLoadingGyms(false);
      }
    };

    void loadGyms();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadMembers = async () => {
      if (!selectedGymId) {
        setMembers([]);
        return;
      }
      setLoadingMembers(true);
      try {
        const response = await fetch(`/api/admin/gyms/${selectedGymId}/members`, { cache: "no-store", credentials: "include" });
        if (!response.ok) {
          if (active) setMembers([]);
          return;
        }
        const payload = (await response.json()) as unknown;
        if (!active) return;
        const rows = Array.isArray(payload) ? payload : [];
        setMembers(rows as Member[]);
      } catch (_err) {
        if (active) setMembers([]);
      } finally {
        if (active) setLoadingMembers(false);
      }
    };

    void loadMembers();
    return () => {
      active = false;
    };
  }, [selectedGymId]);

  return (
    <section className="card form-stack">
      <h2 className="section-title" style={{ fontSize: 20 }}>{t("trainer.adminNoGym.title")}</h2>
      <p className="muted" style={{ margin: 0 }}>{t("trainer.adminNoGym.description")}</p>

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <Link className="btn secondary" href="/app/admin/gyms">{t("trainer.adminNoGym.goToGyms")}</Link>
        <Link className="btn secondary" href="/app/admin/gym-requests">{t("trainer.adminNoGym.goToGymRequests")}</Link>
      </div>

      <div className="form-stack">
        <h3 style={{ margin: 0 }}>{t("trainer.adminNoGym.membersByGymTitle")}</h3>
        {loadingGyms ? <p className="muted">{t("common.loading")}</p> : null}
        {!loadingGyms && gyms.length === 0 ? <p className="muted">{t("trainer.adminNoGym.noGyms")}</p> : null}

        {!loadingGyms && gyms.length > 0 ? (
          <label className="form-stack" style={{ gap: 8 }}>
            <span className="muted">{t("trainer.adminNoGym.selectGym")}</span>
            <select value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
              {gyms.map((gym) => (
                <option key={gym.id} value={gym.id}>{gym.name}</option>
              ))}
            </select>
          </label>
        ) : null}

        {selectedGymId ? (
          <>
            {loadingMembers ? <p className="muted">{t("common.loading")}</p> : null}
            {!loadingMembers && members.length === 0 ? <p className="muted">{t("trainer.adminNoGym.noMembers")}</p> : null}
            {!loadingMembers && members.length > 0 ? (
              <ul className="form-stack" aria-label={t("trainer.adminNoGym.membersByGymTitle")}>
                {members.map((member) => {
                  const user = member.user ?? {};
                  const label = user.name ?? user.email ?? "-";
                  return (
                    <li key={user.id ?? `${label}-${member.status ?? "unknown"}`} className="feature-card">
                      <strong>{label}</strong>
                      {member.status ? <p className="muted" style={{ margin: 0 }}>{member.status}</p> : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
