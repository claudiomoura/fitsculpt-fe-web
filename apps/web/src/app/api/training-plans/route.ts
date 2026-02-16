import { proxyToBackend } from "../gyms/_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/training-plans?${query}` : "/training-plans";
  return proxyToBackend(path);
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  return proxyToBackend("/training-plans", { method: "POST", body: payload });
}
