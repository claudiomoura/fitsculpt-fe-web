"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildNavigationSections } from "./navConfig";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";

export default function AppSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { role, isAdmin, isCoach, isDev, gymMembershipState } = useAccess();

  const sections = useMemo(
    () => buildNavigationSections({ role, isAdmin, isCoach, isDev, gymMembershipState }),
    [role, isCoach, isAdmin, isDev, gymMembershipState],
  );

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <aside className="app-sidebar" aria-label={t("appName")}>
      <div className="app-sidebar-inner">
        {sections.map((section) => {
          const isDevelopmentSection = section.id === "development";

          return (
            <details key={section.id} className="sidebar-section" open={!isDevelopmentSection}>
              <summary className="sidebar-section-title">{t(section.labelKey)}</summary>
              <div className="sidebar-links">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  if (item.disabled) {
                    return (
                      <div key={item.id} className="sidebar-link" aria-disabled="true">
                        <span>{t(item.labelKey)}</span>
                        {item.disabledNoteKey ? <span className="text-xs text-[var(--text-muted)]">{t(item.disabledNoteKey)}</span> : null}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`sidebar-link ${active ? "is-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}

      </div>
    </aside>
  );
}
