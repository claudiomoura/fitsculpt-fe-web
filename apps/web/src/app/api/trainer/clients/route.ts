import { proxyToBackend } from "../../gyms/_proxy";

export async function GET() {
  return proxyToBackend("/trainer/clients");
}
