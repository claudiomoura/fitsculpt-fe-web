"use client";

import { useEffect } from "react";
import { identifyAnalyticsUser, initAnalytics, resetAnalyticsUser } from "@/lib/analytics";
import { fetchAuthMe } from "@/lib/authDedup";

export default function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();

    let active = true;

    const syncIdentity = async () => {
      try {
        const user = await fetchAuthMe();
        if (!active) return;
        const userId = (user as Record<string, unknown>)?.id as string | null | undefined;
        if (userId) {
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
