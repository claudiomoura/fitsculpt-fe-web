import { proxyToBackend, readJsonBody } from "../../../../../../gyms/_proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; dayId: string }> },
) {
  const { id, dayId } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyToBackend(`/training-plans/${id}/days/${dayId}/exercises`, { method: "POST", body: parsed.body });
}
