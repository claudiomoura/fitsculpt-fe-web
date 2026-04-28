type HeaderValue = string | string[] | undefined;

type ResolveBillingBaseUrlOptions = {
  appBaseUrl: string;
  nodeEnv: string | undefined;
  allowRequestOriginFallback: boolean;
  requestProtocol?: string;
  headers: {
    host?: HeaderValue;
    origin?: HeaderValue;
    "x-forwarded-host"?: HeaderValue;
    "x-forwarded-proto"?: HeaderValue;
  };
};

function firstHeaderValue(value: HeaderValue): string | null {
  const source = Array.isArray(value) ? value[0] : value;
  if (typeof source !== "string") return null;
  const first = source.split(",")[0]?.trim();
  return first ? first : null;
}

function tryNormalizeHttpUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

function normalizeBaseUrl(raw: string): string | null {
  const parsed = tryNormalizeHttpUrl(raw);
  if (!parsed) return null;

  const trimmedPath = parsed.pathname.replace(/\/+$/, "");
  const basePath = trimmedPath.length > 0 && trimmedPath !== "/" ? trimmedPath : "";
  return `${parsed.origin}${basePath}`;
}

function resolveRequestOriginCandidate(
  headers: ResolveBillingBaseUrlOptions["headers"],
  requestProtocol?: string,
): string | null {
  const forwardedHost = firstHeaderValue(headers["x-forwarded-host"]);
  const forwardedProto = firstHeaderValue(headers["x-forwarded-proto"]);
  const host = forwardedHost ?? firstHeaderValue(headers.host);
  const proto = forwardedProto ?? requestProtocol;

  if (host && proto) {
    return `${proto}://${host}`;
  }

  const origin = firstHeaderValue(headers.origin);
  if (origin) {
    return origin;
  }

  return null;
}

export function resolveBillingBaseUrl(options: ResolveBillingBaseUrlOptions): string {
  const normalizedAppBaseUrl = normalizeBaseUrl(options.appBaseUrl);
  const isProduction = options.nodeEnv === "production";

  if (normalizedAppBaseUrl) {
    const parsedAppBaseUrl = new URL(normalizedAppBaseUrl);
    if (!isProduction || !isLocalHostname(parsedAppBaseUrl.hostname)) {
      return normalizedAppBaseUrl;
    }
  }

  const allowRequestFallback = !isProduction || options.allowRequestOriginFallback;
  if (allowRequestFallback) {
    const requestOriginCandidate = resolveRequestOriginCandidate(
      options.headers,
      options.requestProtocol,
    );
    const normalizedRequestBaseUrl =
      requestOriginCandidate ? normalizeBaseUrl(requestOriginCandidate) : null;
    if (normalizedRequestBaseUrl) {
      return normalizedRequestBaseUrl;
    }
  }

  if (normalizedAppBaseUrl) {
    return normalizedAppBaseUrl;
  }

  return "http://localhost:3000";
}

export function buildBillingSettingsUrl(baseUrl: string): URL {
  return new URL(`${baseUrl}/app/settings/billing`);
}
