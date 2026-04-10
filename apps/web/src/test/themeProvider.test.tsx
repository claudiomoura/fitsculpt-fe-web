import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/context/ThemeProvider";

type MatchMediaController = {
  matchMedia: typeof window.matchMedia;
  setMatches: (next: boolean) => void;
};

function createMatchMediaController(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQuery = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => false,
  } as MediaQueryList;

  return {
    matchMedia: vi.fn(() => mediaQuery),
    setMatches: (next: boolean) => {
      matches = next;
      const event = { matches: next, media: mediaQuery.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

function ThemeHarness() {
  const { theme, themePreference, setThemePreference } = useTheme();

  return (
    <>
      <p data-testid="theme">{theme}</p>
      <p data-testid="preference">{themePreference}</p>
      <button type="button" onClick={() => setThemePreference("system")}>System</button>
    </>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    document.cookie = "fs-theme=; path=/; max-age=0";
  });

  it("keeps system preference, resolves current theme, and reacts to OS changes", async () => {
    const mediaQuery = createMatchMediaController(true);
    vi.stubGlobal("matchMedia", mediaQuery.matchMedia);

    render(
      <ThemeProvider initialTheme="system">
        <ThemeHarness />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("preference")).toHaveTextContent("system");
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });

    expect(document.documentElement).toHaveClass("theme-dark");
    expect(window.localStorage.getItem("fs-theme")).toBe("system");

    mediaQuery.setMatches(false);

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });

    expect(document.documentElement).toHaveClass("theme-light");
    expect(document.documentElement).not.toHaveClass("theme-dark");
  });

  it("switches to system preference from user action", async () => {
    const mediaQuery = createMatchMediaController(false);
    vi.stubGlobal("matchMedia", mediaQuery.matchMedia);

    render(
      <ThemeProvider initialTheme="dark">
        <ThemeHarness />
      </ThemeProvider>
    );

    expect(screen.getByTestId("preference")).toHaveTextContent("dark");

    fireEvent.click(screen.getByRole("button", { name: "System" }));

    await waitFor(() => {
      expect(screen.getByTestId("preference")).toHaveTextContent("system");
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });

    expect(window.localStorage.getItem("fs-theme")).toBe("system");
    expect(document.documentElement).toHaveClass("theme-light");
  });
});
