const OPENAI_KEY_PLACEHOLDERS = new Set([
  "replace-if-using-openai",
  "replace_me",
  "changeme",
  "your-openai-api-key",
  "sk-xxx",
]);

const SECRET_MASK = "[REDACTED]";

export type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type OpenAiResponse = {
  payload: Record<string, unknown>;
  usage: OpenAiUsage | null;
  model: string | null;
  requestId: string | null;
};

export type OpenAiResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };

export type OpenAiOptions = {
  parser?: (content: string) => Record<string, unknown>;
  maxTokens?: number;
  responseFormat?: OpenAiResponseFormat;
  model?: string;
  retryOnParseError?: boolean;
};

type Logger = {
  info: (obj: Record<string, unknown>, message: string) => void;
  warn: (obj: Record<string, unknown>, message: string) => void;
  error: (obj: Record<string, unknown>, message: string) => void;
};

type CreateHttpError = (statusCode: number, code: string, debug?: Record<string, unknown>) => Error;

type OpenAiClientConfig = {
  apiKey?: string;
  fallbackApiKey?: string;
  baseUrl: string;
  isProduction: boolean;
  logger: Logger;
  createHttpError: CreateHttpError;
};

function sanitizeProviderText(raw: string) {
  return raw
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, SECRET_MASK)
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, `Bearer ${SECRET_MASK}`)
    .slice(0, 500);
}

function getConfiguredApiKey(apiKey?: string, fallbackApiKey?: string) {
  const candidate = [apiKey, fallbackApiKey].find((value) => typeof value === "string" && value.trim().length > 0);
  if (!candidate) {
    return null;
  }
  const normalized = candidate.trim();
  if (OPENAI_KEY_PLACEHOLDERS.has(normalized.toLowerCase())) {
    return null;
  }
  if (!normalized.startsWith("sk-")) {
    return null;
  }
  return normalized;
}

export function createOpenAiClient(config: OpenAiClientConfig) {
  const { baseUrl, isProduction, logger, createHttpError } = config;

  async function callOpenAi(
    prompt: string,
    attempt = 0,
    parser: (content: string) => Record<string, unknown> = (content) => JSON.parse(content) as Record<string, unknown>,
    options?: OpenAiOptions
  ): Promise<OpenAiResponse> {
    const apiKey = getConfiguredApiKey(config.apiKey, config.fallbackApiKey);
    if (!apiKey) {
      throw createHttpError(503, "AI_NOT_CONFIGURED", {
        reason: "OPENAI_API_KEY_MISSING_OR_PLACEHOLDER",
      });
    }

    const systemMessage =
      attempt === 0
        ? "Devuelve exclusivamente JSON valido. Sin markdown. Sin texto extra."
        : "DEVUELVE SOLO JSON VÁLIDO. Sin markdown. Sin texto extra.";
    const responseFormat = options?.responseFormat ?? { type: "json_object" };
    const maxTokens = options?.maxTokens ?? 250;
    const model = options?.model ?? "gpt-3.5-turbo";

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: responseFormat,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: attempt === 0 ? 0.4 : 0.2,
        }),
      });
    } catch (error) {
      logger.error({ err: error }, "openai network request failed");
      throw createHttpError(502, "AI_REQUEST_FAILED", {
        cause: "NETWORK_ERROR",
      });
    }

    if (!response.ok) {
      const rawError = await response.text().catch(() => "");
      const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id");
      const providerCode = (() => {
        if (!rawError) return undefined;
        try {
          const parsed = JSON.parse(rawError) as { error?: { code?: string } };
          return parsed.error?.code;
        } catch {
          return undefined;
        }
      })();

      const safeError = sanitizeProviderText(rawError);
      logger.error(
        {
          status: response.status,
          requestId,
          providerCode,
          ...(safeError ? { providerError: safeError } : {}),
        },
        "openai request failed"
      );

      throw createHttpError(502, "AI_REQUEST_FAILED", {
        status: response.status,
        requestId,
        ...(providerCode ? { providerCode } : {}),
        ...(!isProduction && safeError ? { providerError: safeError } : {}),
      });
    }

    const requestId =
      response.headers.get("x-request-id") ??
      response.headers.get("openai-request-id") ??
      response.headers.get("x-openai-request-id");
    const data = (await response.json()) as {
      model?: string;
      usage?: OpenAiUsage;
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw createHttpError(502, "AI_EMPTY_RESPONSE");
    }

    try {
      logger.info(
        isProduction
          ? { attempt, responseChars: content.length }
          : { attempt, responsePreview: content.slice(0, 300), responseChars: content.length },
        "ai response received"
      );
      const parsedPayload = (options?.parser ?? parser)(content);
      return {
        payload: parsedPayload,
        usage: data.usage ?? null,
        model: data.model ?? null,
        requestId,
      };
    } catch (error) {
      const typed = error as { code?: string };
      const retryOnParseError = options?.retryOnParseError ?? true;
      if (typed.code === "AI_PARSE_ERROR" && attempt === 0 && retryOnParseError) {
        logger.warn({ err: error }, "ai response parse failed, retrying with strict json request");
        return callOpenAi(prompt, 1, parser, options);
      }
      throw error;
    }
  }

  return {
    callOpenAi,
  };
}
