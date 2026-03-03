import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { resumesTable } from "@/configs/schema";
import { getOrCreateDbUser } from "@/lib/server/db-user";

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await db
      .select()
      .from(resumesTable)
      .where(eq(resumesTable.userId, dbUser.id))
      .orderBy(desc(resumesTable.createdAt));

    return NextResponse.json({
      resumes: resumes.map((resume) => ({
        id: resume.id,
        fileName: resume.fileName,
        targetRole: resume.targetRole,
        atsScore: resume.atsScore,
        extractedSkillsCount: Array.isArray(resume.extractedSkills)
          ? resume.extractedSkills.length
          : 0,
        createdAt: resume.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

