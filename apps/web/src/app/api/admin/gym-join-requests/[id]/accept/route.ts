import { proxyToBackend } from "../../../../gyms/_proxy";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/admin/gym-join-requests/${id}/accept`, { method: "POST" });
}
