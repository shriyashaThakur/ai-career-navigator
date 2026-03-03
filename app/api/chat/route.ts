import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { desc, eq } from "drizzle-orm";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { db } from "@/configs/db";
import { resumesTable, roadmapStepsTable, roadmapsTable } from "@/configs/schema";
import { getOrCreateDbUser } from "@/lib/server/db-user";

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Terna Career Navigator, an expert career counselor for Terna Engineering College students.

Primary objectives:
1) Give practical and actionable career guidance for engineering students.
2) Recommend realistic next steps for internships, placements, projects, resume quality, and interview prep.
3) Adapt advice to the student's year, branch, skill level, and goals when provided.
4) Keep responses concise, structured, and supportive.

Behavior rules:
- Prioritize accuracy, clarity, and student-safe guidance.
- If context is missing, ask a short clarifying question before giving deep advice.
- Avoid making up facts about companies, salaries, or eligibility criteria.
- Suggest measurable action plans (e.g., 2-week, 30-day plans) when useful.
- If asked for harmful, unethical, or dishonest actions (cheating/plagiarism), refuse and offer a constructive alternative.`;

const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const google = createGoogleGenerativeAI({ apiKey });
const toSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toISOString().split("T")[0];
};

export async function POST(request: Request) {
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY)." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const body = (await request.json()) as {
    messages?: UIMessage[];
  };

  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  if (incomingMessages.length === 0) {
    return new Response(JSON.stringify({ error: "No chat messages provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dbUser = await getOrCreateDbUser();

  const resumes =
    dbUser === null
      ? []
      : await db
          .select()
          .from(resumesTable)
          .where(eq(resumesTable.userId, dbUser.id))
          .orderBy(desc(resumesTable.createdAt))
          .limit(5);

  const roadmaps =
    dbUser === null
      ? []
      : await db
          .select()
          .from(roadmapsTable)
          .where(eq(roadmapsTable.userId, dbUser.id))
          // roadmaps table currently has no createdAt column, so we use latest id first.
          .orderBy(desc(roadmapsTable.id))
          .limit(5);

  const roadmapWithSteps =
    dbUser === null
      ? []
      : await Promise.all(
          roadmaps.map(async (roadmap) => {
            const steps = await db
              .select()
              .from(roadmapStepsTable)
              .where(eq(roadmapStepsTable.roadmapId, roadmap.id));

            const data = (roadmap.data ?? {}) as Record<string, unknown>;
            const summary = typeof data.summary === "string" ? data.summary : "";

            return {
              id: roadmap.id,
              title: roadmap.title,
              summary,
              steps: steps
                .sort((a, b) => a.stepOrder - b.stepOrder)
                .map((step) => ({
                  order: step.stepOrder,
                  title: step.title,
                  description: step.description,
                  duration: step.duration,
                })),
            };
          })
        );

  const userContext = toSerializable({
    resumes: resumes.map((resume) => {
      const analysis = (resume.analysis ?? {}) as Record<string, unknown>;
      const predictedRoles = Array.isArray(analysis.predicted_roles)
        ? analysis.predicted_roles.filter((value): value is string => typeof value === "string")
        : [];

      return {
        id: resume.id,
        fileName: resume.fileName,
        targetRole: resume.targetRole,
        atsScore: resume.atsScore,
        extractedSkills: resume.extractedSkills ?? [],
        predictedRoles,
        createdAt: resume.createdAt,
      };
    }),
    roadmaps: roadmapWithSteps,
  });

  const resumeContextLines = userContext.resumes.map((resume, index) => {
    const latestTag = index === 0 ? " [CURRENT/LATEST]" : "";
    const keySkills =
      resume.extractedSkills.length > 0
        ? resume.extractedSkills.slice(0, 6).join(", ")
        : "No key skills extracted";
    return `Resume ${index + 1}${latestTag} (Created: ${formatDate(
      resume.createdAt
    )}): ATS Score ${resume.atsScore}/100, Key Skills: ${keySkills}`;
  });

  const roadmapContextLines = roadmapWithSteps.map((roadmap, index) => {
    const latestTag = index === 0 ? " [CURRENT/LATEST]" : "";
    const sourceRoadmap = roadmaps[index];
    const createdDate = formatDate((sourceRoadmap as { createdAt?: Date | string })?.createdAt);
    const status =
      sourceRoadmap?.verified === true
        ? `Verified, ${roadmap.steps.length} steps`
        : `Draft, ${roadmap.steps.length} steps`;
    return `Roadmap ${index + 1}${latestTag} (Created: ${createdDate}): Goal "${roadmap.title}", Status: ${status}`;
  });

  const indexedContext = {
    resumes: userContext.resumes.map((resume, index) => ({
      index: index + 1,
      isCurrentLatest: index === 0,
      ...resume,
    })),
    roadmaps: roadmapWithSteps.map((roadmap, index) => ({
      index: index + 1,
      isCurrentLatest: index === 0,
      ...roadmap,
    })),
  };

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `${SYSTEM_PROMPT}

USER CONTEXT:
RESUMES (LATEST 5):
${resumeContextLines.length > 0 ? resumeContextLines.join("\n") : "No resumes found."}

ROADMAPS (LATEST 5):
${roadmapContextLines.length > 0 ? roadmapContextLines.join("\n") : "No roadmaps found."}

INDEXED USER CONTEXT JSON:
${JSON.stringify(indexedContext)}`,
    messages: await convertToModelMessages(incomingMessages),
  });

  return result.toUIMessageStreamResponse();
}

