import Link from "next/link";
import { getServerT } from "@/lib/serverI18n";

export default async function SettingsPage() {
  const { t } = await getServerT();
  return (
    <section className="card">
      <h1 className="section-title">{t("app.settingsTitle")}</h1>
      <p className="section-subtitle">{t("app.settingsSubtitle")}</p>
      <div style={{ marginTop: 16 }}>
        <Link href="/app/settings/billing" className="btn">
          Ir a facturación
        </Link>
      </div>
    </section>
  );
}
