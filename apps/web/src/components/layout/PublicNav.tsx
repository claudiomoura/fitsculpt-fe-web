"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageProvider";

export default function PublicNav({ loggedIn }: { loggedIn: boolean }) {
  const { locale, setLocale } = useLanguage();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const sectionIds = useMemo(() => ["precios", "caracteristicas", "como-funciona", "resultados", "faq"], []);

  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection(null);
      return;
    }

    const readHashSection = () => {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      if (sectionIds.includes(hash)) {
        setActiveSection(hash);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-35% 0px -45% 0px",
        threshold: [0.2, 0.35, 0.5, 0.65],
      }
    );

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    readHashSection();
    window.addEventListener("hashchange", readHashSection);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", readHashSection);
    };
  }, [pathname, sectionIds]);

  useEffect(() => {
    if (pathname !== "/") {
      setScrollProgress(0);
      return;
    }

    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setScrollProgress(0);
        return;
      }

      const next = Math.min(1, Math.max(0, window.scrollY / scrollable));
      setScrollProgress(next);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [pathname]);

  const isSectionActive = (sectionId: string) => pathname === "/" && activeSection === sectionId;

  return (
    <header className="landing-header">
      <div
        aria-hidden="true"
        className="landing-scroll-progress"
        style={{ transform: `scaleX(${scrollProgress})` }}
      />
      <div className="landing-header__inner">
       <Link href="/" className="landing-header__brand" aria-label="FitSculpt">
  <Image
    src="/fitsculpt-logo-transparent.png"
    alt="FitSculpt"
    width={42}
    height={42}
    priority
    className="landing-header__logo"
  />
  <span className="landing-header__brandText">FitSculpt</span>
</Link>

        <nav className="landing-header__nav" aria-label="Navegación">
          <Link href="/#precios" className={`landing-header__link ${isSectionActive("precios") ? "is-active" : ""}`} aria-current={isSectionActive("precios") ? "page" : undefined}>Planes</Link>
          <Link href="/#caracteristicas" className={`landing-header__link ${isSectionActive("caracteristicas") ? "is-active" : ""}`} aria-current={isSectionActive("caracteristicas") ? "page" : undefined}>Características</Link>
          <Link href="/#como-funciona" className={`landing-header__link ${isSectionActive("como-funciona") ? "is-active" : ""}`} aria-current={isSectionActive("como-funciona") ? "page" : undefined}>Cómo funciona</Link>
          <Link href="/#resultados" className={`landing-header__link ${isSectionActive("resultados") ? "is-active" : ""}`} aria-current={isSectionActive("resultados") ? "page" : undefined}>Resultados</Link>
          <Link href="/#faq" className={`landing-header__link ${isSectionActive("faq") ? "is-active" : ""}`} aria-current={isSectionActive("faq") ? "page" : undefined}>FAQ</Link>
        </nav>

        {/* Desktop language switcher */}
        <div className="landing-header__lang">
          <div className="landing-lang-desktop">
            <button
              type="button"
              onClick={() => setLocale("es")}
              className={`landing-lang-btn ${locale === "es" ? "is-active" : ""}`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`landing-lang-btn ${locale === "en" ? "is-active" : ""}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("pt")}
              className={`landing-lang-btn ${locale === "pt" ? "is-active" : ""}`}
            >
              PT
            </button>
          </div>
        </div>

        {/* Mobile language buttons */}
        <div className="landing-header__lang-mobile">
          <button
            type="button"
            onClick={() => setLocale("es")}
            className={`landing-lang-btn-mobile ${locale === "es" ? "is-active" : ""}`}
            aria-label="Español"
          >
            ES
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={`landing-lang-btn-mobile ${locale === "en" ? "is-active" : ""}`}
            aria-label="English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLocale("pt")}
            className={`landing-lang-btn-mobile ${locale === "pt" ? "is-active" : ""}`}
            aria-label="Português"
          >
            PT
          </button>
        </div>

        <div className="landing-header__actions">
          {loggedIn ? (
            <Link href="/app" className="landing-header__button landing-header__button--app">
              Ir a la app
            </Link>
          ) : (
            <Link href="/login" className="landing-header__button landing-header__button--primary">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
