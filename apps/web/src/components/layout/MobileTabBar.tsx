"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { Icon } from "@/components/ui/Icon";
import { applyEntitlementGating, applyTabEntitlementGating, buildNavigationSections, getMostSpecificActiveHref, mainTabsMobile, trainerTabsMobile } from "./navConfig";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { useAccess } from "@/lib/useAccess";
import { V0BottomNav } from "@/components/v0";
import { isV0NavEnabled } from "@/config/featureFlags";

const V0_PRIMARY_ITEM_IDS = ["today", "training", "nutrition-calendar", "dashboard", "profile"];

export default function MobileTabBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { entitlements } = useAuthEntitlements();
  const { isCoach, isAdmin, role, isDev, gymMembershipState } = useAccess();
  const baseTabs = isCoach && !isAdmin ? trainerTabsMobile : mainTabsMobile;
  const tabs = applyTabEntitlementGating(baseTabs, entitlements);

  const isActive = (href?: string) => {
    if (!href || !pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  if (isV0NavEnabled()) {
    const sections = applyEntitlementGating(buildNavigationSections({ role, isAdmin, isCoach, isDev, gymMembershipState }), entitlements);
    const activeHref = getMostSpecificActiveHref(pathname, sections);
    const allItems = sections.flatMap((section) => section.items).filter((item) => !item.disabled);
    const primaryItems = V0_PRIMARY_ITEM_IDS.map((id) => allItems.find((item) => item.id === id)).filter((item) => item !== undefined);
    const extraItems = allItems.filter((item) => !V0_PRIMARY_ITEM_IDS.includes(item.id));
    const moreHref = extraItems[0]?.href;

    const items = [
      ...primaryItems.map((item) => ({
        label: t(item.labelKey),
        href: item.href,
        active: activeHref === item.href,
      })),
      ...(moreHref
        ? [
            {
              label: t("common.more"),
              href: moreHref,
              active: activeHref === moreHref,
            },
          ]
        : []),
    ];

    return <V0BottomNav items={items} />;
  }

  return (
    <nav className="mobile-tab-bar" aria-label={t("app.mobileTabBarAriaLabel")}>
      <div
        className="mobile-tab-bar-inner"
        style={{ ["--mobile-tab-count" as string]: tabs.length }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const tabLabel = t(tab.labelKey);

          return (
            <Link
              key={tab.id}
              href={tab.href ?? "#"}
              className={`mobile-tab ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="mobile-tab-icon" aria-hidden="true">
                <Icon name={tab.icon} size={18} />
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
