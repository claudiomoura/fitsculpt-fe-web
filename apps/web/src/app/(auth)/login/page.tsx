import { loginAction } from "./actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/serverI18n";
import Link from "next/link";
import ResendVerificationButton from "./ResendVerificationButton";

type SearchParams =
  | { next?: string; error?: string; registered?: string }
  | Promise<{ next?: string; error?: string; registered?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { t } = await getServerT();
  const sp = (await Promise.resolve(searchParams)) || {};
  const next = sp.next || "/app";
  const error = sp.error === "1";
  const unverified = sp.error === "unverified";
  const blocked = sp.error === "blocked";
  const registered = sp.registered === "1";

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  return (
    <main className="auth-card card">
      <div>
        <h1 className="section-title">{t("auth.loginTitle")}</h1>
        <p className="section-subtitle">{t("landing.subtitle")}</p>
      </div>

      {(error || unverified || blocked || registered) && (
        <p className="muted" style={{ marginTop: 4 }}>
          {registered
            ? t("auth.registerSuccess")
            : blocked
              ? t("auth.blockedAccount")
              : unverified
                ? t("auth.emailNotVerified")
                : t("auth.invalidCredentials")}
        </p>
      )}

      <form action={loginAction} className="form-stack">
        <input type="hidden" name="next" value={next} />

        <label className="form-stack">
          {t("auth.email")}
          <input name="email" type="email" required />
        </label>

        <label className="form-stack">
          {t("auth.password")}
          <input name="password" type="password" required />
        </label>

        <button type="submit" className="btn">
          {t("auth.submit")}
        </button>
      </form>

      <Link href="/api/auth/google/start" className="btn secondary" style={{ justifyContent: "center" }}>
        {t("auth.google")}
      </Link>

      {unverified && (
        <div style={{ marginTop: 12 }}>
          <ResendVerificationButton />
        </div>
      )}

      <p className="muted" style={{ marginTop: 12 }}>
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="link">
          {t("auth.createAccount")}
        </Link>
      </p>
    </main>
  );
}
