"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Button } from "@/design-system/components/Button";
import { RecipeImage } from "@/components/nutrition/RecipeImage";
import type { Recipe, RecipeIngredient } from "@/lib/types";

type TrainerRecipeModalProps = {
  open: boolean;
  recipe?: Recipe | null;
  onClose: () => void;
  onSubmit: (data: Partial<Recipe>) => Promise<void>;
};

const EMPTY_INGREDIENT: RecipeIngredient = { id: "", name: "", grams: 0 };

export function TrainerRecipeModal({
  open,
  recipe,
  onClose,
  onSubmit,
}: TrainerRecipeModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [category, setCategory] = useState("");
  const [tiempoPreparacion, setTiempoPreparacion] = useState<number | null>(null);
  const [porciones, setPorciones] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!recipe?.id;

  useEffect(() => {
    if (open) {
      if (recipe) {
        setName(recipe.name || "");
        setDescription(recipe.description || "");
        setCalories(recipe.calories || 0);
        setProtein(recipe.protein || 0);
        setCarbs(recipe.carbs || 0);
        setFat(recipe.fat || 0);
        setCategory(recipe.category || "");
        setTiempoPreparacion(recipe.tiempoPreparacion ?? null);
        setPorciones(recipe.porciones ?? null);
        setIngredients(recipe.ingredients || []);
        setSteps(recipe.steps || []);
        setImageUrls(recipe.imageUrls || []);
        setPhotoUrl(recipe.photoUrl || "");
      } else {
        setName("");
        setDescription("");
        setCalories(0);
        setProtein(0);
        setCarbs(0);
        setFat(0);
        setCategory("");
        setTiempoPreparacion(null);
        setPorciones(null);
        setIngredients([]);
        setSteps([]);
        setImageUrls([]);
        setPhotoUrl("");
      }
      setError(null);
    }
  }, [open, recipe]);

  const isValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      calories > 0 &&
      protein >= 0 &&
      carbs >= 0 &&
      fat >= 0 &&
      ingredients.every((ing) => ing.name.trim().length > 0 && ing.grams > 0) &&
      steps.every((step) => step.trim().length > 0)
    );
  }, [name, calories, protein, carbs, fat, ingredients, steps]);

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT, id: `temp-${Date.now()}` }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps((prev) => [...prev, ""]);
  };

  const updateStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? value : step)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, just create a fake URL for preview
    // In a real implementation, you'd upload to a server
    const fakeUrl = URL.createObjectURL(file);
    setPhotoUrl(fakeUrl);
    setImageUrls((prev) => [...prev, fakeUrl]);
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const data: Partial<Recipe> = {
        name: name.trim(),
        description: description.trim() || null,
        calories,
        protein,
        carbs,
        fat,
        category: category.trim() || null,
        tiempoPreparacion,
        porciones,
        ingredients: ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name.trim(),
          grams: ing.grams,
        })),
        steps: steps.map((step) => step.trim()).filter((s) => s.length > 0),
        imageUrls: imageUrls.filter((url) => url.trim().length > 0),
        photoUrl: photoUrl.trim() || null,
      };
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la receta");
    } finally {
      setLoading(false);
    }
  };

  const title = isEditing ? "Editar Receta" : "Nueva Receta";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading} loading={loading}>
            {isEditing ? "Guardar" : "Crear"}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <div className="form-stack" style={{ gap: 16 }}>
        {/* Image Preview */}
        <div className="flex justify-center mb-4">
          <RecipeImage
            src={photoUrl || imageUrls[0]}
            alt="Preview"
            width={200}
            height={200}
            className="rounded-lg object-cover"
          />
        </div>

        {/* Image Upload */}
        <div className="flex flex-col gap-2">
          <label className="form-stack" style={{ gap: 6 }}>
            <span>Imagen de la receta</span>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
            />
          </label>
          <Input
            label="O ingresa URL de imagen"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            disabled={loading}
          />
        </div>

        {/* Basic Info */}
        <Input
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la receta"
          required
          disabled={loading}
        />

        <Input
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción de la receta"
          disabled={loading}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Calorías"
            type="number"
            min="0"
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            required
            disabled={loading}
          />
          <Input
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ej: Desayuno, Almuerzo"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Proteína (g)"
            type="number"
            min="0"
            value={protein}
            onChange={(e) => setProtein(Number(e.target.value))}
            required
            disabled={loading}
          />
          <Input
            label="Carbos (g)"
            type="number"
            min="0"
            value={carbs}
            onChange={(e) => setCarbs(Number(e.target.value))}
            required
            disabled={loading}
          />
          <Input
            label="Grasas (g)"
            type="number"
            min="0"
            value={fat}
            onChange={(e) => setFat(Number(e.target.value))}
            required
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Tiempo de preparación (min)"
            type="number"
            min="0"
            value={tiempoPreparacion ?? ""}
            onChange={(e) => setTiempoPreparacion(e.target.value ? Number(e.target.value) : null)}
            placeholder="Ej: 30"
            disabled={loading}
          />
          <Input
            label="Porciones"
            type="number"
            min="0"
            value={porciones ?? ""}
            onChange={(e) => setPorciones(e.target.value ? Number(e.target.value) : null)}
            placeholder="Ej: 4"
            disabled={loading}
          />
        </div>

        {/* Ingredients */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Ingredientes</span>
            <Button variant="ghost" size="sm" onClick={addIngredient} disabled={loading}>
              + Agregar ingrediente
            </Button>
          </div>
          {ingredients.map((ing, index) => (
            <div key={ing.id} className="flex gap-2 items-center">
              <Input
                value={ing.name}
                onChange={(e) => updateIngredient(index, "name", e.target.value)}
                placeholder="Nombre"
                className="flex-1"
                disabled={loading}
              />
              <Input
                type="number"
                min="0"
                value={ing.grams}
                onChange={(e) => updateIngredient(index, "grams", Number(e.target.value))}
                placeholder="Gramos"
                className="w-24"
                disabled={loading}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeIngredient(index)}
                disabled={loading}
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Pasos</span>
            <Button variant="ghost" size="sm" onClick={addStep} disabled={loading}>
              + Agregar paso
            </Button>
          </div>
          {steps.map((step, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
              <Input
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={`Paso ${index + 1}`}
                className="flex-1"
                disabled={loading}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStep(index)}
                disabled={loading}
              >
                ×
              </Button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}