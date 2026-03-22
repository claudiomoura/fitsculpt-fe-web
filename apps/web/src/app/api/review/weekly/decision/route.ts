import { proxyToBackend } from "../../../gyms/_proxy";

export async function POST(request: Request) {
  const body = (await request.json()) as unknown;
  return proxyToBackend("/review/weekly/decision", {
    method: "POST",
    body,
    request,
  });
}
