"use client";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";

export default function BillingClient() {
  const { t } = useLanguage();
  const { entitlements, loading, error, reload } = useAuthEntitlements();

  const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL;

  return (
    <section className="stack-md" aria-live="polite">
      <header className="stack-sm">
        <h1 className="section-title">{t("billing.title")}</h1>
        <p className="section-subtitle">{t("billing.subtitle")}</p>
      </header>

      {loading ? <LoadingState ariaLabel={t("billing.loadingStatus")} showCard={false} /> : null}

      {!loading && error ? (
        <ErrorState
          title={t("billing.loadError")}
          retryLabel={t("ui.retry")}
          onRetry={() => void reload()}
          wrapInCard
          ariaLabel={t("billing.loadError")}
        />
      ) : null}

      {!loading && !error ? (
        <div className="stack-md">
          <Card>
            <CardHeader>
              <CardTitle>{t("billing.currentPlanLabel")}</CardTitle>
              <CardDescription>{t("billing.planDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="stack-sm">
              {entitlements.status === "known" ? (
                <>
                  <Badge variant={entitlements.tier === "FREE" ? "muted" : "success"}>
                    {t(`billing.tier.${entitlements.tier.toLowerCase()}`)}
                  </Badge>
                  <ul className="m-0" style={{ paddingLeft: 20 }}>
                    <li>{`${t("billing.features.canUseAI")}: ${entitlements.features.canUseAI ? t("ui.yes") : t("ui.no")}`}</li>
                    <li>{`${t("billing.features.hasProSupport")}: ${entitlements.features.hasProSupport ? t("ui.yes") : t("ui.no")}`}</li>
                    <li>{`${t("billing.features.hasGymAccess")}: ${entitlements.features.hasGymAccess ? t("ui.yes") : t("ui.no")}`}</li>
                  </ul>
                </>
              ) : (
                <p className="muted m-0">{t("billing.planUnavailable")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("settings.sections.support.title")}</CardTitle>
              <CardDescription>{t("billing.supportDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {supportUrl ? (
                <ButtonLink href={supportUrl} target="_blank" rel="noreferrer" variant="secondary">
                  {t("billing.supportAction")}
                </ButtonLink>
              ) : (
                <p className="muted m-0">{t("billing.supportPlaceholder")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
