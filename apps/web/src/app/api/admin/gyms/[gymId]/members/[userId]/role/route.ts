import { proxyToBackend } from "../../../../../../gyms/_proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ gymId: string; userId: string }> }
) {
  const { gymId, userId } = await params;
  const body = await request.json();
  return proxyToBackend(`/admin/gyms/${gymId}/members/${userId}/role`, { method: "PATCH", body });
}
