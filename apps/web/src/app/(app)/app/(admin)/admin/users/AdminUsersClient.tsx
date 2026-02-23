"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  DenseTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadCell,
  DenseTableRow,
  ProHeader,
} from "@/design-system/components";
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
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  async function loadUsers() {
    setLoading(true);
    const response = await fetch(`/api/admin/users?query=${encodeURIComponent(query)}&page=${page}`, {
      cache: "no-store",
      credentials: "include",
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
    await fetch(`/api/admin/users/${userId}/${endpoint}`, {
      method: "PATCH",
      credentials: "include",
    });
    await loadUsers();
  }

  async function verifyEmail(userId: string) {
    await fetch(`/api/admin/users/${userId}/verify-email`, {
      method: "POST",
      credentials: "include",
    });
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
      credentials: "include",
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
      credentials: "include",
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
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
    await loadUsers();
  }

  const openEdit = (user: UserRow) => {
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
      <ProHeader
        title={t("admin.management")}
        subtitle={t("admin.actionsHint")}
        compact
      />

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
          <label className="muted">{t("admin.subscriptionPlanLabel")}</label>
          <select value={createPlan} onChange={(e) => setCreatePlan(e.target.value as "FREE" | "PRO")}>
            <option value="FREE">{t("admin.planFree")}</option>
            <option value="PRO">{t("admin.planPro")}</option>
          </select>
          <label className="muted">{t("admin.tokensBalanceLabel")}</label>
          <input
            value={createTokens}
            onChange={(e) => setCreateTokens(e.target.value)}
            type="number"
            min={0}
          />
          <label className="muted">{t("admin.tokensAllowanceLabel")}</label>
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

          <DenseTable aria-label={t("admin.management")}>
            <DenseTableHead>
              <DenseTableRow>
                <DenseTableHeadCell>{t("auth.email")}</DenseTableHeadCell>
                <DenseTableHeadCell>{t("admin.roleLabel")}</DenseTableHeadCell>
                <DenseTableHeadCell>{t("admin.subscriptionPlanLabel")}</DenseTableHeadCell>
                <DenseTableHeadCell>{t("admin.tokensBalanceLabel")}</DenseTableHeadCell>
                <DenseTableHeadCell>{t("admin.lastLogin")}</DenseTableHeadCell>
                <DenseTableHeadCell className="text-right">{t("admin.actions")}</DenseTableHeadCell>
              </DenseTableRow>
            </DenseTableHead>
            <DenseTableBody>
              {data?.users.map((user) => (
                <DenseTableRow key={user.id} interactive>
                  <DenseTableCell>
                    <div className="form-stack" style={{ gap: 2 }}>
                      <strong>{user.email}</strong>
                      <span className="muted">{user.name || t("admin.noName")}</span>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="badge-list" style={{ marginTop: 0 }}>
                      <span className="badge">{user.role}</span>
                      <span className="badge">{user.provider || user.method}</span>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="form-stack" style={{ gap: 2 }}>
                      <span>{user.subscriptionPlan}</span>
                      <span className="muted">{user.subscriptionStatus ?? "-"}</span>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell>
                    <span>{user.aiTokenBalance}</span>
                    <span className="muted"> / {user.aiTokenMonthlyAllowance}</span>
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="form-stack" style={{ gap: 2 }}>
                      <span>{new Date(user.createdAt).toLocaleDateString(localeCode)}</span>
                      <span className="muted">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(localeCode) : "-"}</span>
                    </div>
                  </DenseTableCell>
                  <DenseTableCell className="text-right">
                    <button type="button" className="btn secondary" onClick={() => openEdit(user)}>
                      {t("ui.edit")}
                    </button>
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseTable>

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
              <strong>{t("ui.edit")}</strong>
              <p className="muted">{editUser.email}</p>
            </div>

            <div className="feature-card" style={{ gap: 8 }}>
              <div className="muted" style={{ fontSize: 12 }}>{t("admin.subscriptionPlanLabel")}</div>
              <div>{editUser.subscriptionPlan}</div>
              <div className="muted" style={{ fontSize: 12 }}>{t("admin.tokensBalanceLabel")}</div>
              <div>{editUser.aiTokenBalance}</div>
              <div className="muted" style={{ fontSize: 12 }}>{t("admin.tokensAllowanceLabel")}</div>
              <div>{editUser.aiTokenMonthlyAllowance}</div>
              <div className="status-card">
                <strong>{t("access.notAvailableTitle")}</strong>
                <p className="muted">{t("access.notAvailableDescription")}</p>
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
