import { cookies } from "next/headers";

type BackendAuthDebug = {
  fromReqHasToken: boolean;
  fromStoreHasToken: boolean;
  storeCookieNames: string[];
};

function parseCookieHeader(rawCookie: string | null) {
  if (!rawCookie) return new Map<string, string>();
  const entries = rawCookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return null;
      const name = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (!name) return null;
      return [name, value] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));
  return new Map(entries);
}

export async function getBackendAuthCookie(request: Request) {
  const rawCookie = request.headers.get("cookie");
  const cookieStore = await cookies();
  const storeCookies = cookieStore.getAll();
  const storeCookieNames = storeCookies.map((cookie) => cookie.name);
  const storeMap = new Map(storeCookies.map(({ name, value }) => [name, value]));
  const requestMap = parseCookieHeader(rawCookie);

  const merged = new Map<string, string>(requestMap);
  for (const [name, value] of storeMap) {
    merged.set(name, value);
  }

  const fromReqHasToken = requestMap.has("fs_token");
  const fromStoreHasToken = storeMap.has("fs_token");
  const hasToken = merged.has("fs_token");
  const header = hasToken ? Array.from(merged.entries()).map(([name, value]) => `${name}=${value}`).join("; ") : null;

  return {
    header,
    debug: {
      fromReqHasToken,
      fromStoreHasToken,
      storeCookieNames,
    },
  } satisfies { header: string | null; debug: BackendAuthDebug };
}
