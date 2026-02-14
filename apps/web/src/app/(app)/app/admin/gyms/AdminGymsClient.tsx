"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Gym = {
  id: string;
  name: string;
  code: string;
  membersCount: number;
};

type Member = {
  user: { id: string; email: string; name: string | null };
  status: "ACTIVE" | "PENDING" | "REJECTED";
  role: "MEMBER" | "TRAINER" | "ADMIN";
};

export default function AdminGymsClient() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGyms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gyms", { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error("gyms");
      const data = (await res.json()) as Gym[];
      setGyms(data);
      setSelectedGymId((current) => current || data[0]?.id || "");
    } catch {
      setError("No pudimos cargar gimnasios.");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (gymId: string) => {
    if (!gymId) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/admin/gyms/${gymId}/members`, { cache: "no-store", credentials: "include" });
      if (!res.ok) throw new Error("members");
      const data = (await res.json()) as Member[];
      setMembers(data);
    } catch {
      setMembers([]);
      setError("No pudimos cargar miembros.");
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    void loadGyms();
  }, []);

  useEffect(() => {
    void loadMembers(selectedGymId);
  }, [selectedGymId]);

  const createGym = async () => {
    if (!name.trim()) return;
    setError(null);
    setCreatedCode(null);

    try {
      const res = await fetch("/api/admin/gyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("create");
      const created = (await res.json()) as { id: string; code: string };
      setCreatedCode(created.code);
      setName("");
      await loadGyms();
      setSelectedGymId(created.id);
    } catch {
      setError("No pudimos crear el gimnasio.");
    }
  };

  const setTrainerRole = async (userId: string) => {
    if (!selectedGymId) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/gyms/${selectedGymId}/members/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: "TRAINER", status: "ACTIVE" }),
      });
      if (!res.ok) throw new Error("role");
      await loadMembers(selectedGymId);
    } catch {
      setError("No pudimos asignar rol TRAINER.");
    }
  };

  return (
    <div className="page form-stack">
      <section className="card form-stack">
        <h1 className="section-title">Administrar gimnasios</h1>
        <label className="form-stack">
          Nombre
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nuevo gym" />
        </label>
        <Button onClick={() => void createGym()} disabled={!name.trim()}>
          Crear gimnasio
        </Button>
        {createdCode ? <p className="muted">Código de ingreso: <strong>{createdCode}</strong></p> : null}
      </section>

      <section className="card form-stack">
        <h2 className="section-title section-title-sm">Gimnasios</h2>
        {loading ? <p className="muted">Cargando...</p> : null}
        {!loading && gyms.length === 0 ? <p className="muted">No hay gimnasios.</p> : null}
        {!loading && gyms.length > 0 ? (
          <select value={selectedGymId} onChange={(event) => setSelectedGymId(event.target.value)}>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name} ({gym.membersCount})
              </option>
            ))}
          </select>
        ) : null}
      </section>

      <section className="card form-stack">
        <h2 className="section-title section-title-sm">Miembros</h2>
        {membersLoading ? <p className="muted">Cargando miembros...</p> : null}
        {!membersLoading && members.length === 0 ? <p className="muted">No hay miembros.</p> : null}
        {!membersLoading && members.length > 0
          ? members.map((member) => (
              <div key={member.user.id} className="status-card" style={{ marginTop: 8 }}>
                <strong>{member.user.name ?? member.user.email}</strong>
                <p className="muted" style={{ margin: 0 }}>
                  {member.user.email} · {member.status} · {member.role}
                </p>
                <Button onClick={() => void setTrainerRole(member.user.id)} disabled={member.role === "TRAINER"}>
                  Convertir a TRAINER
                </Button>
              </div>
            ))
          : null}
      </section>

      {error ? (
        <section className="card status-card status-card--warning">
          <p className="muted">{error}</p>
        </section>
      ) : null}
    </div>
  );
}
