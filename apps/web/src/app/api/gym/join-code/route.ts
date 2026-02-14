import { proxyToBackend } from "../../gyms/_proxy";

export async function POST(request: Request) {
  const body = await request.json();
  return proxyToBackend("/gym/join-code", { method: "POST", body });
}
