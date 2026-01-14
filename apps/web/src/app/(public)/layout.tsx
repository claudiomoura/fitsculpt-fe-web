import { cookies } from "next/headers";
import PublicNav from "@/components/layout/PublicNav";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = (await cookies()).get("fs_session")?.value === "1";

  return (
    <>
      <PublicNav loggedIn={loggedIn} />
      <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>{children}</main>
    </>
  );
}
