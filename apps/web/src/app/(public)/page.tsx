import { messages } from "@/lib/i18n";
import { getServerT } from "@/lib/serverI18n";
import { LandingHomePage } from "@/components/landing/LandingHomePage";

export default async function HomePage() {
  const { locale } = await getServerT();
  const content = messages[locale].landingRedesign;

  return <LandingHomePage content={content} />;
}
