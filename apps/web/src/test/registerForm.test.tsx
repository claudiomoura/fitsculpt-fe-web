import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterForm from "@/app/(auth)/register/RegisterForm";
import { ONBOARDING_DRAFT_STORAGE_KEY } from "@/lib/onboardingDraft";

const labels = {
  name: "Nombre",
  nameHelper: "Como quieres que aparezca tu nombre.",
  email: "Email",
  emailHelper: "Usa tu email.",
  password: "Contrasena",
  passwordHelper: "Minimo 8 caracteres.",
  promoCode: "Codigo promocional",
  promoHelper: "Codigo requerido.",
  submit: "Activar acceso beta",
  loading: "Creando cuenta...",
  showPassword: "Mostrar contrasena",
  hidePassword: "Ocultar contrasena",
};

describe("RegisterForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("includes the guest onboarding draft when activation comes from onboarding", async () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify({ age: 31, weightKg: 84 }));

    render(
      <RegisterForm
        action={vi.fn()}
        next="/app"
        captureOnboardingDraft
        labels={labels}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('{"age":31,"weightKg":84}')).toHaveAttribute("name", "profileDraft");
    });
  });
});
