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

type AuthUser = {
  name?: string | null;
  email?: string | null;
  subscriptionPlan?: "FREE" | "PRO" | "STRENGTH_AI" | "NUTRI_AI";
  aiTokenBalance?: number;
} & Record<string, unknown>;

type BillingStatus = {
  plan?: "FREE" | "PRO" | "STRENGTH_AI" | "NUTRI_AI";
  isPro?: boolean;
  tokens?: number;
};

export default function AppNavBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const { role, isAdmin, isCoach, isDev, gymMembershipState } = useAccess();
  const { entitlements } = useAuthEntitlements();

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!document.cookie.includes("fs_token=")) {
        if (active) {
          setUser(null);
          setBilling(null);
        }
        return;
      }

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
      } catch (_err) {
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
  const planValue = entitlements.status === "known" ? entitlements.tier : billing?.plan ?? user?.subscriptionPlan ?? "FREE";
  const normalizedPlan = planValue.toLowerCase();
  const planKey = `billing.planLabels.${normalizedPlan}`;
  const translatedPlan = t(planKey);
  const planLabel =
    translatedPlan === planKey
      ? t("billing.planLabels.unknown")
      : translatedPlan;
  const isPaidPlan = planValue !== "FREE";
  const tokenBalance = billing?.tokens ?? user?.aiTokenBalance;
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
    const activeElement =
      typeof document !== "undefined" ? document.activeElement : null;

    if (
      drawerElement &&
      activeElement instanceof HTMLElement &&
      drawerElement.contains(activeElement)
    ) {
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
          <img
            src="/fitsculpt-logo-transparent.png"
            alt="FitSculpt"
            width={42}
            height={42}
            className="h-8 w-auto"
          />
          {t("appName")}
        </Link>

        <div className="nav-actions">
          <AppUserBadge
            mobileMenuOpen={open}
            onMobileMenuOpen={() => setOpen(true)}
          />

          <div className={`account-pill ${isPaidPlan ? "is-pro" : "is-free"}`}>
            <span className="account-pill-label">{planLabel}</span>
            {isPaidPlan && hasTokenBalance ? (
              <span className="account-pill-meta">
                {t("ui.tokensLabel")} {tokenBalance}
              </span>
            ) : null}
          </div>

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

      <div
        className={`nav-drawer-backdrop ${open ? "is-open" : ""}`}
        role="presentation"
        onClick={() => closeMenu()}
      />
      <aside
        ref={drawerRef}
        id="app-nav-drawer"
        className={`nav-drawer ${open ? "is-open" : ""}`}
      >
        <div className="nav-drawer-header">
          <div>
            <p className="nav-drawer-title">{t("appName")}</p>
            <p className="nav-drawer-user">
              {user?.name || t("ui.userFallback")}
            </p>
            {userMeta ? (
              <p className="nav-drawer-user-meta">{userMeta}</p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="nav-toggle"
            aria-label={t("ui.close")}
            onClick={() => closeMenu()}
          >
            {t("ui.close")}
          </button>
        </div>

        <div className="nav-drawer-content">
          {sections.map((section) => {
            if (section.id === "account") {
              return (
                <div key={section.id} className="nav-drawer-section">
                  <p className="nav-drawer-section-title">
                    {t(section.labelKey)}
                  </p>
                  <div className="nav-drawer-links">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      if (item.disabled) {
                        return (
                          <div
                            key={`${section.id}:${item.id}`}
                            className="nav-drawer-link"
                            aria-disabled="true"
                          >
                            <span>
                              {t(item.labelKey)}
                              <span className="text-xs text-[var(--text-muted)]">
                                {" "}
                                {t(
                                  item.disabledNoteKey ??
                                    "common.notAvailableYet",
                                )}
                              </span>
                              {item.upgradeHref ? (
                                <Link href={item.upgradeHref} className="ml-2 text-xs underline" onClick={() => closeMenu()}>
                                  {t("billing.upgradePro")}
                                </Link>
                              ) : null}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={`${section.id}:${item.id}`}
                          href={item.href}
                          className={`nav-drawer-link ${active ? "is-active" : ""}`}
                          aria-current={active ? "page" : undefined}
                          onClick={() => closeMenu()}
                        >
                          <span>{t(item.labelKey)}</span>
                          {item.meta ? (
                            <span className="text-xs text-[var(--text-muted)]">
                              {item.meta}
                            </span>
                          ) : null}
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
                <p className="nav-drawer-section-title">
                  {t(section.labelKey)}
                </p>
                <div className="nav-drawer-links">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    if (item.disabled) {
                      return (
                        <div
                          key={`${section.id}:${item.id}`}
                          className="nav-drawer-link"
                          aria-disabled="true"
                        >
                          <span>
                            {t(item.labelKey)}
                            <span className="text-xs text-[var(--text-muted)]">
                              {" "}
                              {t(
                                item.disabledNoteKey ?? "common.notAvailableYet",
                              )}
                            </span>
                            {item.upgradeHref ? (
                              <Link href={item.upgradeHref} className="ml-2 text-xs underline" onClick={() => closeMenu()}>
                                {t("billing.upgradePro")}
                              </Link>
                            ) : null}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={`${section.id}:${item.id}`}
                        href={item.href}
                        className={`nav-drawer-link ${active ? "is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => closeMenu()}
                      >
                        <span>{t(item.labelKey)}</span>
                        {item.meta ? (
                          <span className="text-xs text-[var(--text-muted)]">
                            {item.meta}
                          </span>
                        ) : null}
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
