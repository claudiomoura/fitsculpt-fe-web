import { proxyToBackend } from "../../../../gyms/_proxy";

export async function POST(_request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await params;
  return proxyToBackend(`/admin/gym-join-requests/${membershipId}/reject`, { method: "POST" });
}
