import { NextResponse } from "next/server";

const API_BASE = process.env.ELIZAOS_API_URL || "http://72.62.176.85:3003";

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/agents`, {
      next: { revalidate: 30 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch agents" },
      { status: 502 }
    );
  }
}
