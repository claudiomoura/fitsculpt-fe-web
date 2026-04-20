import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuickLogHub from "@/components/quick-log/QuickLogHub";
import { renderWithProviders } from "@/test/utils/renderWithProviders";

const { createTrackingEntryMock } = vi.hoisted(() => ({
  createTrackingEntryMock: vi.fn(),
}));

const { createMealLogMock } = vi.hoisted(() => ({
  createMealLogMock: vi.fn(),
}));

const { analyzeMealPhotoMock } = vi.hoisted(() => ({
  analyzeMealPhotoMock: vi.fn(),
}));

const { compressAvatarToDataUrlMock } = vi.hoisted(() => ({
  compressAvatarToDataUrlMock: vi.fn(),
}));

const { fetchAuthMeMock } = vi.hoisted(() => ({
  fetchAuthMeMock: vi.fn(),
}));

vi.mock("@/services/tracking", async () => {
  const actual = await vi.importActual<typeof import("@/services/tracking")>("@/services/tracking");
  return {
    ...actual,
    createTrackingEntry: createTrackingEntryMock,
  };
});

vi.mock("@/services/mealApi", async () => {
  const actual = await vi.importActual<typeof import("@/services/mealApi")>("@/services/mealApi");
  return {
    ...actual,
    createMealLog: createMealLogMock,
    analyzeMealPhoto: analyzeMealPhotoMock,
  };
});

vi.mock("@/lib/avatarUpload", () => ({
  compressAvatarToDataUrl: (...args: unknown[]) =>
    compressAvatarToDataUrlMock(...args),
}));

vi.mock("@/lib/authDedup", async () => {
  const actual = await vi.importActual<typeof import("@/lib/authDedup")>("@/lib/authDedup");
  return {
    ...actual,
    fetchAuthMe: () => fetchAuthMeMock(),
  };
});

describe("QuickLogHub", () => {
  beforeEach(() => {
    createTrackingEntryMock.mockReset();
    createTrackingEntryMock.mockResolvedValue({});
    createMealLogMock.mockReset();
    createMealLogMock.mockResolvedValue({ id: "meal-1" });
    analyzeMealPhotoMock.mockReset();
    analyzeMealPhotoMock.mockResolvedValue({
      title: "Arroz con pollo",
      items: [
        { name: "Arroz", calories: 180, protein: 4, carbs: 36, fats: 1 },
        { name: "Pollo", calories: 220, protein: 30, carbs: 0, fats: 10 },
      ],
      totals: { calories: 400, protein: 34, carbs: 36, fats: 11 },
      confidence: 0.74,
      confidenceLabel: "high",
    });
    compressAvatarToDataUrlMock.mockReset();
    compressAvatarToDataUrlMock.mockResolvedValue("data:image/jpeg;base64,meal-photo");
    fetchAuthMeMock.mockReset();
    fetchAuthMeMock.mockResolvedValue({
      entitlements: { modules: { ai: { enabled: true } } },
    });
    window.__fsAnalyticsQueue = [];
  });

  it("opens and saves quick water log", async () => {
    renderWithProviders(<QuickLogHub origin="today" latestCheckin={null} currentWeightKg={77.4} />);

    fireEvent.click(screen.getByRole("button", { name: /quick log/i }));
    fireEvent.click(screen.getByRole("button", { name: /agua/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar agua/i }));

    await waitFor(() => {
      expect(createTrackingEntryMock).toHaveBeenCalledWith(
        "foodLog",
        expect.objectContaining({ foodKey: "water" }),
      );
    });

    const eventNames = (window.__fsAnalyticsQueue ?? []).map((entry) => entry.name);
    expect(eventNames).toContain("quick_log_opened");
    expect(eventNames).toContain("quick_log_saved");
  });

  it("requires voice draft confirmation before saving", async () => {
    renderWithProviders(
      <QuickLogHub origin="today" latestCheckin={null} currentWeightKg={77.4} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /quick log/i }));
    fireEvent.change(screen.getByPlaceholderText(/200g/i), {
      target: { value: "Comi 200g pollo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /aplicar texto/i }));

    const saveButton = screen.getByRole("button", { name: /guardar comida/i });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /confirmar borrador/i }));
    expect(saveButton).not.toBeDisabled();
  });

  it("includes meal photo in manual confirmation payload", async () => {
    renderWithProviders(
      <QuickLogHub origin="today" latestCheckin={null} currentWeightKg={77.4} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /quick log/i }));
    const photoInput = screen
      .getByText(/foto de comida/i)
      .closest("label")
      ?.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["photo"], "meal.jpg", { type: "image/jpeg" });
    fireEvent.change(photoInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(compressAvatarToDataUrlMock).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText(/cantidad/i), {
      target: { value: "1.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar comida/i }));

    await waitFor(() => {
      expect(createMealLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              quantity: 1.5,
              photoUrl: "data:image/jpeg;base64,meal-photo",
            }),
          ],
        }),
      );
    });
  });

  it("analyzes attached meal photo and prefills meal fields", async () => {
    renderWithProviders(
      <QuickLogHub origin="today" latestCheckin={null} currentWeightKg={77.4} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /quick log/i }));
    const photoInput = screen
      .getByText(/foto de comida/i)
      .closest("label")
      ?.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["photo"], "meal.jpg", { type: "image/jpeg" });
    fireEvent.change(photoInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(compressAvatarToDataUrlMock).toHaveBeenCalled();
    });

    const analyzeButton = await screen.findByRole("button", { name: /analiz|analy/i });
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(analyzeMealPhotoMock).toHaveBeenCalledWith(
        expect.objectContaining({ photoDataUrl: "data:image/jpeg;base64,meal-photo" }),
      );
    });

    expect(screen.getByDisplayValue("Arroz con pollo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("400")).toBeInTheDocument();
    expect(screen.getByText(/detectados/i)).toBeInTheDocument();
  });
});
