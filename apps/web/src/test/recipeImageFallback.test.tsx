import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MealCard } from "@/components/nutrition/MealCard";
import { RecipeImage } from "@/components/nutrition/RecipeImage";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

const PLACEHOLDER_SRC = "/placeholders/recipe-cover.jpg";

describe("RecipeImage fallback behavior", () => {
  it("renders real image when src is valid", () => {
    renderWithProviders(<RecipeImage src="https://cdn.example.com/meal.jpg" alt="Meal" width={320} height={160} />);

    const image = screen.getByAltText("Meal");
    expect(image).toBeInTheDocument();
  });

  it("uses placeholder when src is empty", () => {
    renderWithProviders(<RecipeImage src="   " alt="Meal" width={320} height={160} />);

    const image = screen.getByAltText("Meal");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", expect.stringContaining(PLACEHOLDER_SRC));
  });

  it("switches to placeholder when image load fails", () => {
    renderWithProviders(<RecipeImage src="https://cdn.example.com/missing.jpg" alt="Meal" width={320} height={160} />);

    const image = screen.getByAltText("Meal");
    fireEvent.error(image);

    expect(image).toHaveAttribute("src", expect.stringContaining(PLACEHOLDER_SRC));
  });

  it("MealCard renders placeholder when image is missing", () => {
    renderWithProviders(<MealCard title="Bowl" imageUrl={null} />);

    const image = screen.getByAltText("Bowl");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", expect.stringContaining(PLACEHOLDER_SRC));
  });
});
