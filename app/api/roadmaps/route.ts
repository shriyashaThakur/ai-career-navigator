import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { roadmapStepsTable, roadmapsTable } from "@/configs/schema";
import { parseGeneratedRoadmap } from "@/lib/roadmap/parser";
import { SaveRoadmapRequestBody } from "@/lib/roadmap/types";
import { getOrCreateDbUser } from "@/lib/server/db-user";

const createRoadmapCode = () =>
  `rm_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;

export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<SaveRoadmapRequestBody>;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (!body.roadmap) {
      return NextResponse.json({ error: "Roadmap payload is required" }, { status: 400 });
    }

    const roadmap = parseGeneratedRoadmap(body.roadmap);
    const roadmapCode = createRoadmapCode();
    const categoryId = typeof body.categoryId === "number" ? body.categoryId : null;
    const verified = typeof body.verified === "boolean" ? body.verified : false;
    const generateTimeMs =
      typeof body.generateTimeMs === "number" && body.generateTimeMs >= 0
        ? Math.round(body.generateTimeMs)
        : null;

    const insertedRoadmaps = await db
      .insert(roadmapsTable)
      .values({
        userId: dbUser.id,
        categoryId,
        title: roadmap.title,
        code: roadmapCode,
        prompt,
        verified,
        generateTimeMs,
        data: roadmap as unknown as Record<string, unknown>,
      })
      .returning();

    const createdRoadmap = insertedRoadmaps[0];
    if (!createdRoadmap) {
      return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 });
    }

    await db.insert(roadmapStepsTable).values(
      roadmap.steps.map((step, index) => ({
        roadmapId: createdRoadmap.id,
        stepOrder: step.order,
        title: step.title,
        description: step.description,
        duration: step.duration,
        resourceLinks: step.resources,
        prerequisites: step.prerequisites,
        positionX: (index % 3) * 360,
        positionY: Math.floor(index / 3) * 220,
      }))
    );

    return NextResponse.json({
      roadmap: {
        id: createdRoadmap.id,
        code: createdRoadmap.code,
        title: roadmap.title,
        summary: roadmap.summary,
        stepsCount: roadmap.steps.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await db
      .select()
      .from(roadmapsTable)
      .where(eq(roadmapsTable.userId, dbUser.id))
      .orderBy(desc(roadmapsTable.id));

    return NextResponse.json({
      roadmaps: items.map((item) => {
        const summary =
          item.data && typeof item.data === "object" && "summary" in item.data
            ? String((item.data as { summary?: unknown }).summary ?? "")
            : "";

        return {
          id: item.id,
          title: item.title,
          code: item.code,
          summary,
          verified: item.verified,
          generateTimeMs: item.generateTimeMs,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

