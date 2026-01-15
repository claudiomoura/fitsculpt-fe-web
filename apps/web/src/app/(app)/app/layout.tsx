import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { copy } from "@/lib/i18n";
import AppUserBadge from "@/components/layout/AppUserBadge";

function AppNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="nav-link">
      {label}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const c = copy.es;
  return (
    <>
      <header className="site-header">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            {c.appName}
          </Link>

          <div className="nav-links">
            <AppNavLink href="/app" label={c.nav.dashboard} />
            <AppNavLink href="/app/workouts" label={c.nav.workouts} />
            <AppNavLink href="/app/nutricion" label={c.nav.nutrition} />
            <AppNavLink href="/app/entrenamiento" label={c.nav.trainingPlan} />
            <AppNavLink href="/app/seguimiento" label={c.nav.tracking} />
            <AppNavLink href="/app/macros" label={c.nav.macros} />
            <AppNavLink href="/app/profile" label={c.nav.profile} />
            <AppNavLink href="/app/settings" label={c.nav.settings} />
          </div>
          <div className="nav-actions">
            <AppUserBadge />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="container">{children}</main>
    </>
  );
}
