import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim() || "https://example.com";

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
