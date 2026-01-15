import { registerAction } from "../login/actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { copy } from "@/lib/i18n";

type SearchParams =
  | { error?: string }
  | Promise<{ error?: string }>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const c = copy.es;
  const sp = (await Promise.resolve(searchParams)) || {};
  const error = sp.error === "1";

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  return (
    <main className="auth-card card">
      <div>
        <h1 className="section-title">{c.auth.registerTitle}</h1>
        <p className="section-subtitle">{c.auth.registerSubtitle}</p>
      </div>

      {error && (
        <p className="muted" style={{ marginTop: 4 }}>
          {c.auth.registerError}
        </p>
      )}

      <form action={registerAction} className="form-stack">
        <label className="form-stack">
          {c.auth.name}
          <input name="name" type="text" />
        </label>

        <label className="form-stack">
          {c.auth.email}
          <input name="email" type="email" required />
        </label>

        <label className="form-stack">
          {c.auth.password}
          <input name="password" type="password" required minLength={8} />
        </label>

        <button type="submit" className="btn">
          {c.auth.registerSubmit}
        </button>
      </form>
    </main>
  );
}
