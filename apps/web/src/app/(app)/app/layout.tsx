import Link from "next/link";
import LogoutButton from "./LogoutButton";

function AppNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {label}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
          FitSculpt
        </Link>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <AppNavLink href="/app" label="Dashboard" />
          <AppNavLink href="/app/workouts" label="Workouts" />
          <AppNavLink href="/app/profile" label="Profile" />
          <AppNavLink href="/app/settings" label="Settings" />
          <AppNavLink href="/app/macros" label="Macros" />

          <LogoutButton />
        </div>
      </header>

      <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        {children}
      </main>
    </>
  );
}
