import type { ReactNode } from "react";
import { useLanguage } from "@/context/LanguageProvider";

type BodyFatOption = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  imageSrc?: string | null;
};

type BodyFatSelectorProps = {
  value: number | null;
  onChange: (value: number) => void;
};

const BODY_FAT_OPTIONS: BodyFatOption[] = [
  { id: "lt10", label: "< 10%", value: 8, min: 0, max: 9, imageSrc: null },
  { id: "20", label: "20%", value: 20, min: 10, max: 24, imageSrc: null },
  { id: "30", label: "30%", value: 30, min: 25, max: 34, imageSrc: null },
  { id: "40", label: "40%", value: 40, min: 35, max: 49, imageSrc: null },
  { id: "gt50", label: "> 50%", value: 55, min: 50, max: 100, imageSrc: null },
];

function getActiveOption(value: number | null) {
  if (value === null) return null;
  return BODY_FAT_OPTIONS.find((option) => value >= option.min && value <= option.max) ?? null;
}

function renderPreview(option: BodyFatOption, label: string): ReactNode {
  if (option.imageSrc) {
    return (
      <img
        src={option.imageSrc}
        alt={label}
        style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: 180,
        borderRadius: 12,
        background: "var(--accent-soft)",
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
        fontWeight: 600,
      }}
    >
      {option.label}
    </div>
  );
}

export default function BodyFatSelector({ value, onChange }: BodyFatSelectorProps) {
  const { t } = useLanguage();
  const activeOption = getActiveOption(value);

  return (
    <div className="form-stack">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {BODY_FAT_OPTIONS.map((option) => {
          const isActive = activeOption?.id === option.id;
          const previewLabel = `${t("profile.bodyFatExample")} ${option.label}`;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.value)}
              className="feature-card"
              style={{
                borderColor: isActive ? "var(--accent)" : "var(--border)",
                textAlign: "left",
                cursor: "pointer",
              }}
              aria-pressed={isActive}
            >
              {renderPreview(option, previewLabel)}
              <div style={{ marginTop: 8, fontWeight: 600 }}>{option.label}</div>
            </button>
          );
        })}
      </div>

      <p className="muted" style={{ marginTop: 8 }}>
        {t("profile.bodyFatSelection")}: {activeOption ? activeOption.label : t("profile.bodyFatSelectionEmpty")}. {t("profile.bodyFatDisclaimer")}
      </p>
    </div>
  );
}
