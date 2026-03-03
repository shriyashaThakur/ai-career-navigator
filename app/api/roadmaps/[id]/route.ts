import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { roadmapStepsTable, roadmapsTable } from "@/configs/schema";
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
    const roadmapId = Number(id);
    if (!Number.isInteger(roadmapId) || roadmapId <= 0) {
      return NextResponse.json({ error: "Invalid roadmap id" }, { status: 400 });
    }

    const roadmaps = await db
      .select()
      .from(roadmapsTable)
      .where(and(eq(roadmapsTable.id, roadmapId), eq(roadmapsTable.userId, dbUser.id)));

    const roadmap = roadmaps[0];
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    const steps = await db
      .select()
      .from(roadmapStepsTable)
      .where(eq(roadmapStepsTable.roadmapId, roadmap.id))
      .orderBy(asc(roadmapStepsTable.stepOrder));

    const summary =
      roadmap.data && typeof roadmap.data === "object" && "summary" in roadmap.data
        ? String((roadmap.data as { summary?: unknown }).summary ?? "")
        : "";

    return NextResponse.json({
      roadmap: {
        id: roadmap.id,
        code: roadmap.code,
        title: roadmap.title,
        prompt: roadmap.prompt,
        summary,
        verified: roadmap.verified,
        generateTimeMs: roadmap.generateTimeMs,
        steps: steps.map((step) => ({
          id: step.id,
          order: step.stepOrder,
          title: step.title,
          description: step.description,
          duration: step.duration,
          prerequisites: step.prerequisites ?? [],
          resources: step.resourceLinks ?? [],
          position: {
            x: step.positionX,
            y: step.positionY,
          },
        })),
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
    const roadmapId = Number(id);
    if (!Number.isInteger(roadmapId) || roadmapId <= 0) {
      return NextResponse.json({ error: "Invalid roadmap id" }, { status: 400 });
    }

    const deleted = await db
      .delete(roadmapsTable)
      .where(and(eq(roadmapsTable.id, roadmapId), eq(roadmapsTable.userId, dbUser.id)))
      .returning({ id: roadmapsTable.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deleted[0].id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

