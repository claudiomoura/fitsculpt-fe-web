export const ADMIN_TESTER_MODE_KEY = "fitsculpt.adminTesterMode";

export function isTesterModeEnabled(value: string | null | undefined): boolean {
  return value === "enabled";
}

export function resolveTesterModeFromQueryParam(value: string | null): boolean {
  return value === "on";
}

