import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { resumesTable } from "@/configs/schema";
import { getOrCreateDbUser } from "@/lib/server/db-user";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resumeId = Number(id);
    if (!Number.isInteger(resumeId) || resumeId <= 0) {
      return NextResponse.json({ error: "Invalid resume id" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(resumesTable)
      .where(and(eq(resumesTable.id, resumeId), eq(resumesTable.userId, dbUser.id)));

    const resume = rows[0];
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        targetRole: resume.targetRole,
        rawText: resume.rawText,
        extractedSkills: resume.extractedSkills ?? [],
        education: resume.education ?? [],
        experience: resume.experience ?? [],
        atsScore: resume.atsScore,
        scoreBreakdown: resume.scoreBreakdown ?? {},
        analysis: resume.analysis ?? {},
        createdAt: resume.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resumeId = Number(id);
    if (!Number.isInteger(resumeId) || resumeId <= 0) {
      return NextResponse.json({ error: "Invalid resume id" }, { status: 400 });
    }

    const deleted = await db
      .delete(resumesTable)
      .where(and(eq(resumesTable.id, resumeId), eq(resumesTable.userId, dbUser.id)))
      .returning({ id: resumesTable.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted[0].id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

