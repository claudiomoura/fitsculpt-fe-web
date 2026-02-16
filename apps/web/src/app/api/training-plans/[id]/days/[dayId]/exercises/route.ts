import { proxyToBackend } from "../../../../../gyms/_proxy";

export async function POST(request: Request, context: { params: Promise<{ id: string; dayId: string }> }) {
  const { id, dayId } = await context.params;
  const payload = await request.json();
  return proxyToBackend(`/training-plans/${id}/days/${dayId}/exercises`, { method: "POST", body: payload });
}
