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
    <main className="auth-card card">
      <div>
        <h1 className="section-title">{c.auth.loginTitle}</h1>
        <p className="section-subtitle">{c.landing.subtitle}</p>
      </div>

      {error && (
        <p className="muted" style={{ marginTop: 4 }}>
          {c.auth.invalidCredentials}
        </p>
      )}

      <form action={loginAction} className="form-stack">
        <input type="hidden" name="next" value={next} />

        <label className="form-stack">
          {c.auth.email}
          <input name="email" type="email" required />
        </label>

        <label className="form-stack">
          {c.auth.password}
          <input name="password" type="password" required />
        </label>

        <button type="submit" className="btn">
          {c.auth.submit}
        </button>
      </form>
    </main>
  );
}
