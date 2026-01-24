"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { getLocaleCode } from "@/lib/i18n";

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
  subscriptionPlan: "FREE" | "PRO";
  subscriptionStatus: string | null;
  provider: string;
  aiTokenBalance: number;
  aiTokenMonthlyAllowance: number;
  aiTokenRenewalAt: string | null;
  currentPeriodEnd: string | null;
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
  const { t, locale } = useLanguage();
  const localeCode = getLocaleCode(locale);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"USER" | "ADMIN">("USER");
  const [createPlan, setCreatePlan] = useState<"FREE" | "PRO">("FREE");
  const [createTokens, setCreateTokens] = useState("0");
  const [createAllowance, setCreateAllowance] = useState("0");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [planUpdates, setPlanUpdates] = useState<Record<string, "FREE" | "PRO">>({});
  const [planTopUpNow, setPlanTopUpNow] = useState<Record<string, boolean>>({});
  const [allowanceUpdates, setAllowanceUpdates] = useState<Record<string, string>>({});
  const [allowanceTopUpNow, setAllowanceTopUpNow] = useState<Record<string, boolean>>({});
  const [balanceUpdates, setBalanceUpdates] = useState<Record<string, string>>({});
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString(localeCode);
  };

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
    const tokenBalance = Number(createTokens);
    const allowance = Number(createAllowance);
    const aiTokenBalance = Number.isFinite(tokenBalance) && tokenBalance >= 0 ? tokenBalance : 0;
    const aiTokenMonthlyAllowance = Number.isFinite(allowance) && allowance >= 0 ? allowance : 0;
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createEmail,
        password: createPassword,
        role: createRole,
        subscriptionPlan: createPlan,
        aiTokenBalance,
        aiTokenMonthlyAllowance,
      }),
    });
    if (!response.ok) {
      setCreateMessage(t("admin.createUserError"));
      return;
    }
    setCreateMessage(t("admin.createUserSuccess"));
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("USER");
    setCreatePlan("FREE");
    setCreateTokens("0");
    setCreateAllowance("0");
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
      setResetMessage(t("admin.resetPasswordError"));
      return;
    }
    setResetMessage(t("admin.resetPasswordSuccess"));
    setResetPassword("");
    setResetUser(null);
    await loadUsers();
  }

  async function removeUser(userId: string) {
    const ok = window.confirm(t("admin.confirmDelete"));
    if (!ok) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    await loadUsers();
  }

  async function updatePlan(userId: string, subscriptionPlan: "FREE" | "PRO") {
    setActionUserId(userId);
    await fetch(`/api/admin/users/${userId}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionPlan, topUpNow: planTopUpNow[userId] ?? false }),
    });
    await loadUsers();
    window.dispatchEvent(new Event("auth:refresh"));
    setActionUserId(null);
  }

  async function updateAllowance(userId: string) {
    const value = allowanceUpdates[userId];
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return;
    setActionUserId(userId);
    await fetch(`/api/admin/users/${userId}/tokens-allowance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiTokenMonthlyAllowance: amount,
        topUpNow: allowanceTopUpNow[userId] ?? false,
      }),
    });
    await loadUsers();
    window.dispatchEvent(new Event("auth:refresh"));
    setActionUserId(null);
  }

  async function addTokens(userId: string, amount: number) {
    if (!Number.isFinite(amount) || amount < 0) return;
    setActionUserId(userId);
    await fetch(`/api/admin/users/${userId}/tokens/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    await loadUsers();
    window.dispatchEvent(new Event("auth:refresh"));
    setActionUserId(null);
  }

  async function setTokenBalance(userId: string) {
    const value = balanceUpdates[userId];
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return;
    setActionUserId(userId);
    await fetch(`/api/admin/users/${userId}/tokens/balance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiTokenBalance: amount }),
    });
    await loadUsers();
    window.dispatchEvent(new Event("auth:refresh"));
    setActionUserId(null);
  }

  const openEdit = (user: UserRow) => {
    setPlanUpdates((prev) => ({ ...prev, [user.id]: prev[user.id] ?? user.subscriptionPlan }));
    setAllowanceUpdates((prev) => ({ ...prev, [user.id]: prev[user.id] ?? String(user.aiTokenMonthlyAllowance) }));
    setBalanceUpdates((prev) => ({ ...prev, [user.id]: prev[user.id] ?? String(user.aiTokenBalance) }));
    setEditUser(user);
  };

  const closeEdit = () => {
    setEditUser(null);
  };

  if (unauthorized) {
    return <p className="muted">{t("admin.unauthorized")}</p>;
  }

  return (
    <div className="form-stack">
      <section className="card">
        <h2 className="section-title" style={{ fontSize: 18 }}>{t("admin.createUserTitle")}</h2>
        <form className="form-stack" onSubmit={createUser}>
          <label className="muted">{t("auth.email")}</label>
          <input
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            placeholder={t("admin.emailPlaceholder")}
            required
            type="email"
          />
          <label className="muted">{t("auth.password")}</label>
          <input
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            placeholder={t("admin.passwordPlaceholder")}
            required
            type="password"
          />
          <label className="muted">{t("admin.roleLabel")}</label>
          <select value={createRole} onChange={(e) => setCreateRole(e.target.value as "USER" | "ADMIN")}>
            <option value="USER">{t("admin.roleUser")}</option>
            <option value="ADMIN">{t("admin.roleAdmin")}</option>
          </select>
          <label className="muted">Plan</label>
          <select value={createPlan} onChange={(e) => setCreatePlan(e.target.value as "FREE" | "PRO")}>
            <option value="FREE">{t("admin.planFree")}</option>
            <option value="PRO">{t("admin.planPro")}</option>
          </select>
          <label className="muted">Tokens iniciales</label>
          <input
            value={createTokens}
            onChange={(e) => setCreateTokens(e.target.value)}
            type="number"
            min={0}
          />
          <label className="muted">Allowance mensual</label>
          <input
            value={createAllowance}
            onChange={(e) => setCreateAllowance(e.target.value)}
            type="number"
            min={0}
          />
          <button type="submit" className="btn">{t("admin.createUserAction")}</button>
          {createMessage && <p className="muted">{createMessage}</p>}
        </form>
      </section>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("admin.searchPlaceholder")}
        />
        <button type="button" className="btn secondary" onClick={() => { setPage(1); void loadUsers(); }}>
          {t("admin.searchAction")}
        </button>
      </div>

      {loading ? (
        <p className="muted">{t("admin.usersLoading")}</p>
      ) : (
        <div className="form-stack">
          <div className="feature-card">
            <div className="info-label">{t("admin.totalUsers")}</div>
            <div className="info-value">{data?.total ?? 0}</div>
          </div>

          {data?.users.map((user) => (
            <div key={user.id} className="feature-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{user.email}</strong>
                  <div className="muted">{user.name || t("admin.noName")}</div>
                  <div className="badge-list" style={{ marginTop: 8 }}>
                    <span className="badge">{user.role}</span>
                    <span className="badge">{user.subscriptionPlan}</span>
                    <span className="badge">{user.provider || user.method}</span>
                    <span className="badge">
                      {user.subscriptionStatus ?? "-"}
                    </span>
                  </div>
                </div>
                <button type="button" className="btn secondary" onClick={() => openEdit(user)}>
                  Editar
                </button>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>
                {t("admin.createdAt")}: {new Date(user.createdAt).toLocaleDateString(localeCode)}
              </div>
              <div className="muted">
                {t("admin.lastLogin")}: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(localeCode) : "-"}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                {t("admin.subscriptionPlanLabel")}: {user.subscriptionPlan} · {user.subscriptionStatus ?? "-"}
              </div>
              <div className="muted">
                Tokens: {user.aiTokenBalance} · Allowance: {user.aiTokenMonthlyAllowance}
              </div>
              <div className="muted">
                Renovación cuenta: {formatDate(user.currentPeriodEnd)} · Renovación tokens: {formatDate(user.aiTokenRenewalAt)}
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
              {t("admin.paginationPrev")}
            </button>
            <span className="muted">{t("admin.paginationLabel")} {page}</span>
            <button
              type="button"
              className="btn secondary"
              disabled={Boolean(data && page * data.pageSize >= data.total)}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {t("admin.paginationNext")}
            </button>
          </div>
        </div>
      )}

      {resetUser && (
        <dialog open style={{ padding: 20, borderRadius: 12, border: "1px solid var(--border)" }}>
          <form onSubmit={submitResetPassword} className="form-stack">
            <strong>{t("admin.resetPassword")}</strong>
            <p className="muted">{resetUser.email}</p>
            <label className="muted">{t("admin.newPassword")}</label>
            <input
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              type="password"
              required
              minLength={8}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn">{t("ui.save")}</button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => { setResetUser(null); setResetPassword(""); }}
              >
                {t("ui.cancel")}
              </button>
            </div>
            {resetMessage && <p className="muted">{resetMessage}</p>}
          </form>
        </dialog>
      )}

      {editUser && (
        <dialog open style={{ padding: 20, borderRadius: 12, border: "1px solid var(--border)", maxWidth: 640 }}>
          <div className="form-stack">
            <div>
              <strong>Editar usuario</strong>
              <p className="muted">{editUser.email}</p>
            </div>

            <div>
              <div className="muted" style={{ fontSize: 12 }}>{t("admin.subscriptionPlanLabel")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={planUpdates[editUser.id] ?? editUser.subscriptionPlan}
                  onChange={(e) => setPlanUpdates((prev) => ({
                    ...prev,
                    [editUser.id]: e.target.value as "FREE" | "PRO",
                  }))}
                >
                  <option value="FREE">{t("admin.planFree")}</option>
                  <option value="PRO">{t("admin.planPro")}</option>
                </select>
                <label className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={planTopUpNow[editUser.id] ?? false}
                    onChange={(e) =>
                      setPlanTopUpNow((prev) => ({ ...prev, [editUser.id]: e.target.checked }))
                    }
                  />
                  Recargar ahora
                </label>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => updatePlan(editUser.id, planUpdates[editUser.id] ?? editUser.subscriptionPlan)}
                  disabled={actionUserId === editUser.id}
                >
                  {t("admin.updatePlan")}
                </button>
              </div>
            </div>

            <div>
              <div className="muted" style={{ fontSize: 12 }}>{t("admin.tokensAllowanceLabel")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={allowanceUpdates[editUser.id] ?? String(editUser.aiTokenMonthlyAllowance)}
                  onChange={(e) => setAllowanceUpdates((prev) => ({ ...prev, [editUser.id]: e.target.value }))}
                  type="number"
                  min={0}
                />
                <label className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={allowanceTopUpNow[editUser.id] ?? false}
                    onChange={(e) =>
                      setAllowanceTopUpNow((prev) => ({ ...prev, [editUser.id]: e.target.checked }))
                    }
                  />
                  Recargar ahora
                </label>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => updateAllowance(editUser.id)}
                  disabled={actionUserId === editUser.id}
                >
                  {t("admin.updateAllowance")}
                </button>
              </div>
            </div>

            <div>
              <div className="muted" style={{ fontSize: 12 }}>{t("admin.tokensBalanceLabel")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => addTokens(editUser.id, 100)}
                  disabled={actionUserId === editUser.id}
                >
                  +100
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => addTokens(editUser.id, 500)}
                  disabled={actionUserId === editUser.id}
                >
                  +500
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                <input
                  value={balanceUpdates[editUser.id] ?? String(editUser.aiTokenBalance)}
                  onChange={(e) => setBalanceUpdates((prev) => ({ ...prev, [editUser.id]: e.target.value }))}
                  type="number"
                  min={0}
                />
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setTokenBalance(editUser.id)}
                  disabled={actionUserId === editUser.id}
                >
                  {t("admin.tokensSet")}
                </button>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {t("admin.tokensCurrent")}: {editUser.aiTokenBalance}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => updateBlock(editUser.id, !editUser.isBlocked)}
              >
                {editUser.isBlocked ? t("admin.actionUnblock") : t("admin.actionBlock")}
              </button>
              {!editUser.emailVerified && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => verifyEmail(editUser.id)}
                >
                  {t("admin.verifyEmail")}
                </button>
              )}
              <button
                type="button"
                className="btn secondary"
                onClick={() => { setResetUser(editUser); setResetMessage(null); }}
              >
                {t("admin.resetPassword")}
              </button>
              <button type="button" className="btn secondary" onClick={() => removeUser(editUser.id)}>
                {t("admin.actionDelete")}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn secondary" onClick={closeEdit}>
                {t("ui.close")}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
