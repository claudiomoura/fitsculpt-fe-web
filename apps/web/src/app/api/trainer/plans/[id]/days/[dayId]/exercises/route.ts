import { proxyToBackend, readJsonBody } from "../../../../../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; dayId: string }> },
) {
  const { id, dayId } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyToBackend(`/training-plans/${id}/days/${dayId}/exercises`, { method: "POST", body: parsed.body });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}
