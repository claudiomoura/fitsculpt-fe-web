"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, NAV_SECTIONS } from "./navConfig";
import { useLanguage } from "@/context/LanguageProvider";

type AuthUser = {
  role?: string | null;
};

export default function AppSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
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

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <aside className="app-sidebar" aria-label={t("appName")}>
      <div className="app-sidebar-inner">
        {NAV_SECTIONS.map((section) => {
          const sectionItems = visibleItems.filter((item) => item.section === section.id);
          if (sectionItems.length === 0) return null;
          return (
            <details key={section.id} className="sidebar-section" open>
              <summary className="sidebar-section-title">{t(section.labelKey)}</summary>
              <div className="sidebar-links">
                {sectionItems.map((item) => {
                  const active = isActive(item.href);
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
