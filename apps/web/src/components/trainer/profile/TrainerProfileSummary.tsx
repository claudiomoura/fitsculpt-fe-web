import type { ProfileData } from "@/lib/profile";
import type { GymMembership } from "@/lib/gymMembership";
import { ButtonLink } from "@/components/ui/Button";

type Translator = (key: string, values?: Record<string, string | number>) => string;

type Props = {
  profile: ProfileData;
  loading: boolean;
  t: Translator;
  gymMembership: GymMembership;
};

export default function TrainerProfileSummary({ profile, loading, t, gymMembership }: Props) {
  const formatValue = (value: string | number | null | undefined, suffix?: string) => {
    if (value === null || value === undefined) return t("profile.noData");
    if (typeof value === "string" && value.trim().length === 0) return t("profile.noData");
    return suffix ? `${value} ${suffix}` : String(value);
  };

  const hasPreferenceData =
    !!profile.trainingPreferences.level ||
    !!profile.trainingPreferences.daysPerWeek ||
    !!profile.trainingPreferences.sessionTime ||
    !!profile.trainingPreferences.focus ||
    !!profile.trainingPreferences.workoutLength;

  return (
    <>
      <section className="card">
        <div className="section-head">
          <div>
            <h3 className="section-title section-title-xs">{t("profile.trainerHeaderTitle")}</h3>
            <p className="section-subtitle">{t("profile.trainerHeaderSubtitle")}</p>
          </div>
          <span className="badge">{t("profile.trainerRoleBadge")}</span>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.name")}</div>
            <div className="info-value">{formatValue(profile.name)}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title section-title-xs">{t("profile.trainerDataTitle")}</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">{t("profile.age")}</div>
            <div className="info-value">{loading ? t("common.loading") : formatValue(profile.age)}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.height")}</div>
            <div className="info-value">{loading ? t("common.loading") : formatValue(profile.heightCm, "cm")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.weight")}</div>
            <div className="info-value">{loading ? t("common.loading") : formatValue(profile.weightKg, "kg")}</div>
          </div>
          <div className="info-item">
            <div className="info-label">{t("profile.trainingEquipment")}</div>
            <div className="info-value">
              {profile.trainingPreferences.equipment
                ? t(profile.trainingPreferences.equipment === "home" ? "profile.trainingEquipmentHome" : "profile.trainingEquipmentGym")
                : t("profile.noData")}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h3 className="section-title section-title-xs">{t("profile.trainerGymTitle")}</h3>
          <ButtonLink href="/app/gym">{t("profile.trainerGoToGym")}</ButtonLink>
        </div>
        {gymMembership.gymName ? (
          <p className="muted">{gymMembership.gymName}</p>
        ) : (
          <p className="muted">{t("profile.trainerGymEmpty")}</p>
        )}
      </section>

      {hasPreferenceData ? (
        <section className="card">
          <h3 className="section-title section-title-xs">{t("profile.trainerPreferencesTitle")}</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">{t("profile.trainingLevel")}</div>
              <div className="info-value">
                {profile.trainingPreferences.level
                  ? t(
                      profile.trainingPreferences.level === "beginner"
                        ? "profile.trainingLevelBeginner"
                        : profile.trainingPreferences.level === "intermediate"
                          ? "profile.trainingLevelIntermediate"
                          : "profile.trainingLevelAdvanced"
                    )
                  : t("profile.noData")}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.trainingDays")}</div>
              <div className="info-value">{formatValue(profile.trainingPreferences.daysPerWeek)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">{t("profile.trainingSessionTime")}</div>
              <div className="info-value">
                {profile.trainingPreferences.sessionTime
                  ? t(
                      profile.trainingPreferences.sessionTime === "short"
                        ? "profile.trainingSessionShort"
                        : profile.trainingPreferences.sessionTime === "long"
                          ? "profile.trainingSessionLong"
                          : "profile.trainingSessionMedium"
                    )
                  : t("profile.noData")}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
