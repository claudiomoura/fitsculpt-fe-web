import { cookies } from "next/headers";
import PublicNav from "@/components/layout/PublicNav";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loggedIn = Boolean((await cookies()).get("fs_token")?.value);

  return (
    <>
      <PublicNav loggedIn={loggedIn} />
      <main className="container">{children}</main>
    </>
  );
}
