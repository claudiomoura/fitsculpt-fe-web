"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useLanguage } from "@/context/LanguageProvider";

type NavItem = {
  key: string;
  href: string;
};

function isActivePath(pathname: string, href: string) {
  if (href.startsWith("#") || href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function MarketingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();

  const navItems = useMemo<NavItem[]>(
    () => [
      { key: "plans", href: "/pricing" },
      { key: "features", href: "/#features" },
      { key: "testimonials", href: "/pricing#testimonials" },
    ],
    []
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center" aria-label="FitSculpt">
          <Image src="/fitsculpt-logo-mono-mint.png" alt="FitSculpt" width={164} height={36} priority className="h-8 w-auto" />
        </Link>

        <nav aria-label={t("marketingPricing.header.navigation")} className="hidden items-center gap-3 md:flex">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-text hover:text-primary"
                }`}
              >
                {t(`marketingPricing.header.links.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="inline-flex items-center rounded-[14px] border border-border bg-surface p-1" role="group" aria-label={t("ui.language")}>
            <button
              type="button"
              onClick={() => setLocale("es")}
              aria-pressed={locale === "es"}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                locale === "es" ? "bg-primary text-bg" : "text-text-muted hover:text-text"
              }`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                locale === "en" ? "bg-primary text-bg" : "text-text-muted hover:text-text"
              }`}
            >
              EN
            </button>
          </div>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-4 text-sm font-semibold text-bg transition hover:opacity-90"
          >
            {t("nav.login")}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="inline-flex items-center rounded-[12px] border border-border bg-surface p-1" role="group" aria-label={t("ui.language")}>
            <button
              type="button"
              onClick={() => setLocale("es")}
              aria-pressed={locale === "es"}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                locale === "es" ? "bg-primary text-bg" : "text-text-muted"
              }`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                locale === "en" ? "bg-primary text-bg" : "text-text-muted"
              }`}
            >
              EN
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
              <DropdownMenuItem onClick={() => router.push("/login")}>{t("nav.login")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default MarketingHeader;
