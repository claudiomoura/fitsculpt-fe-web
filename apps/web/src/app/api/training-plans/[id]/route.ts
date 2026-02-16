import { proxyToBackend } from "../../gyms/_proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyToBackend(`/training-plans/${id}`);
}
