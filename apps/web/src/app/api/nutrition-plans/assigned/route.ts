import { proxyToBackend } from "../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyToBackend("/members/me/assigned-nutrition-plan", { request });
}
