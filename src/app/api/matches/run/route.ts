import { NextResponse } from "next/server";
import { runMatching } from "@/lib/matching";

export async function POST() {
  try {
    const results = await runMatching();
    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalAlerts: results.length,
        totalNewMatches: results.reduce((sum, r) => sum + r.newMatches, 0),
        totalMatchedJobs: results.reduce((sum, r) => sum + r.matchedJobs, 0),
      },
    });
  } catch (error) {
    console.error("Run matching error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
