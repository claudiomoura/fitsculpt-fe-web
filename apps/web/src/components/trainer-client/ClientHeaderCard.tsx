"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageProvider";

type ClientHeaderCardProps = {
  clientName: string;
  statusSlot?: ReactNode;
  nextReviewDateSlot?: ReactNode;
};

export function ClientHeaderCard({ clientName, statusSlot, nextReviewDateSlot }: ClientHeaderCardProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{clientName}</CardTitle>
      </CardHeader>
      <CardContent className="form-stack">
        <div>
          <p className="muted" style={{ margin: 0 }}>{t("trainerClient360.header.status")}</p>
          <div>{statusSlot ?? <span className="muted">{t("trainerClient360.common.notProvided")}</span>}</div>
        </div>
        <div>
          <p className="muted" style={{ margin: 0 }}>{t("trainerClient360.header.nextReviewDate")}</p>
          <div>{nextReviewDateSlot ?? <span className="muted">{t("trainerClient360.common.notProvided")}</span>}</div>
        </div>
      </CardContent>
    </Card>
  );
}
