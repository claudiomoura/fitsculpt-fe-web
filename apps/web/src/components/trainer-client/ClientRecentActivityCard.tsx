"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageProvider";

type ActivityState = "ready" | "loading" | "empty" | "error";

type ClientRecentActivityCardProps = {
  state: ActivityState;
  activities?: ReactNode[];
  onRetry?: () => void;
};

export function ClientRecentActivityCard({ state, activities = [], onRetry }: ClientRecentActivityCardProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trainerClient360.activity.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {state === "loading" ? <p className="muted">{t("trainerClient360.activity.loading")}</p> : null}

        {state === "empty" ? <p className="muted">{t("trainerClient360.activity.empty")}</p> : null}

        {state === "error" ? (
          <div className="form-stack">
            <p className="muted" style={{ margin: 0 }}>{t("trainerClient360.activity.error")}</p>
            {onRetry ? (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                {t("ui.retry")}
              </Button>
            ) : null}
          </div>
        ) : null}

        {state === "ready" ? (
          activities.length ? (
            <ul className="form-stack" style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {activities.map((activity, index) => (
                <li key={index}>{activity}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("trainerClient360.activity.empty")}</p>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
