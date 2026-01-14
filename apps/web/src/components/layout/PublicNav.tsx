import Link from "next/link";

export default function PublicNav({ loggedIn }: { loggedIn: boolean }) {
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
        FitSculpt
      </Link>

      <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Home
        </Link>

        {loggedIn ? (
          <Link href="/app" style={{ textDecoration: "none" }}>
            Ir para App
          </Link>
        ) : (
          <Link href="/login" style={{ textDecoration: "none" }}>
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
