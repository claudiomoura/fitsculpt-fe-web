import { proxyToBackend } from "./_proxy";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = searchParams.get("q")?.trim();
  const path = query ? `/gyms?q=${encodeURIComponent(query)}` : "/gyms";

  return proxyToBackend(path);
}
