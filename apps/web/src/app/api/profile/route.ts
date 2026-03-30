import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend";

async function getAuthCookie() {
  const token = (await cookies()).get("fs_token")?.value;
  return token ? `fs_token=${token}` : null;
}

export async function GET() {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(`${getBackendUrl()}/profile`, {
      headers: { cookie: authCookie },
      cache: "no-store",
    });

    const data = await response.json();
    // FORCE: Always extract just the profile object from the response
    // Backend returns { id, name, email, plan, profile: {...valid data...} }
    // We ONLY want the profile part, nothing else
    let profileData: unknown = null;
    
    if (data && typeof data === "object" && !Array.isArray(data)) {
      if ("profile" in data) {
        // If there's a profile key, use ONLY that - ignore everything else at root level
        profileData = (data as { profile: unknown }).profile;
      } else {
        // No profile key - use everything (fallback)
        profileData = data;
      }
    } else {
      profileData = data;
    }
    
    return NextResponse.json(profileData);
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const authCookie = await getAuthCookie();
  if (!authCookie) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json();
  try {
    const response = await fetch(`${getBackendUrl()}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie: authCookie,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    // FORCE: Always extract just the profile object from the response
    let profileData: unknown = null;
    
    if (data && typeof data === "object" && !Array.isArray(data)) {
      if ("profile" in data) {
        profileData = (data as { profile: unknown }).profile;
      } else {
        profileData = data;
      }
    } else {
      profileData = data;
    }
    
    return NextResponse.json(profileData);
  } catch {
    return NextResponse.json({ error: "BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
