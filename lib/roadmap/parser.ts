import { GeneratedRoadmap, RoadmapResource, RoadmapStep } from "@/lib/roadmap/types";

const MAX_STEPS = 30;

const roadmapJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "steps"],
  properties: {
    title: { type: "string", minLength: 5, maxLength: 120 },
    summary: { type: "string", minLength: 20, maxLength: 500 },
    steps: {
      type: "array",
      minItems: 5,
      maxItems: MAX_STEPS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["order", "title", "description", "duration", "prerequisites", "resources"],
        properties: {
          order: { type: "integer", minimum: 1, maximum: MAX_STEPS },
          title: { type: "string", minLength: 3, maxLength: 140 },
          description: { type: "string", minLength: 20, maxLength: 900 },
          duration: { type: ["string", "null"], maxLength: 80 },
          prerequisites: {
            type: "array",
            maxItems: 12,
            items: { type: "string", minLength: 2, maxLength: 120 },
          },
          resources: {
            type: "array",
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "url"],
              properties: {
                title: { type: "string", minLength: 2, maxLength: 140 },
                url: { type: "string", minLength: 8, maxLength: 500 },
              },
            },
          },
        },
      },
    },
  },
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeString = (value: unknown, fieldName: string): string => {
  if (!isNonEmptyString(value)) {
    throw new Error(`Invalid ${fieldName}: expected non-empty string`);
  }
  return value.trim();
};

const normalizeResources = (value: unknown, index: number): RoadmapResource[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid resources in step ${index + 1}: expected array`);
  }

  return value
    .filter((resource) => isRecord(resource))
    .map((resource, resourceIdx) => {
      const title = normalizeString(resource.title, `resources[${resourceIdx}].title`);
      const url = normalizeString(resource.url, `resources[${resourceIdx}].url`);

      try {
        // Validate URL format and normalize it.
        const parsed = new URL(url);
        return { title, url: parsed.toString() };
      } catch {
        throw new Error(`Invalid resources[${resourceIdx}].url: must be a valid URL`);
      }
    });
};

const normalizeSteps = (value: unknown): RoadmapStep[] => {
  if (!Array.isArray(value)) {
    throw new Error("Invalid steps: expected array");
  }
  if (value.length === 0) {
    throw new Error("Invalid steps: roadmap requires at least one step");
  }

  const normalized = value.map((step, index): RoadmapStep => {
    if (!isRecord(step)) {
      throw new Error(`Invalid step at index ${index}: expected object`);
    }

    const parsedOrder = Number(step.order);
    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      throw new Error(`Invalid step order at index ${index}: expected positive integer`);
    }

    const prerequisites = Array.isArray(step.prerequisites)
      ? step.prerequisites
          .filter((entry): entry is string => isNonEmptyString(entry))
          .map((entry) => entry.trim())
      : [];

    const durationValue =
      step.duration === null || step.duration === undefined
        ? null
        : normalizeString(step.duration, `steps[${index}].duration`);

    return {
      order: parsedOrder,
      title: normalizeString(step.title, `steps[${index}].title`),
      description: normalizeString(step.description, `steps[${index}].description`),
      duration: durationValue,
      prerequisites,
      resources: normalizeResources(step.resources ?? [], index),
    };
  });

  // Enforce deterministic ordering expected by DB writes.
  return normalized.sort((a, b) => a.order - b.order);
};

const extractJson = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Model did not return valid JSON content");
};

export const parseGeneratedRoadmap = (rawOutput: unknown): GeneratedRoadmap => {
  const rawString =
    typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput ?? null);
  const extracted = extractJson(rawString);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    throw new Error("Failed to parse generated roadmap JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid roadmap output: expected object");
  }

  const roadmap: GeneratedRoadmap = {
    title: normalizeString(parsed.title, "title"),
    summary: normalizeString(parsed.summary, "summary"),
    steps: normalizeSteps(parsed.steps),
  };

  if (roadmap.steps.length > MAX_STEPS) {
    throw new Error(`Invalid roadmap output: more than ${MAX_STEPS} steps`);
  }

  return roadmap;
};

export const ROADMAP_JSON_SCHEMA = roadmapJsonSchema;

// Backward-compatible alias for older imports.
export const parseOpenAiRoadmap = parseGeneratedRoadmap;

