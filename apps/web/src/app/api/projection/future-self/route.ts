import { proxyToBackend } from "../../gyms/_proxy";

export async function GET(request: Request) {
  return proxyToBackend("/projection/future-self", { request });
}
