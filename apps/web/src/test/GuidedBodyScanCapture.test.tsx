import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GuidedBodyScanCapture from "@/app/(app)/app/seguimiento/GuidedBodyScanCapture";

describe("GuidedBodyScanCapture", () => {
  it("renders steps and updates visual progression with photo previews", () => {
    const onFrontUpload = vi.fn();
    const onSideUpload = vi.fn();
    const onBackUpload = vi.fn();

    const { rerender } = render(
      <GuidedBodyScanCapture
        frontPreviewUrl={null}
        sidePreviewUrl={null}
        backPreviewUrl={null}
        isProcessing={false}
        errorMessage={null}
        onFrontUpload={onFrontUpload}
        onSideUpload={onSideUpload}
        onBackUpload={onBackUpload}
      />,
    );

    expect(screen.getByRole("heading", { name: /escaneo corporal guiado/i })).toBeInTheDocument();
    expect(screen.getByText("Paso 1: Preparacion")).toBeInTheDocument();
    expect(screen.getByText("Paso 2: Foto frontal")).toBeInTheDocument();
    expect(screen.getByText("Paso 3: Foto lateral")).toBeInTheDocument();
    expect(screen.getByText("Paso 4: Foto dorsal")).toBeInTheDocument();
    expect(screen.getByText("Paso 5: Confirmacion")).toBeInTheDocument();
    expect(screen.getByTestId("guided-step-preparacion")).toHaveAttribute("data-status", "actual");
    expect(screen.getByTestId("guided-step-frontal")).toHaveAttribute("data-status", "pendiente");

    rerender(
      <GuidedBodyScanCapture
        frontPreviewUrl="data:image/jpeg;base64,front"
        sidePreviewUrl={null}
        backPreviewUrl={null}
        isProcessing={false}
        errorMessage={null}
        onFrontUpload={onFrontUpload}
        onSideUpload={onSideUpload}
        onBackUpload={onBackUpload}
      />,
    );

    expect(screen.getByTestId("guided-step-preparacion")).toHaveAttribute("data-status", "completado");
    expect(screen.getByTestId("guided-step-frontal")).toHaveAttribute("data-status", "completado");
    expect(screen.getByTestId("guided-step-lateral")).toHaveAttribute("data-status", "actual");
    expect(screen.getByAltText("Preview foto frontal")).toBeInTheDocument();

    rerender(
      <GuidedBodyScanCapture
        frontPreviewUrl="data:image/jpeg;base64,front"
        sidePreviewUrl="data:image/jpeg;base64,side"
        backPreviewUrl={null}
        isProcessing={false}
        errorMessage={null}
        onFrontUpload={onFrontUpload}
        onSideUpload={onSideUpload}
        onBackUpload={onBackUpload}
      />,
    );

    expect(screen.getByTestId("guided-step-dorsal")).toHaveAttribute("data-status", "actual");
    expect(screen.getByAltText("Preview foto lateral")).toBeInTheDocument();

    rerender(
      <GuidedBodyScanCapture
        frontPreviewUrl="data:image/jpeg;base64,front"
        sidePreviewUrl="data:image/jpeg;base64,side"
        backPreviewUrl="data:image/jpeg;base64,back"
        isProcessing={false}
        errorMessage={null}
        onFrontUpload={onFrontUpload}
        onSideUpload={onSideUpload}
        onBackUpload={onBackUpload}
      />,
    );

    expect(screen.getByTestId("guided-step-confirmacion")).toHaveAttribute("data-status", "completado");
    expect(screen.getByAltText("Preview foto dorsal")).toBeInTheDocument();
  });
});
