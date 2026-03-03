import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { alumniTable } from "@/configs/schema";

export async function GET() {
  try {
    const alumni = await db.select().from(alumniTable).orderBy(desc(alumniTable.createdAt));
    return NextResponse.json({ alumni });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

