import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import { AccessProvider } from "@/context/AccessProvider";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

type ProvidersProps = {
  children: ReactNode;
};

type NextNavigationMockState = {
  pathname: string;
  searchParams: URLSearchParams;
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
};

const nextNavigationState = vi.hoisted<NextNavigationMockState>(() => ({
  pathname: "/app",
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nextNavigationState.pathname,
  useSearchParams: () => nextNavigationState.searchParams,
  useRouter: () => ({
    push: nextNavigationState.push,
    replace: nextNavigationState.replace,
    prefetch: nextNavigationState.prefetch,
  }),
}));

export function setMockPathname(pathname: string) {
  nextNavigationState.pathname = pathname;
}

export function resetMockNavigation() {
  nextNavigationState.pathname = "/app";
  nextNavigationState.searchParams = new URLSearchParams();
  nextNavigationState.push.mockReset();
  nextNavigationState.replace.mockReset();
  nextNavigationState.prefetch.mockReset();
}

function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AccessProvider>
          <ToastProvider>{children}</ToastProvider>
        </AccessProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Providers, ...options });
}
