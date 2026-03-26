import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  
  enabled: process.env.NEXT_PUBLIC_SENTRY_DSN !== undefined,
  
  tracesSampleRate: 1.0,
  
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  beforeSend(event) {
    if (process.env.NEXT_PUBLIC_APP_ENV === "development") {
      console.log("[Sentry] Event captured:", event);
    }
    return event;
  },
});
