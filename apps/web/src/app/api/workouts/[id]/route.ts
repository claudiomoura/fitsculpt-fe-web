import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

function getAuthCookie() {
  const token = cookies().get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const authCookie = getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const response = await fetch(`${getBackendUrl()}/workouts/${context.params.id}`, {
    headers: { cookie: authCookie },
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const authCookie = getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json();
  const response = await fetch(`${getBackendUrl()}/workouts/${context.params.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: authCookie,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const authCookie = getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const response = await fetch(`${getBackendUrl()}/workouts/${context.params.id}`, {
    method: "DELETE",
    headers: { cookie: authCookie },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
