export type AiPricingEntry = {
  inputPer1M: number;
  outputPer1M: number;
};

export type AiPricingMap = Record<string, AiPricingEntry>;

type PricingSource = {
  AI_PRICING_JSON?: string | null;
};

export function loadAiPricing(source: PricingSource): AiPricingMap {
  if (!source.AI_PRICING_JSON) return {};
  try {
    const parsed = JSON.parse(source.AI_PRICING_JSON) as Record<string, Record<string, number>>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.entries(parsed).reduce<AiPricingMap>((acc, [model, value]) => {
      if (!value || typeof value !== "object") return acc;
      const inputPer1M =
        Number(value.inputPer1M) ||
        (Number.isFinite(Number(value.inputPer1K)) ? Number(value.inputPer1K) * 1000 : NaN);
      const outputPer1M =
        Number(value.outputPer1M) ||
        (Number.isFinite(Number(value.outputPer1K)) ? Number(value.outputPer1K) * 1000 : NaN);
      if (Number.isFinite(inputPer1M) && Number.isFinite(outputPer1M)) {
        acc[model] = { inputPer1M, outputPer1M };
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

const DEFAULT_MODEL_PRICING: AiPricingMap = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 5, outputPer1M: 15 },
};

function buildModelCandidates(model: string): string[] {
  const trimmed = model.trim();
  const candidates = new Set<string>([trimmed]);
  if (trimmed.includes(":")) {
    candidates.add(trimmed.split(":")[0] ?? trimmed);
  }
  if (trimmed.includes("/")) {
    candidates.add(trimmed.split("/")[0] ?? trimmed);
  }
  candidates.add(trimmed.replace(/-preview$/i, ""));
  candidates.add(trimmed.replace(/-latest$/i, ""));
  candidates.add(trimmed.replace(/-\d{4}(-\d{2}){0,2}-.+$/, ""));
  candidates.add(trimmed.replace(/-\d{4}(-\d{2}){0,2}$/, ""));
  return [...candidates].filter((value) => value.length > 0);
}

export function normalizeModelName(model?: string | null, pricing?: AiPricingMap) {
  const trimmed = model?.trim();
  if (!trimmed) return null;
  const candidates = buildModelCandidates(trimmed);
  for (const candidate of candidates) {
    if (pricing?.[candidate] || DEFAULT_MODEL_PRICING[candidate]) {
      return candidate;
    }
  }
  return trimmed;
}

export function getModelPricing(model?: string | null, pricing?: AiPricingMap) {
  const normalized = normalizeModelName(model, pricing);
  if (!normalized) return null;
  return pricing?.[normalized] ?? DEFAULT_MODEL_PRICING[normalized] ?? null;
}

export function computeCostCents(args: {
  pricing?: AiPricingMap;
  model?: string | null;
  promptTokens: number;
  completionTokens: number;
}) {
  const entry = getModelPricing(args.model, args.pricing);
  if (!entry) return 0;
  const inputCost = (args.promptTokens / 1_000_000) * entry.inputPer1M;
  const outputCost = (args.completionTokens / 1_000_000) * entry.outputPer1M;
  return Math.max(0, Math.ceil((inputCost + outputCost) * 100));
}
