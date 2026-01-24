export type AiPricingEntry = {
  inputPer1K: number;
  outputPer1K: number;
};

export type AiPricingMap = Record<string, AiPricingEntry>;

type PricingSource = {
  AI_PRICING_JSON?: string | null;
};

export function loadAiPricing(source: PricingSource): AiPricingMap {
  if (!source.AI_PRICING_JSON) return {};
  try {
    const parsed = JSON.parse(source.AI_PRICING_JSON) as AiPricingMap;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.entries(parsed).reduce<AiPricingMap>((acc, [model, value]) => {
      if (!value || typeof value !== "object") return acc;
      const inputPer1K = Number((value as AiPricingEntry).inputPer1K);
      const outputPer1K = Number((value as AiPricingEntry).outputPer1K);
      if (Number.isFinite(inputPer1K) && Number.isFinite(outputPer1K)) {
        acc[model] = { inputPer1K, outputPer1K };
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function calculateCostCents(args: {
  pricing: AiPricingMap;
  model?: string | null;
  promptTokens: number;
  completionTokens: number;
}) {
  const model = args.model ?? "";
  const entry = model ? args.pricing[model] : undefined;
  if (!entry) {
    return { costCents: 0, pricingFound: false };
  }
  const inputCost = (args.promptTokens / 1000) * entry.inputPer1K;
  const outputCost = (args.completionTokens / 1000) * entry.outputPer1K;
  const total = Math.round((inputCost + outputCost) * 100) / 100;
  return { costCents: Math.round(total), pricingFound: true };
}
