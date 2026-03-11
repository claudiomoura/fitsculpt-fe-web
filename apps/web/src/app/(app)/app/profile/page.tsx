import ProfileSummaryClient from "./ProfileSummaryClient";
import { getServerT } from "@/lib/serverI18n";
import { ButtonLink } from "@/components/ui/Button";
import { V0ProfileShell } from "@/components/v0";

export default async function ProfilePage() {
  const { t } = await getServerT();

  return (
    <V0ProfileShell
      title={t("app.profileTitle")}
      subtitle={t("app.profileSubtitle")}
      actions={
        <ButtonLink variant="secondary" href="/app/settings">
          {t("nav.settings")}
        </ButtonLink>
      }
    >
      <div className="page">
        <ProfileSummaryClient />
      </div>
    </V0ProfileShell>
  );
}
