"use client";

import { useLanguage } from "@/context/LanguageProvider";
import { useTheme } from "@/context/ThemeProvider";

type ThemeToggleProps = {
  showLabel?: boolean;
};

export default function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? t("ui.themeDark") : t("ui.themeLight");

  return (
    <button
      type="button"
      className={`nav-icon-button ${showLabel ? "has-label" : ""}`}
      onClick={toggleTheme}
      aria-label={label}
    >
      <span aria-hidden="true" className="nav-icon">
        {isDark ? "🌙" : "☀️"}
      </span>
      {showLabel ? <span className="nav-icon-label">{label}</span> : null}
    </button>
  );
}
