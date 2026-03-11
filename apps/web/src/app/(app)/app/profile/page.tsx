import ProfileSummaryClient from "./ProfileSummaryClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0PageHero } from "@/components/surfaces/V0PageHero";
import { V0ProfileShell } from "@/components/v0";

export default async function ProfilePage() {
  const { t } = await getServerT();
  return (
    <div className="page">
      <V0PageHero
        eyebrow={t("nav.profile")}
        title={t("app.profileTitle")}
        subtitle={t("app.profileSubtitle")}
        actions={
          <ButtonLink variant="secondary" href="/app/settings">
            {t("nav.settings")}
          </ButtonLink>
        }
      />
      <V0ProfileShell>
        <ProfileSummaryClient />
      </V0ProfileShell>
    </div>
  );
}
