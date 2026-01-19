\"use client\";

import Link from \"next/link\";
import { useLanguage } from \"@/context/LanguageProvider\";

export default function PublicNav({ loggedIn }: { loggedIn: boolean }) {
  const { t } = useLanguage();
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          {t("appName")}
        </Link>

        <nav className="nav-links">
          <Link href="/" className="nav-link">
            {t("nav.home")}
          </Link>

          {loggedIn ? (
            <Link href="/app" className="nav-link">
              {t("nav.goToApp")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                {t("nav.login")}
              </Link>
              <Link href="/register" className="nav-link">
                {t("nav.register")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
