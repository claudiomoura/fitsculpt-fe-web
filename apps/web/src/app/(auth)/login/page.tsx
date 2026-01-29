import { loginAction } from "./actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/serverI18n";
import Link from "next/link";
import ResendVerificationButton from "./ResendVerificationButton";
import LoginForm from "./LoginForm";
import GoogleLoginButton from "./GoogleLoginButton";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

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
      <div className="auth-header">
        <Badge variant="muted">{t("auth.loginBadge")}</Badge>
        <h1 className="section-title">{t("auth.loginTitle")}</h1>
        <p className="section-subtitle">{t("auth.loginSubtitle")}</p>
      </div>

      {(error || unverified || blocked || promoError || oauthError || registered) && (
        <div className={`status-card ${registered ? "status-card--success" : "status-card--warning"}`}>
          <div className="inline-actions-sm">
            <Icon name={registered ? "check" : "warning"} />
            <strong>
              {registered ? t("auth.registerSuccessTitle") : t("auth.loginIssueTitle")}
            </strong>
          </div>
          <p className="muted">
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
        </div>
      )}

      <LoginForm
        action={loginAction}
        next={next}
        labels={{
          email: t("auth.email"),
          emailHelper: t("auth.emailHelper"),
          password: t("auth.password"),
          passwordHelper: t("auth.passwordHelper"),
          submit: t("auth.submit"),
          loading: t("auth.loginLoading"),
          showPassword: t("auth.showPassword"),
          hidePassword: t("auth.hidePassword"),
        }}
      />

      <div className="auth-footer">
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

        {unverified ? <ResendVerificationButton /> : null}

        <p className="muted">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="link">
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
    </main>
  );
}
