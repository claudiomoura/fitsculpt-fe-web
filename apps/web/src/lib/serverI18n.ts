import { cookies } from "next/headers";
import { getLocaleCode, getMessage, resolveLocale } from "@/lib/i18n";

export async function getServerLocale() {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get("fs-locale")?.value ?? null);
}

export async function getServerT() {
  const locale = await getServerLocale();
  return {
    locale,
    localeCode: getLocaleCode(locale),
    t: (key: string) => getMessage(locale, key),
  };
}
