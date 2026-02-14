import { proxyToBackend } from "../../gyms/_proxy";

export async function GET() {
  return proxyToBackend("/admin/gyms");
}

export async function POST(request: Request) {
  const body = await request.json();
  return proxyToBackend("/admin/gyms", { method: "POST", body });
}
