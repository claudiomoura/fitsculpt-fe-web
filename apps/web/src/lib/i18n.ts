import es from "@/messages/es.json";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

export const messages = { es, en, pt } as const;

export type Locale = keyof typeof messages;
export type MessageValues = Record<string, string | number | boolean | null | undefined>;

export const DEFAULT_LOCALE: Locale = "es";

export function resolveLocale(value?: string | null): Locale {
  if (!value) return DEFAULT_LOCALE;

  const normalized = value.toLowerCase();
  if (normalized === "en" || normalized === "en-us") return "en";
  if (normalized === "pt" || normalized === "pt-pt" || normalized === "pt_pt") return "pt";

  return "es";
}

export function getMessage(locale: Locale, key: string, values?: MessageValues) {
  const parts = key.split(".");
  const fallbacks = [locale, "en", DEFAULT_LOCALE].filter((value, index, array): value is Locale => array.indexOf(value) === index);

  let message: string | null = null;

  for (const fallbackLocale of fallbacks) {
    let current: unknown = messages[fallbackLocale];

    for (const part of parts) {
      if (typeof current !== "object" || current === null) {
        current = null;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (typeof current === "string") {
      message = current;
      break;
    }
  }

  if (!message) return key;
  if (!values) return message;

  return message.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = values[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function getLocaleCookie(locale: Locale) {
  return `fs-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function getLocaleCode(locale: Locale) {
  if (locale === "en") return "en-US";
  if (locale === "pt") return "pt-PT";
  return "es-ES";
}
