import { proxyToBackend, readJsonBody } from "../../gyms/_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/trainer/nutrition-plans?${query}` : "/trainer/nutrition-plans";

  return proxyToBackend(path);
}

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToBackend("/trainer/nutrition-plans", { method: "POST", body: parsed.body });
}
