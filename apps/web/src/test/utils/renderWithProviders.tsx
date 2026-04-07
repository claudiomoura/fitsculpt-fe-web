import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { invalidateAuthMeCache } from "@/lib/authDedup";
import { ToastProvider } from "@/design-system/components/Toast";
import { AccessProvider } from "@/context/AccessProvider";
import { LanguageProvider } from "@/context/LanguageProvider";
import { ThemeProvider } from "@/context/ThemeProvider";

type ProvidersProps = {
  children: ReactNode;
};

type NextNavigationMockState = {
  pathname: string;
  searchParams: URLSearchParams;
  back: ReturnType<typeof vi.fn>;
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
};

const nextNavigationState = vi.hoisted<NextNavigationMockState>(() => ({
  pathname: "/app",
  searchParams: new URLSearchParams(),
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nextNavigationState.pathname,
  useSearchParams: () => nextNavigationState.searchParams,
  useRouter: () => ({
    back: nextNavigationState.back,
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
  nextNavigationState.back.mockReset();
  nextNavigationState.push.mockReset();
  nextNavigationState.replace.mockReset();
  nextNavigationState.prefetch.mockReset();
  invalidateAuthMeCache();
}

export function getMockNavigation() {
  return nextNavigationState;
}

function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <LanguageProvider initialLocale="es">
        <AccessProvider>
          <ToastProvider>{children}</ToastProvider>
        </AccessProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  invalidateAuthMeCache();
  return render(ui, { wrapper: Providers, ...options });
}
