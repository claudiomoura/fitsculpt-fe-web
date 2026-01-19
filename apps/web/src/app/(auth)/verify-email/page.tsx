import { getServerT } from "@/lib/serverI18n";
import VerifyEmailClient from "./VerifyEmailClient";

type SearchParams = { token?: string } | Promise<{ token?: string }>;

export default async function VerifyEmailPage({ searchParams }: { searchParams?: SearchParams }) {
  const { t } = getServerT();
  const sp = (await Promise.resolve(searchParams)) || {};
  const token = sp.token ?? null;

  return (
    <main className="auth-card card">
      <div>
        <h1 className="section-title">{t("auth.verifyTitle")}</h1>
        <p className="section-subtitle">{t("auth.verifySubtitle")}</p>
      </div>
      <VerifyEmailClient token={token} />
    </main>
  );
}
