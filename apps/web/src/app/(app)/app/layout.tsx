import Link from "next/link";
import LogoutButton from "./LogoutButton";
import { copy } from "@/lib/i18n";

function AppNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {label}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const c = copy.es;
  return (
    <>
      <header
        style={{
          borderBottom: "1px solid #e5e5e5",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ fontWeight: 700, textDecoration: "none" }}>
          {c.appName}
        </Link>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <AppNavLink href="/app" label={c.nav.dashboard} />
          <AppNavLink href="/app/workouts" label={c.nav.workouts} />
          <AppNavLink href="/app/nutricion" label={c.nav.nutrition} />
          <AppNavLink href="/app/entrenamiento" label={c.nav.trainingPlan} />
          <AppNavLink href="/app/macros" label={c.nav.macros} />
          <AppNavLink href="/app/profile" label={c.nav.profile} />
          <AppNavLink href="/app/settings" label={c.nav.settings} />

          <LogoutButton />
        </div>
      </header>

      <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        {children}
      </main>
    </>
  );
}
