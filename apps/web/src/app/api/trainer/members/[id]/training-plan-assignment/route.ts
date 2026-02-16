import { proxyToBackend } from "../../../../gyms/_proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/trainer/members/${id}/training-plan-assignment`);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return proxyToBackend(`/trainer/members/${id}/training-plan-assignment`, { method: "POST", body });
}
