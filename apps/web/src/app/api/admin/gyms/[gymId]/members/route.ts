import { proxyToBackend } from "../../../../gyms/_proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = await params;
  return proxyToBackend(`/admin/gyms/${gymId}/members`);
}
