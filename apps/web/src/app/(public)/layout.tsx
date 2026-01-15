import { cookies } from "next/headers";
import PublicNav from "@/components/layout/PublicNav";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loggedIn = (await cookies()).get("fs_session")?.value === "1";

  return (
    <>
      <PublicNav loggedIn={loggedIn} />
      <main className="container">{children}</main>
    </>
  );
}
