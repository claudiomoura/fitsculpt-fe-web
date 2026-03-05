"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageProvider";
import { toDateKey } from "@/lib/calendar";
import { createTrackingEntry } from "@/services/tracking";

type QuickAddMealModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (savedMeal: { calories: number; protein: number }) => void;
  supportSearch?: boolean;
};

export function QuickAddMealModal({ open, onClose, onSaved, supportSearch = false }: QuickAddMealModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const errors = useMemo(() => {
    const nameValid = name.trim().length > 0;
    const caloriesValue = Number(calories);
    const caloriesValid = Number.isFinite(caloriesValue) && caloriesValue > 0;

    return {
      name: nameValid ? "" : t("today.quickAddMealNameError"),
      calories: caloriesValid ? "" : t("today.quickAddMealCaloriesError"),
    };
  }, [calories, name, t]);

  const hasErrors = Boolean(errors.name || errors.calories);

  const resetForm = () => {
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setTouched(false);
    setSubmitError("");
    setIsSaving(false);
  };

  async function handleSave() {
    setTouched(true);
    setSubmitError("");
    if (hasErrors || isSaving) return;

    setIsSaving(true);

    try {
      const caloriesValue = Number(calories);
      const proteinValue = Number.isFinite(Number(protein)) ? Math.max(0, Number(protein)) : 0;
      const carbsValue = Number.isFinite(Number(carbs)) ? Math.max(0, Number(carbs)) : 0;
      const fatValue = Number.isFinite(Number(fat)) ? Math.max(0, Number(fat)) : 0;

      const foodResponse = await fetch("/api/user-foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          calories: caloriesValue,
          protein: proteinValue,
          carbs: carbsValue,
          fat: fatValue,
          unit: "serving",
          brand: null,
        }),
      });

      if (!foodResponse.ok) {
        throw new Error(`USER_FOOD_SAVE_FAILED:${foodResponse.status}`);
      }

      const food = (await foodResponse.json()) as { id: string };

      await createTrackingEntry("foodLog", {
        id: `today-food-${Date.now()}`,
        date: toDateKey(new Date()),
        foodKey: `user:${food.id}`,
        grams: 100,
      });

      onSaved({ calories: caloriesValue, protein: proteinValue });
      resetForm();
    } catch {
      setSubmitError(t("today.quickAddMealSaveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (isSaving) return;
        onClose();
        resetForm();
      }}
      title={t("today.quickAddMealTitle")}
      description={supportSearch ? t("today.quickAddMealDescriptionWithSearch") : t("today.quickAddMealDescription")}
      className="today-premium-modal"
    >
      <div className="grid gap-3" data-testid="quick-add-meal-modal">
        {!supportSearch ? <p className="m-0 text-xs text-slate-400">{t("today.quickAddMealManualOnly")}</p> : null}

        <Input label={t("today.quickAddMealNameLabel")} value={name} onChange={(event) => setName(event.target.value)} errorText={touched ? errors.name : ""} />
        <Input
          label={t("today.quickAddMealCaloriesLabel")}
          type="number"
          min={1}
          inputMode="decimal"
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          errorText={touched ? errors.calories : ""}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label={t("today.quickAddMealProteinLabel")} type="number" min={0} step="0.1" inputMode="decimal" value={protein} onChange={(event) => setProtein(event.target.value)} />
          <Input label={t("today.quickAddMealCarbsLabel")} type="number" min={0} step="0.1" inputMode="decimal" value={carbs} onChange={(event) => setCarbs(event.target.value)} />
          <Input label={t("today.quickAddMealFatLabel")} type="number" min={0} step="0.1" inputMode="decimal" value={fat} onChange={(event) => setFat(event.target.value)} />
        </div>

        {submitError ? <p className="m-0 text-sm text-rose-300">{submitError}</p> : null}

        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={handleSave} className="min-h-11 sm:order-2" loading={isSaving} data-testid="quick-add-meal-save">
            {t("today.quickAddMealSave")}
          </Button>
          <Button variant="secondary" onClick={() => { onClose(); resetForm(); }} className="min-h-11 sm:order-1" disabled={isSaving}>
            {t("today.quickAddMealCancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
