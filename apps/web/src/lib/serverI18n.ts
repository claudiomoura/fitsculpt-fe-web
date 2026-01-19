import { cookies } from "next/headers";
import { getLocaleCode, getMessage, resolveLocale } from "@/lib/i18n";

export function getServerLocale() {
  return resolveLocale(cookies().get("fs-locale")?.value ?? null);
}

export function getServerT() {
  const locale = getServerLocale();
  return {
    locale,
    localeCode: getLocaleCode(locale),
    t: (key: string) => getMessage(locale, key),
  };
}
