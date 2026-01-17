import { cookies } from "next/headers";

async function buildCookieHeaderFromStore() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  if (allCookies.length === 0) {
    return { header: null, hasToken: false, hasSignature: false };
  }

  const hasToken = allCookies.some((cookie) => cookie.name === "fs_token");
  if (!hasToken) {
    return { header: null, hasToken };
  }

  const header = allCookies.map(({ name, value }) => `${name}=${value}`).join("; ");
  return { header, hasToken };
}

function buildCookieHeaderFromRequest(request: Request) {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) return null;
  const hasToken = rawCookie.includes("fs_token=");
  return hasToken ? rawCookie : null;
}

export async function getBackendAuthCookie(request: Request) {
  const { header, hasToken } = await buildCookieHeaderFromStore();
  if (header && hasToken) {
    return header;
  }

  const fallback = buildCookieHeaderFromRequest(request);
  if (fallback) {
    return fallback;
  }

  return null;
}
