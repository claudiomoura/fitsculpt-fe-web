"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { useLanguage } from "@/context/LanguageProvider";

type NavItem = {
  key: "plans" | "features" | "testimonials";
  href: "#planes" | "#caracteristicas" | "#testimonios";
  sectionId: "planes" | "caracteristicas" | "testimonios";
};

const NAV_ITEMS: NavItem[] = [
  { key: "plans", href: "#planes", sectionId: "planes" },
  { key: "features", href: "#caracteristicas", sectionId: "caracteristicas" },
  { key: "testimonials", href: "#testimonios", sectionId: "testimonios" },
];

export function MarketingHeader() {
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("planes");

  const navItems = useMemo(() => NAV_ITEMS, []);
  useEffect(() => {
    const sectionIds = navItems.map((item) => item.sectionId);
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-40% 0px -45% 0px",
        threshold: [0.15, 0.4, 0.65],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [navItems]);

  const mobileMenuId = "marketing-mobile-menu";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center" aria-label="FitSculpt">
          <Image src="/fitsculpt-logo-mono-mint.png" alt="FitSculpt" width={164} height={36} priority className="h-8 w-auto" />
        </Link>

        <nav aria-label={t("marketingPricing.header.navigation")} className="hidden items-center gap-3 md:flex">
          {navItems.map((item) => {
            const active = activeSection === item.sectionId;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  active ? "text-primary" : "text-text hover:text-primary"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {t(`marketingPricing.header.links.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-bg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t("nav.login")}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            aria-label={isMenuOpen ? t("ui.close") : t("ui.menu")}
            aria-expanded={isMenuOpen}
            aria-controls={mobileMenuId}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-surface text-text transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <span aria-hidden="true" className="text-lg leading-none">{isMenuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      <div id={mobileMenuId} className={`${isMenuOpen ? "block" : "hidden"} border-t border-border/70 bg-bg/95 px-4 py-4 backdrop-blur-xl md:hidden`}>
        <nav aria-label={t("marketingPricing.header.navigation")} className="flex flex-col gap-2">
          {navItems.map((item) => {
            const active = activeSection === item.sectionId;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  active ? "bg-primary/10 text-primary" : "text-text hover:text-primary"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {t(`marketingPricing.header.links.${item.key}`)}
              </Link>
            );
          })}
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-bg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t("nav.login")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default MarketingHeader;
