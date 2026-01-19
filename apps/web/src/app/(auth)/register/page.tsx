import { registerAction } from "../login/actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/serverI18n";

type SearchParams =
  | { error?: string }
  | Promise<{ error?: string }>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { t } = getServerT();
  const sp = (await Promise.resolve(searchParams)) || {};
  const error = sp.error === "1";
  const promoError = sp.error === "promo";

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  return (
    <main className="auth-card card">
      <div>
        <h1 className="section-title">{t("auth.registerTitle")}</h1>
        <p className="section-subtitle">{t("auth.registerSubtitle")}</p>
      </div>

      {(error || promoError) && (
        <p className="muted" style={{ marginTop: 4 }}>
          {promoError ? t("auth.promoError") : t("auth.registerError")}
        </p>
      )}

      <form action={registerAction} className="form-stack">
        <label className="form-stack">
          {t("auth.name")}
          <input name="name" type="text" />
        </label>

        <label className="form-stack">
          {t("auth.email")}
          <input name="email" type="email" required />
        </label>

        <label className="form-stack">
          {t("auth.password")}
          <input name="password" type="password" required minLength={8} />
        </label>

        <label className="form-stack">
          {t("auth.promoCode")}
          <input name="promoCode" type="text" required />
        </label>

        <p className="muted" style={{ margin: 0 }}>
          {t("auth.verifyHint")}
        </p>

        <button type="submit" className="btn">
          {t("auth.registerSubmit")}
        </button>
      </form>
    </main>
  );
}
