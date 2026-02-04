"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/context/LanguageProvider";
import { toDateKey } from "@/lib/calendar";
import { useNutritionAdherence } from "@/lib/nutritionAdherence";

export type ToggleConsumidoProps = {
  itemKey?: string | null;
  dateKey?: string | null;
  disabled?: boolean;
} & Omit<ComponentPropsWithoutRef<typeof Button>, "onClick" | "disabled" | "loading">;

export default function ToggleConsumido({
  itemKey,
  dateKey,
  disabled = false,
  variant = "secondary",
  size = "sm",
  ...props
}: ToggleConsumidoProps) {
const { t } = useLanguage();
const { notify } = useToast();

const normalizedItemKey = itemKey?.trim();
const normalizedDateKey = dateKey?.trim();

// dayKey obligatorio para el hook, fallback a "hoy" solo para poder montar el hook
const dayKey = normalizedDateKey ?? toDateKey(new Date());

const { isLoading, error, isConsumed, toggle } = useNutritionAdherence(dayKey);

// No calcules consumed si falta itemKey o dateKey real
const consumed =
  normalizedItemKey && normalizedDateKey ? isConsumed(normalizedItemKey, normalizedDateKey) : false;

const isDisabled =
  disabled || isLoading || Boolean(error) || !normalizedItemKey || !normalizedDateKey;
  const handleToggle = () => {
    if (!normalizedItemKey || !normalizedDateKey) return;
    const nextConsumed = !consumed;
    toggle(normalizedItemKey, normalizedDateKey);
    if (nextConsumed) {
      notify({
        title: t("nutrition.adherenceToastTitle"),
        description: t("nutrition.adherenceToastDescription"),
        variant: "success",
      });
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      loading={isLoading}
      disabled={isDisabled}
      aria-pressed={consumed}
      onClick={handleToggle}
      {...props}
    >
      {consumed ? t("nutrition.adherenceConsumedLabel") : t("nutrition.adherenceMarkLabel")}
    </Button>
  );
}
