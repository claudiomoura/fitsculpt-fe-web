import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

type Params = { id: string };

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function PUT(request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json();
  try {
const response = await fetch(`${getBackendUrl()}/user-foods/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
const response = await fetch(`${getBackendUrl()}/user-foods/${id}`, {
      method: "DELETE",
      headers: { cookie: authCookie },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
