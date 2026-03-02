import { proxyToBackend } from "../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyToBackend("/members/me/assigned-nutrition-plan");
}
