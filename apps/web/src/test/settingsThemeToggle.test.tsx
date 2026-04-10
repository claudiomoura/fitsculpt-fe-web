import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, resetMockNavigation } from "@/test/utils/renderWithProviders";
import SettingsClient from "@/app/(app)/app/settings/SettingsClient";

describe("Settings theme preference", () => {
  beforeEach(() => {
    resetMockNavigation();
    window.localStorage.clear();
    document.documentElement.className = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "/api/profile") {
          return {
            ok: true,
            json: async () => ({ name: "Alex" }),
          } as Response;
        }

        if (url === "/api/gym/me") {
          return {
            ok: true,
            json: async () => ({ state: "none" }),
          } as Response;
        }

        throw new Error(`Unhandled fetch: ${url}`);
      })
    );
  });

  it("shows theme options in settings and applies selection immediately", async () => {
    renderWithProviders(<SettingsClient />);

    await screen.findByRole("heading", { name: "Tema" });

    const darkTab = screen.getByRole("tab", { name: "Modo oscuro" });
    const systemTab = screen.getByRole("tab", { name: "Sistema" });

    expect(darkTab).toHaveAttribute("aria-selected", "true");

    fireEvent.click(systemTab);

    await waitFor(() => {
      expect(systemTab).toHaveAttribute("aria-selected", "true");
    });

    expect(window.localStorage.getItem("fs-theme")).toBe("system");
    expect(document.documentElement).toHaveClass("theme-light");

    fireEvent.click(darkTab);

    await waitFor(() => {
      expect(darkTab).toHaveAttribute("aria-selected", "true");
    });

    expect(window.localStorage.getItem("fs-theme")).toBe("dark");
    expect(document.documentElement).toHaveClass("theme-dark");
  });
});
