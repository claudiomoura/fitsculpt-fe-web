import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  const signature = (await cookies()).get("fs_token.sig")?.value;
  if (token && signature) {
    return `fs_token=${token}; fs_token.sig=${signature}`;
  }
  return token ? `fs_token=${token}` : null;
}

export async function POST(request: Request) {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json();
  try {
    const response = await fetch(`${getBackendUrl()}/ai/nutrition-plan`, {
      method: "POST",
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
