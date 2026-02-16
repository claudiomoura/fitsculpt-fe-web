import { proxyToBackend } from "../../gyms/_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/training-plans/active?${query}` : "/training-plans/active";
  return proxyToBackend(path);
}
