"use client";

import { useEffect } from "react";
import { identifyAnalyticsUser, initAnalytics, resetAnalyticsUser } from "@/lib/analytics";

async function fetchAuthMe() {
  const response = await fetch("/api/auth/me", { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as {
    id?: string | null;
    email?: string | null;
    subscriptionPlan?: string | null;
    plan?: string | null;
  };
}

export default function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();

    let active = true;

    const syncIdentity = async () => {
      try {
        const user = await fetchAuthMe();
        if (!active) return;
        if (user?.id) {
          identifyAnalyticsUser(user);
        } else {
          resetAnalyticsUser();
        }
      } catch {
        if (!active) return;
      }
    };

    void syncIdentity();
    window.addEventListener("auth:refresh", syncIdentity);

    return () => {
      active = false;
      window.removeEventListener("auth:refresh", syncIdentity);
    };
  }, []);

  return null;
}
