"use client";

import { ButtonLink } from "@/design-system/components/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/design-system/components/Card";
import { useLanguage } from "@/context/LanguageProvider";

export default function TrainerHubLockedCard() {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("trainer.gymRequiredTitle")}</CardTitle>
        <CardDescription>{t("trainer.gymRequiredDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ButtonLink href="/app/gym" variant="secondary">{t("nav.gym")}</ButtonLink>
      </CardContent>
    </Card>
  );
}
