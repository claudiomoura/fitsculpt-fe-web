import type { CapacitorConfig } from "@capacitor/cli";

function resolveServerUrl() {
  const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

  if (!serverUrl || serverUrl === "https://example.com") {
    throw new Error(
      "CAPACITOR_SERVER_URL must point to the real public FitSculpt web URL before syncing or building the Android shell.",
    );
  }

  return serverUrl;
}

const serverUrl = resolveServerUrl();

const config: CapacitorConfig = {
  appId: "com.fitsculpt.beta",
  appName: "FitSculpt",
  webDir: "capacitor-shell",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
