import { loginAction } from "./actions";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/serverI18n";
import Link from "next/link";
import Image from "next/image";
import ResendVerificationButton from "./ResendVerificationButton";
import LoginForm from "./LoginForm";
import GoogleLoginButton from "./GoogleLoginButton";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { Icon } from "@/design-system/components/Icon";

type SearchParams =
  | { next?: string; error?: string; registered?: string; view?: string; nativeApp?: string; fs_app?: string; capacitor?: string }
  | Promise<{ next?: string; error?: string; registered?: string; view?: string; nativeApp?: string; fs_app?: string; capacitor?: string }>;

const isNativeAppSignal = (value: string | undefined) => value === "1" || value === "true";

async function isNativeAppRequest(search: Awaited<SearchParams>) {
  if (isNativeAppSignal(search.nativeApp) || isNativeAppSignal(search.fs_app) || isNativeAppSignal(search.capacitor)) {
    return true;
  }

  const headerStore = await headers();
  const requestedWith = headerStore.get("x-requested-with")?.toLowerCase() ?? "";
  const appClient = [
    headerStore.get("x-fitsculpt-app"),
    headerStore.get("x-fitsculpt-client"),
    headerStore.get("x-capacitor"),
    headerStore.get("x-app-platform"),
  ]
    .join(" ")
    .toLowerCase();
  const ua = headerStore.get("user-agent")?.toLowerCase() ?? "";

  return (
    requestedWith.includes("capacitor") ||
    appClient.includes("capacitor") ||
    appClient.includes("fitsculpt") ||
    ua.includes("capacitor") ||
    ua.includes("com.fitsculpt.beta") ||
    (ua.includes("android") && ua.includes("; wv)"))
  );
}

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
  const showSignIn =
    sp.view === "signin" || error || unverified || blocked || promoError || oauthError || registered;
  const isNativeApp = await isNativeAppRequest(sp);

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  const nextQuery = typeof next === "string" && next !== "/app" ? `&next=${encodeURIComponent(next)}` : "";

  if (!showSignIn) {
    return (
      <main className={`auth-entry-page ${isNativeApp ? "auth-page--native" : ""}`}>
        <section className="auth-entry-stage">
          <div className="auth-entry-visual">
            <Image src="/branding/girl_front.png" alt="FitSculpt" fill priority className="auth-entry-image" />
          </div>
          <div className="auth-entry-language">
            <LanguageSwitcher />
          </div>
          <div className="auth-entry-content">
            <div className="auth-entry-brand">
              <Image src="/branding/logo.png" alt="FitSculpt" width={44} height={44} />
              <span>FitSculpt</span>
            </div>
            <h1>{t("auth.appEntryTitle")}</h1>
            <p>{t("auth.appEntrySubtitle")}</p>

            <Link href="/onboarding" className="btn auth-entry-cta">
              {t("auth.appEntryPrimaryCta")}
            </Link>

            <p className="auth-entry-login-link">
              {t("auth.appEntrySecondaryPrefix")}{" "}
              <Link href={`/login?view=signin${nextQuery}`} className="link">
                {t("auth.appEntrySecondaryCta")}
              </Link>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`auth-signin-page ${isNativeApp ? "auth-page--native" : ""}`}>
      <section className="auth-signin-shell">
        <div className="auth-signin-topbar">
          <Link href="/login" className="auth-signin-back" aria-label={t("auth.backToStart")}>←</Link>
          <div className="auth-signin-brand">
            <Image src="/branding/logo.png" alt="FitSculpt" width={28} height={28} />
            <span>FitSculpt</span>
          </div>
        </div>

        <div className="auth-signin-content">
          <div className="auth-header auth-signin-header">
            <h2 className="section-title">{t("auth.loginTitle")}</h2>
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
              emailHelper: "",
              password: t("auth.password"),
              passwordHelper: "",
              forgotPassword: t("auth.forgotPassword"),
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

          <p className="auth-signin-forgot">
            <a href="/forgot-password" className="link">
              {t("auth.forgotPassword")}
            </a>
          </p>

          <div className="auth-footer auth-signin-links">
            <p className="muted">
              {t("auth.noAccount")}{" "}
              <Link href="/onboarding" className="link">
                {t("auth.createAccount")}
              </Link>
            </p>
            {unverified ? <ResendVerificationButton /> : null}
          </div>
        </div>

        <footer className="auth-signin-legal">
          <a href="#" className="link-muted">{t("auth.termsLabel")}</a>
          <a href="#" className="link-muted">{t("auth.privacyLabel")}</a>
          <a href="#" className="link-muted">{t("auth.supportLabel")}</a>
        </footer>
      </section>
    </main>
  );
}
