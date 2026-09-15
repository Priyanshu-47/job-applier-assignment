import { NextRequest, NextResponse } from "next/server";
import { parseAlertQuery } from "@/ai/parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'query' field" },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: "Query too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    const result = await parseAlertQuery(query);

    return NextResponse.json({
      success: result.parseSuccess,
      filters: result.filters,
      rawQuery: query,
      error: result.error,
      observability: result.observability,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
