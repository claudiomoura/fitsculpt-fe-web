import { proxyToBackend } from "../_proxy";

export async function POST(request: Request) {
  const body = await request.json();
  return proxyToBackend("/gyms/join-by-code", { method: "POST", body });
}
