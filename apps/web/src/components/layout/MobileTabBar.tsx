"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import {
  PremiumHomeIcon,
  PremiumNutritionIcon,
  PremiumProfileIcon,
  PremiumProgressIcon,
  PremiumWorkoutIcon,
} from "@/components/icons/PremiumIcons";
import { applyTabEntitlementGating, mainTabsMobile, trainerTabsMobile } from "./navConfig";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { useAccess } from "@/lib/useAccess";

const premiumTabIcons = {
  "tab-home": PremiumHomeIcon,
  "tab-workout": PremiumWorkoutIcon,
  "tab-nutrition": PremiumNutritionIcon,
  "tab-progress": PremiumProgressIcon,
  "tab-profile": PremiumProfileIcon,
} as const;

export default function MobileTabBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { entitlements, authMe } = useAuthEntitlements();
  const { isCoach, isAdmin } = useAccess();
  const baseTabs = isCoach && !isAdmin ? trainerTabsMobile : mainTabsMobile;
  const tabs = applyTabEntitlementGating(baseTabs, entitlements);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(
    authMe?.imageUrl ?? authMe?.avatarUrl ?? authMe?.profilePhotoUrl ?? authMe?.avatarDataUrl ?? null,
  );

  useEffect(() => {
    const authAvatar = authMe?.imageUrl ?? authMe?.avatarUrl ?? authMe?.profilePhotoUrl ?? authMe?.avatarDataUrl ?? null;
    if (authAvatar) {
      queueMicrotask(() => setProfileAvatarUrl(authAvatar));
    }
  }, [authMe]);

  useEffect(() => {
    let active = true;

    const loadProfileAvatar = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store", credentials: "include" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          profilePhotoUrl?: string | null;
          avatarDataUrl?: string | null;
        };
        const avatar = data.profilePhotoUrl ?? data.avatarDataUrl ?? null;
        if (active && avatar) {
          queueMicrotask(() => setProfileAvatarUrl(avatar));
        }
      } catch {
        // Keep auth-derived avatar when profile fetch fails.
      }
    };

    void loadProfileAvatar();
    return () => {
      active = false;
    };
  }, []);

  const isActive = (href?: string) => {
    if (!href || !pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-tab-bar" aria-label={t("app.mobileTabBarAriaLabel")}>
      <div
        className="mobile-tab-bar-inner"
        style={{ ["--mobile-tab-count" as string]: tabs.length }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const tabLabel = tab.label ?? (tab.labelKey ? t(tab.labelKey) : "");
          const PremiumIcon = premiumTabIcons[tab.icon as keyof typeof premiumTabIcons];

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              className={`mobile-tab ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={tabLabel}
            >
              <span className={`mobile-tab-icon ${active ? "is-active" : ""}`} aria-hidden="true">
                {tab.id === "profile" && profileAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="mobile-tab-avatar" src={profileAvatarUrl} alt="" />
                ) : PremiumIcon ? <PremiumIcon width={18} height={18} /> : null}
              </span>
              <span className="mobile-tab-label">{tabLabel}</span>
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
