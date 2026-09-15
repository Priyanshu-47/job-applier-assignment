import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { AlertFiltersSchema } from "@/ai/types";

export async function GET() {
  try {
    const allAlerts = await db.select().from(alerts);
    return NextResponse.json({ alerts: allAlerts });
  } catch (error) {
    console.error("Get alerts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, rawQuery, filters, userId } = body;

    if (!rawQuery || typeof rawQuery !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'rawQuery' field" },
        { status: 400 }
      );
    }

    if (!filters) {
      return NextResponse.json(
        { error: "Missing 'filters' field" },
        { status: 400 }
      );
    }

    // Validate filters
    const validation = AlertFiltersSchema.safeParse(filters);
    if (!validation.success) {
      return NextResponse.json(
        { error: `Invalid filters: ${validation.error.message}` },
        { status: 400 }
      );
    }

    const newAlert = await db
      .insert(alerts)
      .values({
        id: uuidv4(),
        userId: userId || "default-user",
        name: name || rawQuery.slice(0, 100),
        rawQuery,
        filters: validation.data,
      })
      .returning();

    return NextResponse.json({ alert: newAlert[0] }, { status: 201 });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing 'id' query parameter" },
        { status: 400 }
      );
    }

    await db.delete(alerts).where(eq(alerts.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
