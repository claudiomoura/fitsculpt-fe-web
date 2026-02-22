"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildNavigationSections, getMostSpecificActiveHref } from "./navConfig";
import { useLanguage } from "@/context/LanguageProvider";
import { useAccess } from "@/lib/useAccess";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { EmptyState, LoadingState, ErrorState } from "@/components/states";
import { applyEntitlementGating } from "./navConfig";

export default function AppSidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { role, isAdmin, isCoach, isDev, gymMembershipState } = useAccess();
  const { entitlements, loading, error, reload } = useAuthEntitlements();

  const sections = useMemo(() => {
    const baseSections = buildNavigationSections({ role, isAdmin, isCoach, isDev, gymMembershipState });
    return applyEntitlementGating(baseSections, entitlements);
  }, [role, isCoach, isAdmin, isDev, gymMembershipState, entitlements]);

  const activeHref = getMostSpecificActiveHref(pathname, sections);

  const isActive = (href: string) => activeHref === href;

  if (loading) {
    return <LoadingState ariaLabel={t("ui.loading")} title={t("ui.loading")} showCard={false} lines={2} className="px-4 py-3" />;
  }

  if (error) {
    return <ErrorState title={t("common.error")} description={error} retryLabel={t("common.retry")} onRetry={() => void reload()} wrapInCard />;
  }

  if (!sections.length) {
    return (
      <EmptyState
        title={t("common.notAvailable")}
        description={t("nav.billing")}
        actions={[{ label: t("billing.upgradePro"), href: "/app/settings/billing", variant: "primary" }]}
        wrapInCard
      />
    );
  }

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
                      <div key={`${section.id}:${item.id}`} className="sidebar-link" aria-disabled="true">
                        <span>
                          {t(item.labelKey)}
                          {item.disabledNoteKey ? (
                            <span className="text-xs text-[var(--text-muted)]"> {t(item.disabledNoteKey)}</span>
                          ) : null}
                          {item.upgradeHref ? (
                            <Link href={item.upgradeHref} className="ml-2 text-xs underline">
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
