import Link from "next/link";
import { copy } from "@/lib/i18n";

export default function PublicNav({ loggedIn }: { loggedIn: boolean }) {
  const c = copy.es;
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          {c.appName}
        </Link>

        <nav className="nav-links">
          <Link href="/" className="nav-link">
            {c.nav.home}
          </Link>

          {loggedIn ? (
            <Link href="/app" className="nav-link">
              {c.nav.goToApp}
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                {c.nav.login}
              </Link>
              <Link href="/register" className="nav-link">
                {c.nav.register}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
