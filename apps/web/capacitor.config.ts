import type { CapacitorConfig } from "@capacitor/cli";

function resolveServerUrl() {
  const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

  if (!serverUrl || serverUrl === "https://example.com") {
    // Default to localhost for development/testing
    return "http://localhost:3000";
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
    allowMixedContent: true, // Allow http for localhost dev
  },
};

export default config;
