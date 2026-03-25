export type FeatureFlag = 
  | "new_dashboard"
  | "ai_coach"
  | "advanced_analytics"
  | "beta_features"
  | "waitlist_mode";

const defaultFlags: Record<FeatureFlag, boolean> = {
  new_dashboard: false,
  ai_coach: false,
  advanced_analytics: false,
  beta_features: false,
  waitlist_mode: true,
};

function getFlagFromEnv(flag: FeatureFlag): boolean {
  const envKey = `NEXT_PUBLIC_FF_${flag.toUpperCase()}`;
  const envValue = process.env[envKey];
  
  if (envValue === undefined) {
    return defaultFlags[flag];
  }
  
  return envValue === "true" || envValue === "1";
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  if (typeof window === "undefined") {
    return getFlagFromEnv(flag);
  }
  
  return getFlagFromEnv(flag);
}

export function getEnabledFlags(): Record<FeatureFlag, boolean> {
  const flags = {} as Record<FeatureFlag, boolean>;
  
  for (const flag of Object.keys(defaultFlags) as FeatureFlag[]) {
    flags[flag] = isFeatureEnabled(flag);
  }
  
  return flags;
}

export const featureFlags = {
  isEnabled: isFeatureEnabled,
  getAll: getEnabledFlags,
};
