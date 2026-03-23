import { proxyToBackend } from "../../../gyms/_proxy";

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;
  return proxyToBackend("/research/rct/events", {
    method: "POST",
    body,
    request,
  });
}
