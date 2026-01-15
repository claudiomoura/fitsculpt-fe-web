import Link from "next/link";
import { copy } from "@/lib/i18n";

export default function PublicNav({ loggedIn }: { loggedIn: boolean }) {
  const c = copy.es;
  return (
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

      <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          {c.nav.home}
        </Link>

        {loggedIn ? (
          <Link href="/app" style={{ textDecoration: "none" }}>
            {c.nav.goToApp}
          </Link>
        ) : (
          <Link href="/login" style={{ textDecoration: "none" }}>
            {c.nav.login}
          </Link>
        )}
      </nav>
    </header>
  );
}
