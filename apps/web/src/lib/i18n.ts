import es from "@/messages/es.json";
import en from "@/messages/en.json";

export const messages = { es, en } as const;

export type Locale = keyof typeof messages;
export type MessageValues = Record<string, string | number>;

export const DEFAULT_LOCALE: Locale = "es";

export function resolveLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "es";
}

export function getMessage(locale: Locale, key: string, values?: MessageValues) {
  const parts = key.split(".");
  let current: unknown = messages[locale];
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return key;
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current !== "string") return key;

  if (!values) return current;

  return current.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = values[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function getLocaleCookie(locale: Locale) {
  return `fs-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function getLocaleCode(locale: Locale) {
  return locale === "en" ? "en-US" : "es-ES";
}
