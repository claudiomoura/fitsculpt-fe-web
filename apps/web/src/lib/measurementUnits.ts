export type MeasurementSystem = "metric" | "imperial";

const STORAGE_KEY = "fs-measurement-system";

export function getStoredMeasurementSystem(): MeasurementSystem {
  if (typeof window === "undefined") return "metric";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "imperial" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

export function saveMeasurementSystem(system: MeasurementSystem) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, system);
    window.dispatchEvent(new Event("settings:measurement-system"));
  } catch {
    // ignore storage errors
  }
}

export function getMeasurementSystemLabel(
  system: MeasurementSystem,
  t: (key: string) => string
) {
  if (system === "imperial") {
    return `${t("units.pounds")}/${t("units.inches")}`;
  }
  return `${t("units.kilograms")}/${t("units.centimeters")}`;
}
