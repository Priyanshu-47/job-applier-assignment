import { NextResponse } from "next/server";
import { getAllJobs } from "@/lib/ingestion";

export async function GET() {
  try {
    const allJobs = await getAllJobs();
    return NextResponse.json({ jobs: allJobs });
  } catch (error) {
    console.error("Get jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
