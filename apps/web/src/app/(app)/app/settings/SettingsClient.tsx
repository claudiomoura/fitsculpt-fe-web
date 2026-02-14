"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import { useAuthEntitlements } from "@/hooks/useAuthEntitlements";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { extractGymMembership } from "@/lib/gymMembership";
import { useAccess } from "@/lib/useAccess";

type SettingsSection = "account" | "profile" | "billing" | "notifications" | "support";

const sectionOrder: SettingsSection[] = ["account", "profile", "billing", "notifications", "support"];

export default function SettingsClient() {
  const { t } = useLanguage();
  const { isAdmin, isDev } = useAccess();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { entitlements } = useAuthEntitlements();

  const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL;
  const hasGymSelectionEndpoint = false;
  const canSeeImplementationNote = (isAdmin || isDev) && !hasGymSelectionEndpoint;

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setHasError(false);
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("profile-load-failed");
        }
        const data = (await response.json()) as Partial<ProfileData> | null;
        if (!mounted) return;
        setProfile({ ...defaultProfile, ...data });
      } catch {
        if (!mounted) return;
        setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const profileName = (profile?.name ?? "").trim();
  const gymMembership = extractGymMembership(profile);

  const sections = useMemo(
    () => ({
      account: {
        title: t("settings.sections.account.title"),
        description: t("settings.sections.account.description"),
        content: profileName ? profileName : t("settings.sections.account.empty"),
      },
      profile: {
        title: t("settings.sections.profile.title"),
        description: t("settings.sections.profile.description"),
        ctaLabel: t("settings.sections.profile.action"),
        href: "/app/profile",
      },
      billing: {
        title: t("settings.sections.billing.title"),
        description: t("settings.sections.billing.description"),
        ctaLabel: t("settings.sections.billing.action"),
        href: "/app/settings/billing",
        statusLabel:
          gymMembership.state === "in_gym"
            ? t("settings.sections.billing.gymStatusYes")
            : gymMembership.state === "not_in_gym"
              ? t("settings.sections.billing.gymStatusNo")
              : t("settings.sections.billing.gymStatusUnknown"),
      },
      notifications: {
        title: t("settings.sections.notifications.title"),
        description: t("settings.sections.notifications.description"),
        emptyTitle: t("settings.sections.notifications.emptyTitle"),
      },
      support: {
        title: t("settings.sections.support.title"),
        description: t("settings.sections.support.description"),
        emptyTitle: t("settings.sections.support.emptyTitle"),
        action: t("settings.sections.support.action"),
      },
    }),
    [gymMembership.state, profileName, t]
  );

  if (isLoading) {
    return <LoadingState ariaLabel={t("settings.loadingAria")} title={t("settings.loadingTitle")} lines={5} />;
  }

  if (hasError) {
    return (
      <ErrorState
        title={t("settings.errorTitle")}
        description={t("settings.errorDescription")}
        actions={[{ label: t("settings.profileFallbackAction"), href: "/app/profile", variant: "secondary" }]}
        wrapInCard
      />
    );
  }

  return (
    <section className="form-stack" aria-labelledby="settings-title">
      <header className="form-stack">
        <h1 id="settings-title" className="section-title">
          {t("app.settingsTitle")}
        </h1>
        <p className="section-subtitle">{t("settings.subtitle")}</p>
      </header>

      <div className="list-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {sectionOrder.map((sectionKey) => {
          if (sectionKey === "notifications") {
            const section = sections.notifications;
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <EmptyState title={section.emptyTitle} icon="info" />
                </CardContent>
              </Card>
            );
          }

          if (sectionKey === "support") {
            const section = sections.support;
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardFooter style={{ justifyContent: "flex-start" }}>
                  {supportUrl ? (
                    <ButtonLink href={supportUrl} target="_blank" rel="noreferrer" variant="secondary">
                      {section.action}
                    </ButtonLink>
                  ) : (
                    <p className="muted m-0">{section.emptyTitle}</p>
                  )}
                </CardFooter>
              </Card>
            );
          }

          if (sectionKey === "account") {
            const section = sections.account;
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="m-0" style={{ fontWeight: 600 }}>
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            );
          }

          const section = sections[sectionKey];
          return (
            <Card key={sectionKey}>
              <CardHeader>
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
              {sectionKey === "billing" ? (
                <CardContent>
                  <p className="muted m-0">{sections.billing.statusLabel}</p>
                  {canSeeImplementationNote ? <p className="muted m-0">{t("billing.gym.linkRequiresImplementation")}</p> : null}
                </CardContent>
              ) : null}
              <CardFooter style={{ justifyContent: "flex-start" }}>
                <ButtonLink href={section.href} variant="secondary">
                  {section.ctaLabel}
                </ButtonLink>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
