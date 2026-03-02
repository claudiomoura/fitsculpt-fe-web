import { proxyToBackend, readJsonBody } from "../../../gyms/_proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/nutrition-plans/${id}`);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToBackend(`/trainer/nutrition-plans/${id}`, { method: "PATCH", body: parsed.body });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/nutrition-plans/${id}`, { method: "DELETE" });
}
