import { proxyToBackend } from "../../gyms/_proxy";

export async function GET() {
  const response = await proxyToBackend("/gym/me");
  if (response.status === 404 || response.status === 405) {
    return proxyToBackend("/gyms/membership");
  }

  return response;
}
