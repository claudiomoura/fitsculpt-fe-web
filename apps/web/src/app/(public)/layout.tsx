import { cookies } from "next/headers";
import PublicNav from "@/components/layout/PublicNav";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = Boolean((await cookies()).get("fs_token")?.value);

  return (
<>
  <PublicNav loggedIn={loggedIn} />
  <main className="marketing-shell">{children}</main>
  <footer className="landing-footer">
    <div className="landing-footer__inner">
      <span className="landing-footer__copy">© {new Date().getFullYear()} FitSculpt</span>
    </div>
  </footer>
</>
  );
}