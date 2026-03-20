"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Button, ButtonLink } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { ErrorState, LoadingState } from "@/components/states";
import { useLanguage } from "@/context/LanguageProvider";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { defaultProfile, type ProfileData } from "@/lib/profile";
import { extractGymMembership } from "@/lib/gymMembership";
import { useAccess } from "@/lib/useAccess";
import {
  getMeasurementSystemLabel,
  getStoredMeasurementSystem,
  saveMeasurementSystem,
  type MeasurementSystem,
} from "@/lib/measurementUnits";

type SettingsSection = "account" | "language" | "units" | "profile" | "billing" | "notifications" | "support";
type MembershipState = "none" | "pending" | "active" | "rejected" | "unknown";

const sectionOrder: SettingsSection[] = ["account", "language", "units", "profile", "billing", "notifications", "support"];

export default function SettingsClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin, isDev } = useAccess();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [membershipState, setMembershipState] = useState<MembershipState>("unknown");
  const [membershipGymName, setMembershipGymName] = useState<string | null>(null);
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>("metric");
  const [draftMeasurementSystem, setDraftMeasurementSystem] = useState<MeasurementSystem>("metric");
  const [isUnitsModalOpen, setIsUnitsModalOpen] = useState(false);

  const supportUrl = process.env.NEXT_PUBLIC_SUPPORT_URL;
  const hasGymSelectionEndpoint = false;
  const canSeeImplementationNote = (isAdmin || isDev) && !hasGymSelectionEndpoint;

  useEffect(() => {
    const storedSystem = getStoredMeasurementSystem();
    setMeasurementSystem(storedSystem);
    setDraftMeasurementSystem(storedSystem);
  }, []);

  useEffect(() => {
    if (searchParams.get("modal") !== "units") return;
    const storedSystem = getStoredMeasurementSystem();
    setDraftMeasurementSystem(storedSystem);
    setIsUnitsModalOpen(true);
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setHasError(false);
        const [response, membershipResponse] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/gym/me", { cache: "no-store", credentials: "include" }),
        ]);
        if (!response.ok) {
          throw new Error("profile-load-failed");
        }
        const data = (await response.json()) as Partial<ProfileData> | null;
        let membershipPayload: Record<string, unknown> | null = null;

        if (membershipResponse.ok) {
          membershipPayload = (await membershipResponse.json()) as Record<string, unknown>;
        } else if (membershipResponse.status === 404 || membershipResponse.status === 405) {
          const legacyMembershipResponse = await fetch("/api/gyms/membership", { cache: "no-store", credentials: "include" });
          if (legacyMembershipResponse.ok) {
            membershipPayload = (await legacyMembershipResponse.json()) as Record<string, unknown>;
          }
        }

        const rawState = String(membershipPayload?.state ?? "").trim().toLowerCase();
        const nextState: MembershipState =
          rawState === "none" || rawState === "pending" || rawState === "active" || rawState === "rejected" ? rawState : "unknown";
        const gym = membershipPayload?.gym;
        const gymName = typeof gym === "object" && gym !== null ? String((gym as { name?: unknown }).name ?? "").trim() || null : null;

        if (!mounted) return;
        setProfile({ ...defaultProfile, ...data });
        setMembershipState(nextState);
        setMembershipGymName(gymName);
      } catch (_err) {
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
  const unitsValueLabel = getMeasurementSystemLabel(measurementSystem, t);

  const closeUnitsModal = () => {
    setIsUnitsModalOpen(false);
    if (searchParams.get("modal") !== "units") return;
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("modal");
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const openUnitsModal = () => {
    setDraftMeasurementSystem(measurementSystem);
    setIsUnitsModalOpen(true);
  };

  const saveUnitsPreference = () => {
    saveMeasurementSystem(draftMeasurementSystem);
    setMeasurementSystem(draftMeasurementSystem);
    closeUnitsModal();
  };

  const sections = useMemo(
    () => ({
      account: {
        title: t("settings.sections.account.title"),
        description: t("settings.sections.account.description"),
        content: profileName ? profileName : t("settings.sections.account.empty"),
      },
      language: {
        title: t("settings.sections.language.title"),
        description: t("settings.sections.language.description"),
      },
      units: {
        title: t("settings.sections.units.title"),
        description: t("settings.sections.units.description"),
        action: t("settings.sections.units.action"),
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
          membershipState === "pending"
            ? t("settings.sections.billing.gymStatusPending", { gymName: membershipGymName ?? "-" })
            : membershipState === "active"
              ? t("settings.sections.billing.gymStatusActive", { gymName: membershipGymName ?? "-" })
              : membershipState === "rejected"
                ? t("settings.sections.billing.gymStatusRejected")
                : membershipState === "none"
                  ? t("settings.sections.billing.gymStatusNo")
                  : gymMembership.state === "in_gym"
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
    [gymMembership.state, membershipGymName, membershipState, profileName, t]
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
    <section className="form-stack content-page-shell" aria-labelledby="settings-title">
      <header className="form-stack settings-header">
        <h1 id="settings-title" className="section-title">
          {t("app.settingsTitle")}
        </h1>
        <p className="section-subtitle">{t("settings.subtitle")}</p>
        <div className="inline-actions-sm settings-header-actions">
          <ButtonLink href="/app/profile/edit">{t("profile.editProfile")}</ButtonLink>
          <ButtonLink href="/app/settings/password" variant="ghost">
            {t("profile.passwordTitle")}
          </ButtonLink>
        </div>
      </header>

      <div className="list-grid settings-grid">
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
                  <p className="muted m-0">{section.emptyTitle}</p>
                </CardContent>
              </Card>
            );
          }

          if (sectionKey === "language") {
            const section = sections.language;
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <LanguageSwitcher showLabel />
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
                <CardFooter className="settings-card-footer">
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

          if (sectionKey === "units") {
            const section = sections.units;
            return (
              <Card key={sectionKey}>
                <CardHeader>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="m-0 settings-value">
                    {unitsValueLabel}
                  </p>
                </CardContent>
                <CardFooter className="settings-card-footer">
                  <Button variant="secondary" onClick={openUnitsModal}>
                    {section.action}
                  </Button>
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
                  <p className="m-0 settings-value">
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
              <CardFooter className="settings-card-footer">
                <ButtonLink href={section.href} variant="secondary">
                  {section.ctaLabel}
                </ButtonLink>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Modal
        open={isUnitsModalOpen}
        onClose={closeUnitsModal}
        title={t("settings.sections.units.modalTitle")}
        description={t("settings.sections.units.modalDescription")}
        footer={
          <div className="inline-actions-sm settings-modal-footer">
            <Button variant="ghost" onClick={closeUnitsModal}>
              {t("ui.cancel")}
            </Button>
            <Button onClick={saveUnitsPreference}>{t("ui.save")}</Button>
          </div>
        }
      >
        <div className="form-stack settings-modal-body">
          <label className="settings-radio-option">
            <input
              type="radio"
              name="measurement-system"
              value="metric"
              checked={draftMeasurementSystem === "metric"}
              onChange={() => setDraftMeasurementSystem("metric")}
            />
            <span>{`${t("units.kilograms")}/${t("units.centimeters")}`}</span>
          </label>
          <label className="settings-radio-option">
            <input
              type="radio"
              name="measurement-system"
              value="imperial"
              checked={draftMeasurementSystem === "imperial"}
              onChange={() => setDraftMeasurementSystem("imperial")}
            />
            <span>{`${t("units.pounds")}/${t("units.inches")}`}</span>
          </label>
        </div>
      </Modal>
    </section>
  );
}
