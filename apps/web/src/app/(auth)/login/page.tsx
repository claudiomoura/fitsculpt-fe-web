import { loginAction } from "./actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/serverI18n";
import Link from "next/link";
import ResendVerificationButton from "./ResendVerificationButton";
import LoginForm from "./LoginForm";
import GoogleLoginButton from "./GoogleLoginButton";

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
  const promoError = sp.error === "promo";
  const oauthError = sp.error === "oauth";
  const registered = sp.registered === "1";

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  return (
    <main className="auth-card card">
      <div>
        <h1 className="section-title">{t("auth.loginTitle")}</h1>
        <p className="section-subtitle">{t("landing.subtitle")}</p>
      </div>

      {(error || unverified || blocked || promoError || oauthError || registered) && (
        <p className="muted" style={{ marginTop: 4 }}>
          {registered
            ? t("auth.registerSuccess")
            : blocked
              ? t("auth.blockedAccount")
              : promoError
                ? t("auth.googlePromoError")
                : oauthError
                  ? t("auth.oauthError")
              : unverified
                ? t("auth.emailNotVerified")
                : t("auth.invalidCredentials")}
        </p>
      )}

      <LoginForm
        action={loginAction}
        next={next}
        labels={{
          email: t("auth.email"),
          password: t("auth.password"),
          submit: t("auth.submit"),
          loading: t("auth.loginLoading"),
          showPassword: t("auth.showPassword"),
          hidePassword: t("auth.hidePassword"),
        }}
      />

      <GoogleLoginButton
        labels={{
          button: t("auth.google"),
          modalTitle: t("auth.googlePromoTitle"),
          modalSubtitle: t("auth.googlePromoSubtitle"),
          promoLabel: t("auth.promoCode"),
          promoPlaceholder: t("auth.googlePromoPlaceholder"),
          promoHint: t("auth.googlePromoHint"),
          confirm: t("auth.googlePromoConfirm"),
          skip: t("auth.googlePromoSkip"),
          cancel: t("auth.googlePromoCancel"),
          promoError: t("auth.googlePromoError"),
          oauthError: t("auth.oauthError"),
        }}
      />

      {unverified && (
        <div style={{ marginTop: 12 }}>
          <ResendVerificationButton />
        </div>
      )}

      <p className="muted" style={{ marginTop: 12 }}>
        {t("auth.noAccount")} {" "}
        <Link href="/register" className="link">
          {t("auth.createAccount")}
        </Link>
      </p>
    </main>
  );
}
