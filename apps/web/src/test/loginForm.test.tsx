import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginForm from "@/app/(auth)/login/LoginForm";

const formStatus = vi.hoisted(() => ({ pending: false }));

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    useFormStatus: () => formStatus,
  };
});

const labels = {
  email: "Email",
  emailHelper: "Use your account email",
  password: "Password",
  passwordHelper: "At least 8 characters",
  forgotPassword: "Forgot your password?",
  submit: "Sign in",
  loading: "Signing in...",
  showPassword: "Show password",
  hidePassword: "Hide password",
};

describe("LoginForm", () => {
  it("renders auth fields and helper links", () => {
    formStatus.pending = false;
    render(<LoginForm action={vi.fn()} next="/app/hoy" labels={labels} />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByDisplayValue("/app/hoy")).toHaveAttribute("name", "next");
  });

  it("shows loading label while submit is pending", () => {
    formStatus.pending = true;
    render(<LoginForm action={vi.fn()} next="/app" labels={labels} />);

    expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  });
});
