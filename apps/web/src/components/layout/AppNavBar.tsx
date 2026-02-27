"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import AppUserBadge from "./AppUserBadge";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { buildNavigationSections, getMostSpecificActiveHref } from "./navConfig";
import { applyEntitlementGating } from "./navConfig";
import { useAccess } from "@/lib/useAccess";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { resolveHeaderPlan, type HeaderPlan } from "@/lib/authPlan";
import { readAuthEntitlementSnapshot } from "@/context/auth/entitlements";

export default function AppNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { role, isAdmin, isCoach, isDev, gymMembershipState } = useAccess();
  const { entitlements, authMe, loading: authLoading, reload } = useAuthEntitlements();

  useEffect(() => {
    const handleRefresh = () => {
      void reload();
    };

    const handleWindowFocus = () => {
      void reload();
    };

    window.addEventListener("auth:refresh", handleRefresh);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handleWindowFocus);

    return () => {
      window.removeEventListener("auth:refresh", handleRefresh);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pageshow", handleWindowFocus);
    };
  }, [reload]);

  const userRole = typeof authMe?.role === "string" ? authMe.role : "";
  const userMeta = authMe?.email || userRole || "";
  const planValue: HeaderPlan = resolveHeaderPlan(authMe);
  const entitlementSnapshot = readAuthEntitlementSnapshot(authMe);
  const normalizedPlan = planValue.toLowerCase();
  const planKey = `billing.planLabels.${normalizedPlan}`;
  const translatedPlan = t(planKey);
  const planLabel = authLoading ? t("ui.loading") : translatedPlan === planKey ? t("billing.planLabels.free") : translatedPlan;
  const isPaidPlan = planValue !== "FREE";
  const tokenBalance = entitlementSnapshot.tokenBalance;
  const hasTokenBalance = typeof tokenBalance === "number";

  const sections = useMemo(() => {
    const baseSections = buildNavigationSections({
      role,
      isAdmin,
      isCoach,
      isDev,
      gymMembershipState,
    });

    return applyEntitlementGating(baseSections, entitlements);
  }, [role, isCoach, isAdmin, isDev, gymMembershipState, entitlements]);

  const closeMenu = (focusTarget?: HTMLButtonElement | null) => {
    const drawerElement = drawerRef.current;
    const activeElement = typeof document !== "undefined" ? document.activeElement : null;

    if (drawerElement && activeElement instanceof HTMLElement && drawerElement.contains(activeElement)) {
      (focusTarget ?? triggerRef.current ?? toggleButtonRef.current)?.focus();
    }

    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const drawerElement = drawerRef.current;
    if (drawerElement) {
      drawerElement.inert = !open;
    }

    const pageMain = document.querySelector("main");
    if (pageMain instanceof HTMLElement) {
      pageMain.inert = open;
    }

    return () => {
      if (pageMain instanceof HTMLElement) {
        pageMain.inert = false;
      }
    };
  }, [open]);

  const activeHref = getMostSpecificActiveHref(pathname, sections);

  const isActive = (href: string) => activeHref === href;

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <img src="/fitsculpt-logo-transparent.png" alt="FitSculpt" width={42} height={42} className="h-8 w-auto" />
          {t("appName")}
        </Link>

        <div className="nav-actions">
          <AppUserBadge user={authMe} />

          <Link
            href="/app/settings/billing"
            className={`account-pill ${isPaidPlan ? "is-pro" : "is-free"}`}
            aria-label={t("billing.manageBilling")}
          >
            <span className="account-pill-label">{planLabel}</span>
            {isPaidPlan && hasTokenBalance ? (
              <span className="account-pill-meta">
                {t("ui.tokensLabel")} {tokenBalance}
              </span>
            ) : null}
          </Link>

          <div className="nav-utility">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>

          <button
            ref={toggleButtonRef}
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="app-nav-drawer"
            aria-label="Abrir menú"
            onClick={(event) => {
              triggerRef.current = event.currentTarget;

              if (open) {
                closeMenu(event.currentTarget);
                return;
              }

              setOpen(true);
            }}
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      <div className={`nav-drawer-backdrop ${open ? "is-open" : ""}`} role="presentation" onClick={() => closeMenu()} />
      <aside ref={drawerRef} id="app-nav-drawer" className={`nav-drawer ${open ? "is-open" : ""}`}>
        <div className="nav-drawer-header">
          <div>
            <p className="nav-drawer-title">{t("appName")}</p>
            <p className="nav-drawer-user">{authMe?.name || t("ui.userFallback")}</p>
            {userMeta ? <p className="nav-drawer-user-meta">{userMeta}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="nav-drawer-close"
            aria-label="Cerrar menú"
            onClick={() => closeMenu()}
          >
            ✕
          </button>
        </div>

        <nav className="nav-drawer-links" aria-label={t("nav.appNavigation")}>
          {sections.map((section) => (
            <div key={section.id} className="nav-drawer-section">
              <p className="nav-drawer-section-title">{t(section.labelKey)}</p>
              {section.items.map((item) => {
                const active = isActive(item.href);
                const comingSoonNote = item.disabled ? t("common.comingSoon") : null;

                if (item.disabled) {
                  return (
                    <div key={item.href} className="nav-drawer-link is-disabled" aria-disabled="true">
                      <span>{t(item.labelKey)}</span>
                      {comingSoonNote ? <small>{comingSoonNote}</small> : null}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`nav-drawer-link ${active ? "is-active" : ""}`}
                    onClick={() => closeMenu(toggleButtonRef.current)}
                  >
                    <span>{t(item.labelKey)}</span>
                    {comingSoonNote ? <small>{comingSoonNote}</small> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </header>
  );
}
