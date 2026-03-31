// FIX: Polyfill for DOMMatrix in Node.js environment (needed for pdf-parse on Vercel)
if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { resumesTable } from "@/configs/schema";
import { extractTextFromPdfFile } from "@/lib/resume-parser";
import { getOrCreateDbUser } from "@/lib/server/db-user";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_FILE_SIZE_MB = 8;

const SYSTEM_INSTRUCTION = `Role: You are an expert Technical Recruiter and ATS (Applicant Tracking System) Optimization specialist with 20 years of experience in talent acquisition.

Task: Your goal is to analyze the provided raw resume text and calculate a highly accurate ATS Compatibility Score out of 100 based on the following weighted criteria:

Keyword & Skill Match (50%): Identify hard skills, technical tools, and industry-specific terminology. Use semantic matching.

Readability & Formatting (20%): Check for "ATS-unfriendly" elements.

Section Completeness (15%): Verify the presence of standard headers: Summary, Work Experience, Education, and Skills.

Experience Relevance (15%): Evaluate chronological consistency and whether the experience level matches the Target Role.

Rule 1 (Job Description): If a Job Description is provided, calculate the 50% Keyword Match strictly against the hard requirements in that specific JD. Mention missing JD skills in the critical_missing_skills array.

Rule 2 (Impact Metrics): When grading 'Experience Relevance', penalize the score if bullet points lack quantifiable numbers or do not start with strong action verbs. Tell them to use the 'XYZ Formula' in the suggested_improvements.

Rule 3 (Legacy ATS Warning): Analyze the text for signs of complex formatting (like scrambled text from multiple columns). If detected, dock the formatting score and add a warning in formatting_warnings that 'multi-column layouts may crash legacy ATS parsers.'

Output Instructions:
You MUST return your response in a valid JSON format. The JSON must follow this exact structure:
{
"extracted_skills": ["string"],
"education": [{"degree": "string", "institution": "string", "year": "string"}],
"experience": [{"role": "string", "company": "string", "duration": "string"}],
"ats_score": number,
"score_breakdown": {
"keyword_score": number,
"formatting_score": number,
"section_score": number,
"relevance_score": number
},
"analysis": {
"critical_missing_skills": ["string"],
"formatting_warnings": ["string"],
"suggested_improvements": "string"
},
"predicted_roles": ["string"]
}
***`;

type ResumeAnalysisModelOutput = {
  extracted_skills: string[];
  education: Array<{ degree: string; institution: string; year: string }>;
  experience: Array<{ role: string; company: string; duration: string }>;
  ats_score: number;
  score_breakdown: {
    keyword_score: number;
    formatting_score: number;
    section_score: number;
    relevance_score: number;
  };
  analysis: {
    critical_missing_skills: string[];
    formatting_warnings: string[];
    suggested_improvements: string;
  };
  predicted_roles: string[];
};

const extractJsonFromText = (raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Gemini did not return a valid JSON object");
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const toSafeScore = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const parseResumeAnalysis = (raw: string): ResumeAnalysisModelOutput => {
  const jsonText = extractJsonFromText(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Failed to parse Gemini JSON response");
  }

  const record = parsed as Record<string, unknown>;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Invalid Gemini response: expected an object");
  }

  const educationRaw = Array.isArray(record.education) ? record.education : [];
  const experienceRaw = Array.isArray(record.experience) ? record.experience : [];
  const breakdown =
    record.score_breakdown && typeof record.score_breakdown === "object"
      ? (record.score_breakdown as Record<string, unknown>)
      : {};
  const analysisRaw =
    record.analysis && typeof record.analysis === "object"
      ? (record.analysis as Record<string, unknown>)
      : {};

  return {
    extracted_skills: toStringArray(record.extracted_skills),
    education: educationRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        degree: typeof row?.degree === "string" ? row.degree.trim() : "",
        institution: typeof row?.institution === "string" ? row.institution.trim() : "",
        year: typeof row?.year === "string" ? row.year.trim() : "",
      };
    }),
    experience: experienceRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        role: typeof row?.role === "string" ? row.role.trim() : "",
        company: typeof row?.company === "string" ? row.company.trim() : "",
        duration: typeof row?.duration === "string" ? row.duration.trim() : "",
      };
    }),
    ats_score: toSafeScore(record.ats_score),
    score_breakdown: {
      keyword_score: toSafeScore(breakdown.keyword_score),
      formatting_score: toSafeScore(breakdown.formatting_score),
      section_score: toSafeScore(breakdown.section_score),
      relevance_score: toSafeScore(breakdown.relevance_score),
    },
    analysis: {
      critical_missing_skills: toStringArray(analysisRaw.critical_missing_skills),
      formatting_warnings: toStringArray(analysisRaw.formatting_warnings),
      suggested_improvements:
        typeof analysisRaw.suggested_improvements === "string"
          ? analysisRaw.suggested_improvements.trim()
          : "",
    },
    predicted_roles: toStringArray(record.predicted_roles),
  };
};

export async function POST(request: Request) {
  try {
    const dbUser = await getOrCreateDbUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const targetRoleEntry = formData.get("targetRole");
    const jobDescriptionEntry = formData.get("jobDescription");
    const targetRole = typeof targetRoleEntry === "string" ? targetRoleEntry.trim() : "";
    const jobDescription =
      typeof jobDescriptionEntry === "string" ? jobDescriptionEntry.trim() : "";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const fileSizeMb = file.size / (1024 * 1024);
    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_FILE_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    const parsedResume = await extractTextFromPdfFile(file);

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const prompt = `Target Role: ${targetRole || "Not specified"}
Job Description: ${jobDescription || "Not provided"}

Raw Resume Text:
${parsedResume.text}`;

    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.text;
    if (!responseText) {
      return NextResponse.json(
        { error: "Gemini returned an empty analysis response" },
        { status: 502 }
      );
    }

    const parsed = parseResumeAnalysis(responseText);
    const analysisPayload = {
      ...parsed.analysis,
      predicted_roles: parsed.predicted_roles,
    };

    const inserted = await db
      .insert(resumesTable)
      .values({
        userId: dbUser.id,
        fileName: parsedResume.fileName,
        rawText: parsedResume.text,
        targetRole: targetRole || null,
        extractedSkills: parsed.extracted_skills,
        education: parsed.education,
        experience: parsed.experience,
        atsScore: parsed.ats_score,
        scoreBreakdown: parsed.score_breakdown,
        analysis: analysisPayload,
      })
      .returning();

    const savedResume = inserted[0];
    if (!savedResume) {
      return NextResponse.json({ error: "Failed to save analyzed resume" }, { status: 500 });
    }

    return NextResponse.json({
      resume: {
        id: savedResume.id,
        fileName: savedResume.fileName,
        rawText: savedResume.rawText,
        targetRole: savedResume.targetRole,
        extractedSkills: savedResume.extractedSkills ?? [],
        education: savedResume.education ?? [],
        experience: savedResume.experience ?? [],
        atsScore: savedResume.atsScore,
        scoreBreakdown: savedResume.scoreBreakdown ?? {},
        analysis: savedResume.analysis ?? {},
        createdAt: savedResume.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

