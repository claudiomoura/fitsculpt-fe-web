import { registerAction } from "../login/actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/serverI18n";
import RegisterForm from "./RegisterForm";

type SearchParams =
  | { error?: string }
  | Promise<{ error?: string }>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { t } = await getServerT();
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

      <RegisterForm
        action={registerAction}
        labels={{
          name: t("auth.name"),
          email: t("auth.email"),
          password: t("auth.password"),
          promoCode: t("auth.promoCode"),
          submit: t("auth.registerSubmit"),
          loading: t("auth.registerLoading"),
          showPassword: t("auth.showPassword"),
          hidePassword: t("auth.hidePassword"),
        }}
      />

      <p className="muted" style={{ margin: 0 }}>
        {t("auth.verifyHint")}
      </p>
    </main>
  );
}
