import { proxyToBackend } from "../../../../../gyms/_proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const body = await request.json();
  return proxyToBackend(`/gym/admin/members/${userId}/role`, { method: "PATCH", body });
}
