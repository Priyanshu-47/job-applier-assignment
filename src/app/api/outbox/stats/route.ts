import { NextResponse } from "next/server";
import { getOutboxStats } from "@/lib/outbox";

export async function GET() {
  try {
    const stats = await getOutboxStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Get outbox stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
