"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageProvider";

type ProfileValue = string | number | null | undefined;

type ClientProfileSummaryProps = {
  age?: ProfileValue;
  height?: ProfileValue;
  weight?: ProfileValue;
};

function renderValue(value: ProfileValue, fallback: string) {
  if (value === null || value === undefined || value === "") {
    return <span className="muted">{fallback}</span>;
  }

  return <span>{value}</span>;
}

export function ClientProfileSummary({ age, height, weight }: ClientProfileSummaryProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trainerClient360.profile.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="form-stack" style={{ margin: 0 }}>
          <div>
            <dt className="muted">{t("trainerClient360.profile.age")}</dt>
            <dd style={{ margin: 0 }}>{renderValue(age, t("trainerClient360.common.notProvided"))}</dd>
          </div>
          <div>
            <dt className="muted">{t("trainerClient360.profile.height")}</dt>
            <dd style={{ margin: 0 }}>{renderValue(height, t("trainerClient360.common.notProvided"))}</dd>
          </div>
          <div>
            <dt className="muted">{t("trainerClient360.profile.weight")}</dt>
            <dd style={{ margin: 0 }}>{renderValue(weight, t("trainerClient360.common.notProvided"))}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
