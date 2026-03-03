import { currentUser } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { parseGeneratedRoadmap } from "@/lib/roadmap/parser";
import { ExperienceLevel, GenerateRoadmapRequestBody } from "@/lib/roadmap/types";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash";

const isExperienceLevel = (value: unknown): value is ExperienceLevel =>
  value === "beginner" || value === "intermediate" || value === "advanced";

const getExperienceLevel = (value: unknown): ExperienceLevel =>
  isExperienceLevel(value) ? value : "beginner";

const buildRoadmapPrompts = ({
  goal,
  experienceLevel,
  targetRole,
}: {
  goal: string;
  experienceLevel: ExperienceLevel;
  targetRole?: string;
}) => {
  const systemPrompt = [
    "You are an expert career coach and curriculum designer.",
    "Return only valid JSON (no markdown, no extra text).",
    "Do not include markdown, prose, or extra keys.",
    'Use exactly this shape: {"title": string, "summary": string, "steps": [{"order": number, "title": string, "description": string, "duration": string|null, "prerequisites": string[], "resources": [{"title": string, "url": string}]}]}.',
    "Generate practical, sequential, action-oriented roadmap steps.",
  ].join(" ");

  const userPrompt = [
    `Create a detailed AI career roadmap for this goal: "${goal}".`,
    `Current experience level: ${experienceLevel}.`,
    targetRole ? `Target role: ${targetRole}.` : "",
    "Requirements:",
    "- 8 to 20 steps.",
    "- Include realistic durations (e.g., '2 weeks', '1 month') or null.",
    "- Use concrete prerequisites that reference previously learned concepts.",
    "- Include 1-4 high-quality resources per step with valid URLs.",
    "- Keep descriptions specific and implementation-focused.",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
};

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<GenerateRoadmapRequestBody>;
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    const targetRole = typeof body.targetRole === "string" ? body.targetRole.trim() : undefined;
    const experienceLevel = getExperienceLevel(body.experienceLevel);

    if (goal.length < 10) {
      return NextResponse.json(
        { error: "Goal must be at least 10 characters long" },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const { systemPrompt, userPrompt } = buildRoadmapPrompts({
      goal,
      experienceLevel,
      targetRole,
    });

    const startedAt = Date.now();

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const content = response.text;

    if (!content) {
      return NextResponse.json(
        { error: "Gemini response did not include content" },
        { status: 502 }
      );
    }

    const roadmap = parseGeneratedRoadmap(content);
    const generateTimeMs = Date.now() - startedAt;

    return NextResponse.json({
      roadmap,
      meta: {
        model: GEMINI_MODEL,
        generateTimeMs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

