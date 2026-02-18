import { NextResponse } from "next/server";
import { fetchBackend, readJsonBody } from "../../gyms/_proxy";

export async function POST(request: Request) {
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  let result = await fetchBackend("/gym/join-request", { method: "POST", body: parsedBody.body });

  if (result.status === 404 || result.status === 405) {
    result = await fetchBackend("/gyms/join", { method: "POST", body: parsedBody.body });
  }

  return NextResponse.json(result.payload, { status: result.status });
}
