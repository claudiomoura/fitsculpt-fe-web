"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { applyTabEntitlementGating, mainTabsMobile, trainerTabsMobile } from "./navConfig";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { useAccess } from "@/lib/useAccess";

function V0TabIcon({ tabId, active }: { tabId: string; active: boolean }) {
  const strokeWidth = active ? 2.5 : 2;

  const pathsByTab: Record<string, JSX.Element> = {
    today: (
      <path
        d="M3 10.5L12 3l9 7.5M6.5 9.5V21h11V9.5M9.5 21v-5h5v5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    ),
    training: (
      <path
        d="M3 10h2v4H3v-4zm16 0h2v4h-2v-4zM6 9h2v6H6V9zm10 0h2v6h-2V9zM8 11h8v2H8v-2z"
        fill="currentColor"
      />
    ),
    nutrition: (
      <>
        <path
          d="M14.5 7.5c.7-1 1.1-2.2 1-3.5-1.2.1-2.5.8-3.3 1.8-.7.8-1.2 2.1-1 3.3 1.3.1 2.6-.6 3.3-1.6z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M12 8c-2.5 0-4.5 1.8-5.2 4.2-.8 2.7.5 6.1 2 8 .9 1.1 1.8 1.7 2.9 1.7 1 0 1.4-.3 2.3-.3.9 0 1.2.3 2.2.3 1.1 0 1.8-.5 2.8-1.7 1.1-1.3 1.8-2.9 2.1-4.7-1.5-.7-2.3-2-2.3-3.5 0-1.4.7-2.6 1.9-3.3-.9-1.2-2.2-2-3.8-2-1.1 0-2.1.4-2.9.9-.7-.4-1.4-.6-2-.6z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
        />
      </>
    ),
    progress: (
      <path
        d="M3 17l6-6 4 4 7-7M14 8h6v6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
        <path
          d="M4 20c1.8-3.3 4.6-5 8-5s6.2 1.7 8 5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </>
    ),
  };

  const iconPath = pathsByTab[tabId] ?? pathsByTab.today;

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      {iconPath}
    </svg>
  );
}

export default function MobileTabBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { entitlements } = useAuthEntitlements();
  const { isCoach, isAdmin } = useAccess();
  const baseTabs = isCoach && !isAdmin ? trainerTabsMobile : mainTabsMobile;
  const tabs = applyTabEntitlementGating(baseTabs, entitlements);

  const isActive = (href?: string) => {
    if (!href || !pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 glass-card border-t border-border"
      aria-label={t("app.mobileTabBarAriaLabel")}
    >
      <div
        className="flex items-center justify-around px-2 py-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const tabLabel = t(tab.labelKey);

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-[10px] font-medium transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className={`relative ${active ? "glow-primary" : ""}`}>
                <V0TabIcon tabId={tab.id} active={active} />
                {active ? (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                ) : null}
              </span>
              <span>{tabLabel}</span>
              {typeof tab.badgeCount === "number" && tab.badgeCount > 0 ? (
                <span className="mobile-tab-badge" aria-hidden="true">
                  {tab.badgeCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
