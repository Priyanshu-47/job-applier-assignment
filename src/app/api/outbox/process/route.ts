import { NextRequest, NextResponse } from "next/server";
import { processOutbox } from "@/lib/outbox";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = body.batchSize || 100;

    if (batchSize < 1 || batchSize > 1000) {
      return NextResponse.json(
        { error: "batchSize must be between 1 and 1000" },
        { status: 400 }
      );
    }

    const result = await processOutbox(batchSize);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Process outbox error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
