import { proxyToBackend } from "../../../gyms/_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  return proxyToBackend(`/research/rct/summary${query ? `?${query}` : ""}`, { request });
}
