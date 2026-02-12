"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";
import { Icon } from "@/components/ui/Icon";
import { mainTabsMobile } from "./navConfig";

export default function MobileTabBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (href?: string) => {
    if (!href || !pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  const nav = (
    <nav className="mobile-tab-bar" aria-label={t("nav.mobileTabBarAriaLabel")}>
      <div className="mobile-tab-bar-inner">
        {mainTabsMobile.map((tab) => {
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

  return mounted ? createPortal(nav, document.body) : null;
}
