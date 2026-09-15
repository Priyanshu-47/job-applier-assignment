import { NextRequest, NextResponse } from "next/server";
import { ingestJobs, JobRecord } from "@/lib/ingestion";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobs: jobsData } = body;

    if (!jobsData || !Array.isArray(jobsData)) {
      return NextResponse.json(
        { error: "Missing or invalid 'jobs' array" },
        { status: 400 }
      );
    }

    if (jobsData.length > 10000) {
      return NextResponse.json(
        { error: "Too many jobs in single request (max 10,000)" },
        { status: 400 }
      );
    }

    const counts = await ingestJobs(jobsData as JobRecord[]);

    return NextResponse.json({
      success: true,
      counts,
      total: jobsData.length,
    });
  } catch (error) {
    console.error("Ingest jobs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
