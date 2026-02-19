"use client";

import Image from "next/image";
import Link from "next/link";

export default function PublicNav({ loggedIn }: { loggedIn: boolean }) {
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

        <div className="landing-header__actions">
          {loggedIn ? (
            <Link href="/app" className="landing-header__button landing-header__button--ghost">
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