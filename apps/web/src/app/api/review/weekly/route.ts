import { proxyToBackend } from "../../gyms/_proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query ? `/review/weekly?${query}` : "/review/weekly";
  return proxyToBackend(path);
}
