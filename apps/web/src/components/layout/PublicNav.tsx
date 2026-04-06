"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageProvider";

export default function PublicNav({ loggedIn }: { loggedIn: boolean }) {
  const { locale, setLocale } = useLanguage();

  return (
    <header className="landing-header">
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
          <Link href="/pricing#planes" className="landing-header__link">Planes</Link>
          <Link href="/#caracteristicas" className="landing-header__link">Características</Link>
          <Link href="/#testimonios" className="landing-header__link">Testimonios</Link>
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
