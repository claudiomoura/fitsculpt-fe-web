import { loginAction } from "./actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { copy } from "@/lib/i18n";

type SearchParams =
  | { next?: string; error?: string }
  | Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const c = copy.es;
  const sp = (await Promise.resolve(searchParams)) || {};
  const next = sp.next || "/app";
  const error = sp.error === "1";

  const hasSession = (await cookies()).get("fs_session")?.value === "1";
  if (hasSession) redirect("/app");

  return (
    <main style={{ width: 360, padding: 24 }}>
      <h1>{c.auth.loginTitle}</h1>

      {error && (
        <p style={{ marginTop: 12 }}>
          {c.auth.invalidCredentials}
        </p>
      )}

      <form
        action={loginAction}
        style={{ display: "grid", gap: 12, marginTop: 16 }}
      >
        <input type="hidden" name="next" value={next} />

        <label style={{ display: "grid", gap: 6 }}>
          {c.auth.email}
          <input name="email" type="email" required />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          {c.auth.password}
          <input name="password" type="password" required />
        </label>

        <button type="submit">{c.auth.submit}</button>
      </form>
    </main>
  );
}
