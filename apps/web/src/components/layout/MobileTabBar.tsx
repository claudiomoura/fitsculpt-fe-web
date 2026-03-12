"use client";

import type { SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { applyTabEntitlementGating, mainTabsMobile, trainerTabsMobile, type MobileTab } from "./navConfig";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { useAccess } from "@/lib/useAccess";

type TabIconProps = SVGProps<SVGSVGElement> & {
  active?: boolean;
};

function HomeIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="m3 9 9-7 9 7" />
      <path d="M9 22V12h6v10" />
      <path d="M21 22H3" />
    </svg>
  );
}

function DumbbellIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1" />
      <path d="m3 3 1 1" />
      <path d="m18 22 4-4" />
      <path d="m2 6 4-4" />
      <path d="m3 10 7-7" />
      <path d="m14 21 7-7" />
    </svg>
  );
}

function AppleIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="M12 8c-2.3 0-4 1.9-4 4.2 0 3 2.7 5.8 4 7.8 1.3-2 4-4.8 4-7.8C16 9.9 14.3 8 12 8Z" />
      <path d="M12 8c0-2 1.5-3 3-3" />
      <path d="M8.5 5.5c0-1.5 1.2-2.5 2.5-2.5" />
    </svg>
  );
}

function TrendingUpIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="M22 7 13.5 15.5l-5-5L2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}

function UserIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="M19 21a7 7 0 0 0-14 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function SparklesIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063A2 2 0 0 0 14.063 15.5l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

function BookIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="M12 7v14" />
      <path d="M3 18V5a2 2 0 0 1 2-2h13" />
      <path d="M3 18a2 2 0 0 0 2 2h13" />
      <path d="M18 22a2 2 0 0 0 2-2V7" />
      <path d="M18 2v5" />
      <path d="M20 2v5" />
      <path d="M20 4h2" />
      <path d="M20 9h2" />
    </svg>
  );
}

function CheckIcon({ active, ...props }: TabIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function renderIcon(icon: MobileTab["icon"], active: boolean) {
  const props = { className: "h-5 w-5", active };

  switch (icon) {
    case "home":
      return <HomeIcon {...props} />;
    case "dumbbell":
      return <DumbbellIcon {...props} />;
    case "apple":
      return <AppleIcon {...props} />;
    case "trending-up":
      return <TrendingUpIcon {...props} />;
    case "user":
      return <UserIcon {...props} />;
    case "book":
      return <BookIcon {...props} />;
    case "check":
      return <CheckIcon {...props} />;
    case "sparkles":
    default:
      return <SparklesIcon {...props} />;
  }
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
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="mobile-tab-bar fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 glass-card border-t border-border" aria-label={t("app.mobileTabBarAriaLabel")}>
      <div className="mobile-tab-bar-inner flex items-center justify-around px-2 py-2" style={{ ["--mobile-tab-count" as string]: tabs.length }}>
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const tabLabel = tab.mobileLabel ?? t(tab.labelKey);

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-current={active ? "page" : undefined}
              aria-label={tabLabel}
            >
              <span className={`relative ${active ? "glow-primary" : ""}`} aria-hidden="true">
                {renderIcon(tab.icon, active)}
                {active ? <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" /> : null}
              </span>
              <span className="text-[10px] font-medium">{tabLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
