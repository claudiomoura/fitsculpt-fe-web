import { cookies } from "next/headers";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = Boolean((await cookies()).get("fs_token")?.value);

  return (
    <>
      <PublicNav loggedIn={loggedIn} />
      <main className="marketing-shell">{children}</main>
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <span className="landing-footer__copy">© {new Date().getFullYear()} FitSculpt</span>
          <nav className="landing-footer__links" aria-label="Footer">
            <Link href="/pricing#planes">Pricing</Link>
            <Link href="/#como-funciona">How it works</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/privacidad">Privacy</Link>
            <Link href="/terminos">Terms</Link>
            <Link href="/reembolsos">Refunds</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
