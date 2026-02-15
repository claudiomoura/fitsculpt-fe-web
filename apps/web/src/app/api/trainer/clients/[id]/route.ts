import { proxyToBackend } from "../../../gyms/_proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/trainer/clients/${id}`);
}
