"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/context/LanguageProvider";

export default function SettingsPasswordPage() {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordLoading(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordLoading(false);
    if (!response.ok) {
      setPasswordMessage(t("profile.passwordError"));
      return;
    }
    setPasswordMessage(t("profile.passwordSuccess"));
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="page profile-edit-shell">
      <section className="card profile-edit-hero">
        <div className="profile-edit-hero-head">
          <div className="profile-edit-badge">Cuenta</div>
          <h1 className="section-title">{t("profile.passwordTitle")}</h1>
          <p className="section-subtitle">{t("profile.passwordSubtitle")}</p>
        </div>
      </section>
      <section className="card profile-edit-section">
        <form className="form-stack" onSubmit={handleChangePassword}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label className="form-stack">
              {t("profile.currentPassword")}
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required minLength={8} />
            </label>
            <label className="form-stack">
              {t("profile.newPassword")}
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </label>
          </div>
          <div className="inline-actions-sm">
            <button type="submit" className="btn" disabled={passwordLoading}>
              {passwordLoading ? t("profile.passwordSaving") : t("profile.passwordUpdate")}
            </button>
            <a className="btn secondary" href="/app/settings">{t("onboarding.back")}</a>
          </div>
          {passwordMessage ? <p className="muted">{passwordMessage}</p> : null}
        </form>
      </section>
    </div>
  );
}
