export const ADMIN_TESTER_MODE_KEY = "fitsculpt.adminTesterMode";
export const HERO_VIDEO_V2_ASSET_PATH = "/branding/hero-loop-v2.mp4";

export function isHeroVideoV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_HERO_VIDEO_V2 !== "0";
}

export function isTesterModeEnabled(value: string | null | undefined): boolean {
  return value === "enabled";
}

export function resolveTesterModeFromQueryParam(value: string | null): boolean {
  return value === "on";
}

