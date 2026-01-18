"use client";

import { useEffect, useState, type FormEvent } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  emailVerified: boolean;
  method: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type UsersResponse = {
  total: number;
  page: number;
  pageSize: number;
  users: UserRow[];
};

type MeResponse = {
  role?: string;
};

export default function AdminUsersClient() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"USER" | "ADMIN">("USER");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    const response = await fetch(`/api/admin/users?query=${encodeURIComponent(query)}&page=${page}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as UsersResponse;
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    const check = async () => {
      const me = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = (await me.json()) as MeResponse;
      if (!me.ok || meData.role !== "ADMIN") {
        if (active) {
          setUnauthorized(true);
          setLoading(false);
        }
        return;
      }
      if (active) {
        void loadUsers();
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [page]);

  async function updateBlock(userId: string, block: boolean) {
    const endpoint = block ? "block" : "unblock";
    await fetch(`/api/admin/users/${userId}/${endpoint}`, { method: "PATCH" });
    await loadUsers();
  }

  async function verifyEmail(userId: string) {
    await fetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" });
    await loadUsers();
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateMessage(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createEmail,
        password: createPassword,
        role: createRole,
      }),
    });
    if (!response.ok) {
      setCreateMessage("No pudimos crear el usuario.");
      return;
    }
    setCreateMessage("Usuario creado.");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("USER");
    await loadUsers();
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetUser) return;
    setResetMessage(null);
    const response = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: resetPassword }),
    });
    if (!response.ok) {
      setResetMessage("No pudimos resetear la contraseña.");
      return;
    }
    setResetMessage("Contraseña actualizada.");
    setResetPassword("");
    setResetUser(null);
    await loadUsers();
  }

  async function removeUser(userId: string) {
    const ok = window.confirm("Eliminar este usuario?");
    if (!ok) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    await loadUsers();
  }

  if (unauthorized) {
    return <p className="muted">No tienes acceso a esta sección.</p>;
  }

  return (
    <div className="form-stack">
      <section className="card">
        <h2 className="section-title" style={{ fontSize: 18 }}>Crear usuario</h2>
        <form className="form-stack" onSubmit={createUser}>
          <label className="muted">Email</label>
          <input
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            placeholder="correo@dominio.com"
            required
            type="email"
          />
          <label className="muted">Contraseña</label>
          <input
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            type="password"
          />
          <label className="muted">Rol</label>
          <select value={createRole} onChange={(e) => setCreateRole(e.target.value as "USER" | "ADMIN")}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button type="submit" className="btn">Crear usuario</button>
          {createMessage && <p className="muted">{createMessage}</p>}
        </form>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por email o nombre"
        />
        <button type="button" className="btn secondary" onClick={() => { setPage(1); void loadUsers(); }}>
          Buscar
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando usuarios...</p>
      ) : (
        <div className="table-grid">
          <div className="feature-card">
            <div className="info-label">Total</div>
            <div className="info-value">{data?.total ?? 0}</div>
          </div>

          {data?.users.map((user) => (
            <div key={user.id} className="feature-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{user.email}</strong>
                <span className="muted">{user.method}</span>
              </div>
              <div className="muted">{user.name || "Sin nombre"}</div>
              <div className="badge-list" style={{ marginTop: 8 }}>
                <span className="badge">{user.role}</span>
                <span className="badge">{user.emailVerified ? "Verificado" : "No verificado"}</span>
                <span className="badge">{user.isBlocked ? "Bloqueado" : "Activo"}</span>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>
                Creado: {new Date(user.createdAt).toLocaleDateString()}
              </div>
              <div className="muted">
                Último acceso: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "-"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => updateBlock(user.id, !user.isBlocked)}
                >
                  {user.isBlocked ? "Desbloquear" : "Bloquear"}
                </button>
                {!user.emailVerified && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => verifyEmail(user.id)}
                  >
                    Verificar email
                  </button>
                )}
                <button type="button" className="btn secondary" onClick={() => { setResetUser(user); setResetMessage(null); }}>
                  Resetear contraseña
                </button>
                <button type="button" className="btn secondary" onClick={() => removeUser(user.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="btn secondary"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </button>
            <span className="muted">Página {page}</span>
            <button
              type="button"
              className="btn secondary"
              disabled={Boolean(data && page * data.pageSize >= data.total)}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {resetUser && (
        <dialog open style={{ padding: 20, borderRadius: 12, border: "1px solid #ccc" }}>
          <form onSubmit={submitResetPassword} className="form-stack">
            <strong>Resetear contraseña</strong>
            <p className="muted">{resetUser.email}</p>
            <label className="muted">Nueva contraseña</label>
            <input
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              type="password"
              required
              minLength={8}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn">Guardar</button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => { setResetUser(null); setResetPassword(""); }}
              >
                Cancelar
              </button>
            </div>
            {resetMessage && <p className="muted">{resetMessage}</p>}
          </form>
        </dialog>
      )}
    </div>
  );
}
