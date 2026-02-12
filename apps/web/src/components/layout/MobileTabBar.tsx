"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { Icon } from "@/components/ui/Icon";
import { mainTabsMobile } from "./navConfig";
import QuickActionsDrawer from "./QuickActionsDrawer";

export default function MobileTabBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const isActive = (href?: string) => {
    if (!href || !pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="mobile-tab-bar" aria-label={t("nav.mobileTabs")}>
        <div className="mobile-tab-bar-inner">
          {mainTabsMobile.map((tab) => {
            const active = tab.action === "quickActions" ? quickActionsOpen : isActive(tab.href);
            const tabLabel = t(tab.labelKey);

            if (tab.action === "quickActions") {
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`mobile-tab mobile-tab--action ${active ? "is-active" : ""}`}
                  aria-label={tabLabel}
                  aria-haspopup="dialog"
                  aria-expanded={quickActionsOpen}
                  onClick={() => setQuickActionsOpen(true)}
                >
                  <span className="mobile-tab-icon mobile-tab-icon--action" aria-hidden="true">
                    ＋
                  </span>
                  <span className="mobile-tab-label">{tabLabel}</span>
                </button>
              );
            }

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
      <QuickActionsDrawer open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
    </>
  );
}
