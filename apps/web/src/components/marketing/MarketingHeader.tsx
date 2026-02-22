"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageProvider";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";

type NavItem = {
  key: "plans" | "features" | "testimonials";
  href: string;
  sectionId: "planes" | "caracteristicas" | "testimonios";
};

export function MarketingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();

  const mobileMenuId = "marketing-mobile-nav";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavItem["sectionId"] | null>(null);

  const navItems = useMemo<NavItem[]>(
    () => [
      { key: "plans", href: "/pricing#planes", sectionId: "planes" },
      { key: "features", href: "/#caracteristicas", sectionId: "caracteristicas" },
      { key: "testimonials", href: "/pricing#testimonios", sectionId: "testimonios" },
    ],
    []
  );

  useEffect(() => {
    // Cierra menú en cambios de ruta
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset menu state after navigation
    setIsMenuOpen(false);

    // Deriva sección activa desde hash (solo en client)
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const id = hash.startsWith("#") ? hash.slice(1) : "";

    if (id === "planes" || id === "caracteristicas" || id === "testimonios") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync active nav section to route hash
      setActiveSection(id);
      return;
    }

    // Fallback por pathname si no hay hash
    if (pathname.startsWith("/pricing")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync pricing route to plans section
      setActiveSection("planes");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear active section when route has no section context
    setActiveSection(null);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center" aria-label="FitSculpt">
          <Image
            src="/fitsculpt-logo-transparent.png"
            alt="FitSculpt"
            width={42}
            height={42}
            priority
            className="h-8 w-auto"
          />
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
          <div
            className="inline-flex items-center rounded-[14px] border border-border bg-surface p-1"
            role="group"
            aria-label={t("ui.language")}
          >
            <button
              type="button"
              onClick={() => setLocale("es")}
              aria-pressed={locale === "es"}
              aria-label={t("marketingPricing.header.language.switchToEs")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                locale === "es" ? "bg-primary text-bg" : "text-text-muted hover:text-text"
              }`}
            >
              {t("marketingPricing.header.language.es")}
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              aria-label={t("marketingPricing.header.language.switchToEn")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                locale === "en" ? "bg-primary text-bg" : "text-text-muted hover:text-text"
              }`}
            >
              {t("marketingPricing.header.language.en")}
            </button>
          </div>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-bg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t("nav.login")}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div
            className="inline-flex items-center rounded-[12px] border border-border bg-surface p-1"
            role="group"
            aria-label={t("ui.language")}
          >
            <button
              type="button"
              onClick={() => setLocale("es")}
              aria-pressed={locale === "es"}
              aria-label={t("marketingPricing.header.language.switchToEs")}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                locale === "es" ? "bg-primary text-bg" : "text-text-muted"
              }`}
            >
              {t("marketingPricing.header.language.es")}
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              aria-label={t("marketingPricing.header.language.switchToEn")}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                locale === "en" ? "bg-primary text-bg" : "text-text-muted"
              }`}
            >
              {t("marketingPricing.header.language.en")}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="!h-10 !rounded-[12px] !border !border-border !bg-surface !px-3 !text-text">
              {t("ui.menu")}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="!min-w-52 !rounded-[16px] !border !border-border !bg-surface">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.key} onClick={() => router.push(item.href)}>
                  {t(`marketingPricing.header.links.${item.key}`)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => router.push("/login")}>
                {t("nav.login")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        id={mobileMenuId}
        className={`${isMenuOpen ? "block" : "hidden"} border-t border-border/70 bg-bg/95 px-4 py-4 backdrop-blur-xl md:hidden`}
      >
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
