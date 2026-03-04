import { classifyAiError } from "@/lib/aiErrorMapping";

type Translator = (key: string) => string;

export type AiErrorUiState = {
  title: string;
  description: string;
  ctaHref: string | null;
  ctaLabel: string | null;
};

type MapAiErrorToUiStateInput = {
  status?: number | null;
  code?: string | null;
  error?: string | null;
  kind?: string | null;
};

export function mapAiErrorToUiState(input: MapAiErrorToUiStateInput, t: Translator): AiErrorUiState {
  const category = classifyAiError(input);

  if (category === "quota") {
    return {
      title: t("ai.errorState.title"),
      description: t("ai.quotaUnavailable"),
      ctaHref: "/app/settings/billing",
      ctaLabel: t("billing.manageBilling"),
    };
  }

  if (category === "auth") {
    return {
      title: t("ai.errorState.title"),
      description: t("ai.authUnavailable"),
      ctaHref: "/login",
      ctaLabel: t("nav.login"),
    };
  }

  if (category === "validation") {
    return {
      title: t("ai.errorState.title"),
      description: t("ai.validationUnavailable"),
      ctaHref: null,
      ctaLabel: null,
    };
  }

  return {
    title: t("ai.errorState.title"),
    description: t("ai.serviceUnavailable"),
    ctaHref: null,
    ctaLabel: null,
  };
}
