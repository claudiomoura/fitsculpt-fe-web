"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/app/(app)/app/LogoutButton";
import { useLanguage } from "@/context/LanguageProvider";
import AppUserBadge from "./AppUserBadge";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { NAV_ITEMS, NAV_SECTIONS } from "./navConfig";

type AuthUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  subscriptionPlan?: "FREE" | "PRO";
  aiTokenBalance?: number;
};

export default function AppNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as AuthUser;
        if (active) setUser(data);
      } catch {
        // Ignore.
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const isAdmin = user?.role === "ADMIN";
  const userMeta = user?.email || user?.role || "";
  const isPro = user?.subscriptionPlan === "PRO";
  const planLabel = user?.subscriptionPlan ?? "FREE";

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

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
          <div className="nav-utility">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
          <div className={`account-pill ${isPro ? "is-pro" : "is-free"}`}>
            <span className="account-pill-label">{planLabel}</span>
            {isPro ? <span className="account-pill-meta">Tokens: {user?.aiTokenBalance ?? 0}</span> : null}
          </div>
          <AppUserBadge />
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
          {NAV_SECTIONS.map((section) => {
            const sectionItems = visibleItems.filter((item) => item.section === section.id);
            if (sectionItems.length === 0) return null;
            if (section.id === "account") {
              return (
                <div key={section.id} className="nav-drawer-section">
                  <p className="nav-drawer-section-title">{t(section.labelKey)}</p>
                  <div className="nav-drawer-links">
                    {sectionItems.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`nav-drawer-link ${active ? "is-active" : ""}`}
                          aria-current={active ? "page" : undefined}
                          onClick={closeMenu}
                        >
                          {t(item.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="nav-drawer-controls">
                    <ThemeToggle showLabel />
                    <LanguageSwitcher showLabel />
                  </div>
                  <div className="nav-drawer-actions">
                    <LogoutButton />
                  </div>
                </div>
              );
            }

            return (
              <div key={section.id} className="nav-drawer-section">
                <p className="nav-drawer-section-title">{t(section.labelKey)}</p>
                <div className="nav-drawer-links">
                  {sectionItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`nav-drawer-link ${active ? "is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={closeMenu}
                      >
                        {t(item.labelKey)}
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
