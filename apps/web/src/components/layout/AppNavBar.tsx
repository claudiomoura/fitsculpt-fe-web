"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import AppUserBadge from "./AppUserBadge";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { buildNavigationSections } from "./navConfig";
import { useAccess } from "@/lib/useAccess";

type AuthUser = {
  name?: string | null;
  email?: string | null;
  subscriptionPlan?: "FREE" | "PRO";
  aiTokenBalance?: number;
} & Record<string, unknown>;

type BillingStatus = {
  plan?: "FREE" | "PRO";
  isPro?: boolean;
  tokens?: number;
};

export default function AppNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const { role, isAdmin, isCoach, isDev } = useAccess();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [authResponse, billingResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/billing/status", { cache: "no-store" }),
        ]);
        if (authResponse.ok) {
          const data = (await authResponse.json()) as AuthUser;
          if (active) setUser(data);
        }
        if (billingResponse.ok) {
          const data = (await billingResponse.json()) as BillingStatus;
          if (active) setBilling(data);
        }
      } catch {
        // Ignore.
      }
    };
    const handleRefresh = () => {
      if (!active) return;
      void load();
    };
    window.addEventListener("auth:refresh", handleRefresh);
    void load();
    return () => {
      active = false;
      window.removeEventListener("auth:refresh", handleRefresh);
    };
  }, []);

  const userRole = typeof user?.role === "string" ? user.role : "";
  const userMeta = user?.email || userRole || "";
  const planLabel = billing?.plan ?? user?.subscriptionPlan ?? "FREE";
  const isPro = planLabel === "PRO";
  const tokenBalance = billing?.tokens ?? user?.aiTokenBalance ?? 0;

  const sections = useMemo(() => buildNavigationSections({ role, isAdmin, isCoach, isDev }), [role, isCoach, isAdmin, isDev]);

  const closeMenu = () => setOpen(false);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          {t("appName")}
        </Link>

        <div className="nav-actions">
  <AppUserBadge />

  <div className={`account-pill ${isPro ? "is-pro" : "is-free"}`}>
    <span className="account-pill-label">{planLabel}</span>
    {isPro ? <span className="account-pill-meta">{t("ui.tokensLabel")} {tokenBalance}</span> : null}
  </div>

  <div className="nav-utility">
    <ThemeToggle />
    <LanguageSwitcher />
  </div>

  <button
    type="button"
    className="nav-toggle"
    aria-expanded={open}
    aria-controls="app-nav-drawer"
    aria-label={open ? t("ui.close") : t("ui.menu")}
    onClick={() => setOpen((prev) => !prev)}
  >
    <span aria-hidden="true">{open ? "✕" : "☰"}</span>
    <span className="nav-toggle-label">{open ? t("ui.close") : t("ui.menu")}</span>
  </button>
</div>
      </div>

      <div
        className={`nav-drawer-backdrop ${open ? "is-open" : ""}`}
        role="presentation"
        onClick={closeMenu}
      />
      <aside
        id="app-nav-drawer"
        className={`nav-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="nav-drawer-header">
          <div>
            <p className="nav-drawer-title">{t("appName")}</p>
            <p className="nav-drawer-user">{user?.name || t("ui.userFallback")}</p>
            {userMeta ? <p className="nav-drawer-user-meta">{userMeta}</p> : null}
          </div>
          <button type="button" className="nav-toggle" onClick={closeMenu}>
            {t("ui.close")}
          </button>
        </div>

        <div className="nav-drawer-content">
          {sections.map((section) => {
            if (section.id === "account") {
              return (
                <div key={section.id} className="nav-drawer-section">
                  <p className="nav-drawer-section-title">{t(section.labelKey)}</p>
                  <div className="nav-drawer-links">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`nav-drawer-link ${active ? "is-active" : ""}`}
                          aria-current={active ? "page" : undefined}
                          onClick={closeMenu}
                        >
                          <span>{t(item.labelKey)}</span>
                          {item.meta ? <span className="text-xs text-[var(--text-muted)]">{item.meta}</span> : null}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="nav-drawer-controls">
                    <ThemeToggle showLabel />
                    <LanguageSwitcher showLabel />
                  </div>
                </div>
              );
            }

            return (
              <div key={section.id} className="nav-drawer-section">
                <p className="nav-drawer-section-title">{t(section.labelKey)}</p>
                <div className="nav-drawer-links">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`nav-drawer-link ${active ? "is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={closeMenu}
                      >
                        <span>{t(item.labelKey)}</span>
                        {item.meta ? <span className="text-xs text-[var(--text-muted)]">{item.meta}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </header>
  );
}
