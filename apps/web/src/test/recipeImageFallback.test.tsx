import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MealCard } from "@/components/nutrition/MealCard";
import { RecipeImage } from "@/components/nutrition/RecipeImage";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

describe("RecipeImage fallback behavior", () => {
  it("renders real image when src is valid", () => {
    renderWithProviders(<RecipeImage src="https://cdn.example.com/meal.jpg" alt="Meal" testId="recipe-image" />);

    const image = screen.getByTestId("recipe-image");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://cdn.example.com/meal.jpg");
    expect(screen.queryByTestId("recipe-image-fallback")).not.toBeInTheDocument();
  });

  it("uses fallback when src is empty and never renders empty img src", () => {
    renderWithProviders(<RecipeImage src="   " alt="Meal" testId="recipe-image" />);

    expect(screen.queryByTestId("recipe-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("recipe-image-fallback")).toBeInTheDocument();
  });

  it("switches to fallback when image load fails", () => {
    renderWithProviders(<RecipeImage src="https://cdn.example.com/missing.jpg" alt="Meal" testId="recipe-image" />);

    const image = screen.getByTestId("recipe-image");
    fireEvent.error(image);

    expect(screen.queryByTestId("recipe-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("recipe-image-fallback")).toBeInTheDocument();
  });

  it("MealCard uses the same fallback if image is missing", () => {
    renderWithProviders(<MealCard title="Bowl" imageUrl={null} />);

    expect(screen.queryByTestId("meal-card-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("meal-card-image-fallback")).toBeInTheDocument();
  });
});
