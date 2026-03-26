import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  source: z.string().optional(),
});

interface WaitlistEntry {
  email: string;
  name?: string;
  source?: string;
  position: number;
  createdAt: string;
  status: "pending" | "invited" | "joined";
}

const waitlist: WaitlistEntry[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source } = waitlistSchema.parse(body);

    const existing = waitlist.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    
    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Ya estás en la lista de espera",
        position: existing.position,
        status: existing.status,
      });
    }

    const position = waitlist.length + 1;
    const entry: WaitlistEntry = {
      email,
      name,
      source,
      position,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    waitlist.push(entry);

    return NextResponse.json({
      success: true,
      message: "Te has unido a la lista de espera",
      position,
      status: "pending",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Email inválido" },
        { status: 400 }
      );
    }
    
    console.error("[Waitlist] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  
  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email requerido" },
      { status: 400 }
    );
  }

  const entry = waitlist.find((e) => e.email.toLowerCase() === email.toLowerCase());

  if (!entry) {
    return NextResponse.json({
      success: false,
      error: "No encontrado en la lista de espera",
    });
  }

  return NextResponse.json({
    success: true,
    position: entry.position,
    status: entry.status,
  });
}
