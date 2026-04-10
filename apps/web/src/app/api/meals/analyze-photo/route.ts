import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getBackendAuthCookie } from "@/lib/backendAuthCookie";
import { aiRequestFailedResponse, mapAiUpstreamError, parseJsonOrNull } from "@/app/api/_utils/aiErrorMapping";
import { validateMealPhotoAnalyzePayload } from "@/lib/runtimeContracts";

export const dynamic = "force-dynamic";

const ENDPOINT = "/meals/analyze-photo";
const REQUEST_TIMEOUT_MS = 45_000;
const PASSTHROUGH_STATUSES = new Set([400, 403, 422, 429]);

const fallbackCopy = {
  es: {
    title: "Comida por revisar",
    item: "Comida no identificada",
    notes: "No se pudo completar el analisis visual. Dejamos una estimacion editable para que puedas revisarla y guardarla.",
  },
  en: {
    title: "Meal to review",
    item: "Unidentified food",
    notes: "Visual analysis could not be completed. Returning an editable estimate so you can review and save it.",
  },
  pt: {
    title: "Refeicao para revisar",
    item: "Comida nao identificada",
    notes: "Nao foi possivel concluir a analise visual. Foi devolvida uma estimativa editavel para revisar e guardar.",
  },
} as const;

function readLocale(body: string): keyof typeof fallbackCopy {
  const payload = parseJsonOrNull(body);
  if (payload && typeof payload === "object") {
    const locale = (payload as { locale?: unknown }).locale;
    if (locale === "en" || locale === "pt") return locale;
  }
  return "es";
}

function buildFallbackResponse(body: string) {
  const locale = readLocale(body);
  const copy = fallbackCopy[locale];
  return {
    title: copy.title,
    foodName: copy.item,
    items: [{ name: copy.item, calories: 0, protein: 0, carbs: 0, fats: 0 }],
    totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    confidence: 0.2,
    confidenceLabel: "low",
    notes: copy.notes,
    analysisSource: "fallback",
    degraded: true,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function POST(request: Request) {
  const { header: authCookie } = await getBackendAuthCookie(request);
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED", kind: "auth", status: 401 }, { status: 401 });
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);
  let body = "";

  try {
    body = await request.text();
    const contentType = request.headers.get("content-type");
    const response = await fetch(`${getBackendUrl()}${ENDPOINT}`, {
      method: "POST",
      headers: {
        ...(contentType ? { "content-type": contentType } : {}),
        cookie: authCookie,
      },
      body,
      cache: "no-store",
      signal: abortController.signal,
    });

    const responseText = await response.text();
    const payload = parseJsonOrNull(responseText);

    if (!response.ok) {
      if (PASSTHROUGH_STATUSES.has(response.status) && payload !== null) {
        return NextResponse.json(payload, { status: response.status });
      }
      if (payload !== null) {
        if (response.status >= 500) {
          return NextResponse.json(buildFallbackResponse(body), { status: 200 });
        }
        return mapAiUpstreamError(response.status, payload);
      }
      return response.status >= 500
        ? NextResponse.json(buildFallbackResponse(body), { status: 200 })
        : aiRequestFailedResponse(response.status);
    }

    if (payload === null) {
      return NextResponse.json(buildFallbackResponse(body), { status: 200 });
    }

    const validation = validateMealPhotoAnalyzePayload(payload);
    if (!validation.ok) {
      return NextResponse.json(buildFallbackResponse(body), { status: 200 });
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const fallback = buildFallbackResponse(body);
    if (isAbortError(error)) {
      return NextResponse.json(fallback, { status: 200 });
    }

    return NextResponse.json(fallback, { status: 200 });
  } finally {
    clearTimeout(timeoutId);
  }
}
