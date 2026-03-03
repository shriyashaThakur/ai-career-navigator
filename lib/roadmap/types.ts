export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type RoadmapResource = {
  title: string;
  url: string;
};

export type RoadmapStep = {
  order: number;
  title: string;
  description: string;
  duration: string | null;
  prerequisites: string[];
  resources: RoadmapResource[];
};

export type GeneratedRoadmap = {
  title: string;
  summary: string;
  steps: RoadmapStep[];
};

export type GenerateRoadmapRequestBody = {
  goal: string;
  targetRole?: string;
  experienceLevel?: ExperienceLevel;
};

export type SaveRoadmapRequestBody = {
  prompt: string;
  categoryId?: number | null;
  verified?: boolean;
  generateTimeMs?: number | null;
  roadmap: GeneratedRoadmap;
};

