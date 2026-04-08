import { registerAction } from "../login/actions";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/serverI18n";
import RegisterForm from "./RegisterForm";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/components/Icon";

type SearchParams =
  | { error?: string; onboarding?: string; next?: string }
  | Promise<{ error?: string; onboarding?: string; next?: string }>;

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { t } = await getServerT();
  const sp = (await Promise.resolve(searchParams)) || {};
  const error = sp.error === "1";
  const promoError = sp.error === "promo";
  const fromOnboarding = sp.onboarding === "1";
  const next = typeof sp.next === "string" ? sp.next : "/app";

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  return (
    <main className="auth-card card">
      <div className="auth-header">
        <Badge variant="muted">{fromOnboarding ? t("auth.activateBetaBadge") : t("auth.registerBadge")}</Badge>
        <h1 className="section-title">{fromOnboarding ? t("auth.activateBetaTitle") : t("auth.registerTitle")}</h1>
        <p className="section-subtitle">{fromOnboarding ? t("auth.activateBetaSubtitle") : t("auth.registerSubtitle")}</p>
      </div>

      {(error || promoError) && (
        <div className="status-card status-card--warning">
          <div className="inline-actions-sm">
            <Icon name="warning" />
            <strong>{t("auth.registerIssueTitle")}</strong>
          </div>
          <p className="muted">{promoError ? t("auth.promoError") : t("auth.registerError")}</p>
        </div>
      )}

      <RegisterForm
        action={registerAction}
        next={next}
        captureOnboardingDraft={fromOnboarding}
        labels={{
          name: t("auth.name"),
          nameHelper: t("auth.nameHelper"),
          email: t("auth.email"),
          emailHelper: t("auth.emailHelper"),
          password: t("auth.password"),
          passwordHelper: t("auth.passwordHelper"),
          promoCode: t("auth.promoCode"),
          promoHelper: t("auth.promoHelper"),
          submit: fromOnboarding ? t("auth.activateBetaSubmit") : t("auth.registerSubmit"),
          loading: t("auth.registerLoading"),
          showPassword: t("auth.showPassword"),
          hidePassword: t("auth.hidePassword"),
        }}
      />

      <div className="auth-footer">
        <p className="muted m-0">{t("auth.verifyHint")}</p>
      </div>
    </main>
  );
}
