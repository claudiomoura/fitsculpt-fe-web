"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildUserSections, sidebarAdmin } from "./navConfig";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserCapabilities } from "@/lib/userCapabilities";

type AuthUser = Record<string, unknown>;

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

  const capabilities = getUserCapabilities(user);
  const isAdmin = capabilities.isAdmin;

  const sections = useMemo(() => {
    const userSections = buildUserSections(capabilities.isTrainer);
    return isAdmin ? [...userSections, ...sidebarAdmin] : userSections;
  }, [capabilities.isTrainer, isAdmin]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <aside className="app-sidebar" aria-label={t("appName")}>
      <div className="app-sidebar-inner">
        {sections.map((section) => (
          <details key={section.id} className="sidebar-section" open>
            <summary className="sidebar-section-title">{t(section.labelKey)}</summary>
            <div className="sidebar-links">
              {section.items.map((item) => {
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
        ))}
      </div>
    </aside>
  );
}
