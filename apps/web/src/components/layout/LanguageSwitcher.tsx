"use client";

import { useLanguage } from "@/context/LanguageProvider";

type LanguageSwitcherProps = {
  showLabel?: boolean;
};

export default function LanguageSwitcher({ showLabel = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className={`nav-language ${showLabel ? "has-label" : ""}`}>
      {showLabel ? <span className="nav-language-label">{t("ui.language")}</span> : null}
      <div className="nav-language-toggle" role="group" aria-label={t("ui.language")}>
        <button
          type="button"
          className={`nav-language-option ${locale === "es" ? "is-active" : ""}`}
          aria-pressed={locale === "es"}
          aria-label={`${t("ui.language")}: ES`}
          onClick={() => setLocale("es")}
        >
          ES
        </button>
        <button
          type="button"
          className={`nav-language-option ${locale === "en" ? "is-active" : ""}`}
          aria-pressed={locale === "en"}
          aria-label={`${t("ui.language")}: EN`}
          onClick={() => setLocale("en")}
        >
          EN
        </button>
      </div>
    </div>
  );
}
