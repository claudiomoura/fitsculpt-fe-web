import { proxyToBackend } from "../_proxy";

export async function GET() {
  return proxyToBackend("/gyms/membership");
}

export async function DELETE() {
  return proxyToBackend("/gyms/membership", { method: "DELETE" });
}
