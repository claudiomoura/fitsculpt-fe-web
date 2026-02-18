import { proxyToBackend } from "../../../gyms/_proxy";

type Params = {
  params: Promise<{ gymId: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  const { gymId } = await params;
  return proxyToBackend(`/admin/gyms/${gymId}`, { method: "DELETE" });
}
