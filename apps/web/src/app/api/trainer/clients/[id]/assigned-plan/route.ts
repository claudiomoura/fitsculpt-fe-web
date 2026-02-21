import { proxyToBackend, readJsonBody } from "../../../../gyms/_proxy";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/clients/${id}/assigned-plan`);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  return proxyToBackend(`/trainer/clients/${id}/assigned-plan`, { method: "POST", body: parsed.body });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/clients/${id}/assigned-plan`, { method: "DELETE" });
}
