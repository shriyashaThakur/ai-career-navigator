"use client";

import {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

type GenerateResponse = {
  roadmap: {
    title: string;
    summary: string;
    steps: Array<{
      order: number;
      title: string;
      description: string;
      duration: string | null;
      prerequisites: string[];
      resources: Array<{ title: string; url: string }>;
    }>;
  };
  meta: {
    model: string;
    generateTimeMs: number;
  };
};

type SaveResponse = {
  roadmap: {
    id: number;
    code: string;
    title: string;
    summary: string;
    stepsCount: number;
  };
};

type RoadmapListItem = {
  id: number;
  title: string;
  code: string;
  summary: string;
  verified: boolean;
  generateTimeMs: number | null;
};

type RoadmapDetail = {
  roadmap: {
    id: number;
    code: string;
    title: string;
    prompt: string;
    summary: string;
    verified: boolean;
    generateTimeMs: number | null;
    steps: Array<{
      id: number;
      order: number;
      title: string;
      description: string;
      duration: string | null;
      prerequisites: string[];
      resources: Array<{ title: string; url: string }>;
      position: {
        x: number;
        y: number;
      };
    }>;
  };
};

type ApiError = {
  error?: string;
};

type RoadmapNodeData = {
  order: number;
  title: string;
  description: string;
  duration: string | null;
  resources: Array<{ title: string; url: string }>;
};

const NODE_WIDTH = 300;
const NODE_HEIGHT = 220;

const parseApiError = async (response: Response, fallback: string) => {
  try {
    const json = (await response.json()) as ApiError;
    return json.error ?? fallback;
  } catch {
    return fallback;
  }
};

const shouldUseAutoLayout = (
  steps: RoadmapDetail["roadmap"]["steps"]
): boolean => {
  if (steps.length <= 1) {
    return false;
  }

  const occupiedPositions = new Set<string>();
  let hasDefaultLikePositions = 0;

  for (const step of steps) {
    const key = `${Math.round(step.position.x / 30)}:${Math.round(step.position.y / 30)}`;
    if (occupiedPositions.has(key)) {
      return true;
    }
    occupiedPositions.add(key);

    if (
      (step.position.x === 0 && step.position.y === 0) ||
      (step.position.x % 360 === 0 && step.position.y % 220 === 0)
    ) {
      hasDefaultLikePositions += 1;
    }
  }

  return hasDefaultLikePositions === steps.length;
};

const getAutoLayoutPositions = (steps: RoadmapDetail["roadmap"]["steps"]) => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    nodesep: 80,
    ranksep: 90,
    marginx: 20,
    marginy: 20,
  });

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
  for (const step of sortedSteps) {
    graph.setNode(step.id.toString(), { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (let index = 1; index < sortedSteps.length; index += 1) {
    graph.setEdge(
      sortedSteps[index - 1].id.toString(),
      sortedSteps[index].id.toString()
    );
  }

  dagre.layout(graph);

  const layoutPositions = new Map<string, { x: number; y: number }>();
  for (const step of sortedSteps) {
    const laidOut = graph.node(step.id.toString()) as { x: number; y: number } | undefined;
    if (laidOut) {
      layoutPositions.set(step.id.toString(), {
        x: laidOut.x - NODE_WIDTH / 2,
        y: laidOut.y - NODE_HEIGHT / 2,
      });
    }
  }

  return layoutPositions;
};

const StepNode = ({ data }: NodeProps<Node<RoadmapNodeData>>) => {
  const nodeData = data;

  return (
    <div className="w-[300px] rounded-xl border bg-white p-4 shadow-md">
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-500" />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Step {nodeData.order}
      </p>
      <h3 className="mt-1 text-sm font-bold text-slate-900">{nodeData.title}</h3>
      <p className="mt-2 line-clamp-4 text-xs text-slate-600">{nodeData.description}</p>
      {nodeData.duration ? (
        <p className="mt-3 text-xs font-medium text-emerald-700">Duration: {nodeData.duration}</p>
      ) : null}
      {nodeData.resources.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-700">Resources</p>
          <ul className="mt-1 space-y-1">
            {nodeData.resources.slice(0, 2).map((resource) => (
              <li key={resource.url} className="truncate text-xs">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="nodrag nopan text-blue-700 underline-offset-2 hover:underline"
                >
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-500" />
    </div>
  );
};

const nodeTypes = {
  roadmapStep: StepNode,
};

function RoadmapGeneratorAgent() {
  const [goal, setGoal] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("beginner");
  const [roadmaps, setRoadmaps] = useState<RoadmapListItem[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<number | null>(null);
  const [roadmapDetail, setRoadmapDetail] = useState<RoadmapDetail["roadmap"] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [deletingRoadmapId, setDeletingRoadmapId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRoadmapDetail = useCallback(async (id: number) => {
    setIsLoadingDetail(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/roadmaps/${id}`, { method: "GET" });
      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to load roadmap details"));
      }

      const payload = (await response.json()) as RoadmapDetail;
      setRoadmapDetail(payload.roadmap);
      setSelectedRoadmapId(payload.roadmap.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load roadmap details";
      setErrorMessage(message);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const loadRoadmaps = useCallback(async () => {
    setIsLoadingRoadmaps(true);

    try {
      const response = await fetch("/api/roadmaps", { method: "GET" });
      if (!response.ok) {
        throw new Error(await parseApiError(response, "Failed to load roadmaps"));
      }

      const payload = (await response.json()) as { roadmaps: RoadmapListItem[] };
      setRoadmaps(payload.roadmaps);

      if (payload.roadmaps.length > 0 && !selectedRoadmapId) {
        await loadRoadmapDetail(payload.roadmaps[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load roadmaps";
      setErrorMessage(message);
    } finally {
      setIsLoadingRoadmaps(false);
    }
  }, [loadRoadmapDetail, selectedRoadmapId]);

  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  const handleGenerateAndSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedGoal = goal.trim();
    if (trimmedGoal.length < 10) {
      setErrorMessage("Goal must be at least 10 characters.");
      return;
    }

    setIsGenerating(true);

    try {
      const generateResponse = await fetch("/api/roadmaps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: trimmedGoal,
          targetRole: targetRole.trim() || undefined,
          experienceLevel,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error(await parseApiError(generateResponse, "Failed to generate roadmap"));
      }

      const generatedPayload = (await generateResponse.json()) as GenerateResponse;

      const saveResponse = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedGoal,
          generateTimeMs: generatedPayload.meta.generateTimeMs,
          roadmap: generatedPayload.roadmap,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error(await parseApiError(saveResponse, "Failed to save generated roadmap"));
      }

      const savedPayload = (await saveResponse.json()) as SaveResponse;
      await loadRoadmaps();
      await loadRoadmapDetail(savedPayload.roadmap.id);

      setSuccessMessage("Roadmap generated and saved successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Roadmap generation failed. Please retry.";
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteRoadmap = async (roadmapId: number) => {
    const isConfirmed = window.confirm("Delete this roadmap permanently?");
    if (!isConfirmed) {
      return;
    }

    setDeletingRoadmapId(roadmapId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const deleteResponse = await fetch(`/api/roadmaps/${roadmapId}`, {
        method: "DELETE",
      });
      if (!deleteResponse.ok) {
        throw new Error(await parseApiError(deleteResponse, "Failed to delete roadmap"));
      }

      const listResponse = await fetch("/api/roadmaps", { method: "GET" });
      if (!listResponse.ok) {
        throw new Error(await parseApiError(listResponse, "Failed to refresh roadmap list"));
      }

      const listPayload = (await listResponse.json()) as { roadmaps: RoadmapListItem[] };
      setRoadmaps(listPayload.roadmaps);

      if (listPayload.roadmaps.length === 0) {
        setSelectedRoadmapId(null);
        setRoadmapDetail(null);
      } else if (selectedRoadmapId === roadmapId) {
        await loadRoadmapDetail(listPayload.roadmaps[0].id);
      }

      setSuccessMessage("Roadmap deleted successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete roadmap";
      setErrorMessage(message);
    } finally {
      setDeletingRoadmapId(null);
    }
  };

  const nodes = useMemo<Node<RoadmapNodeData>[]>(() => {
    if (!roadmapDetail) {
      return [];
    }

    const useAutoLayout = shouldUseAutoLayout(roadmapDetail.steps);
    const autoLayoutPositions = useAutoLayout
      ? getAutoLayoutPositions(roadmapDetail.steps)
      : new Map<string, { x: number; y: number }>();

    return roadmapDetail.steps.map((step) => ({
      id: step.id.toString(),
      type: "roadmapStep",
      position: autoLayoutPositions.get(step.id.toString()) ?? {
        x: step.position.x,
        y: step.position.y,
      },
      data: {
        order: step.order,
        title: step.title,
        description: step.description,
        duration: step.duration,
        resources: step.resources,
      },
    }));
  }, [roadmapDetail]);

  const edges = useMemo<Edge[]>(() => {
    if (!roadmapDetail) {
      return [];
    }

    const sortedSteps = [...roadmapDetail.steps].sort((a, b) => a.order - b.order);
    return sortedSteps.slice(1).map((step, index) => ({
      id: `edge-${sortedSteps[index].id}-${step.id}`,
      source: sortedSteps[index].id.toString(),
      target: step.id.toString(),
      type: "smoothstep",
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
    }));
  }, [roadmapDetail]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <h1 className="text-2xl font-bold">AI Career Roadmap Generator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe your goal, generate a roadmap with Gemini, save it to your account, and view it
          as an interactive flow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          <form onSubmit={handleGenerateAndSave} className="space-y-4 rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Create New Roadmap</h2>

            <div className="space-y-2">
              <label htmlFor="goal" className="text-sm font-medium">
                Goal
              </label>
              <textarea
                id="goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="I want to become an AI engineer who can build and deploy LLM apps..."
                className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="experienceLevel" className="text-sm font-medium">
                Experience Level
              </label>
              <select
                id="experienceLevel"
                value={experienceLevel}
                onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="targetRole" className="text-sm font-medium">
                Target Role (optional)
              </label>
              <Input
                id="targetRole"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                placeholder="AI Engineer / ML Engineer / Data Scientist"
              />
            </div>

            <Button type="submit" disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate and Save
                </>
              )}
            </Button>
          </form>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Saved Roadmaps</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Select a roadmap to render its saved step graph from the database.
            </p>

            {isLoadingRoadmaps ? (
              <p className="text-sm text-muted-foreground">Loading roadmaps...</p>
            ) : roadmaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roadmaps saved yet.</p>
            ) : (
              <div className="space-y-2">
                {roadmaps.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-2 transition ${
                      item.id === selectedRoadmapId
                        ? "border-slate-900 bg-slate-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadRoadmapDetail(item.id)}
                      className="w-full rounded-md p-2 text-left"
                    >
                      <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.summary}
                      </p>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={deletingRoadmapId === item.id}
                        onClick={() => handleDeleteRoadmap(item.id)}
                      >
                        {deletingRoadmapId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border bg-white p-3 xl:col-span-2">
          <div className="mb-3 px-2">
            <h2 className="text-lg font-semibold">{roadmapDetail?.title ?? "Roadmap Visualization"}</h2>
            <p className="text-xs text-muted-foreground">
              {roadmapDetail?.summary ?? "Generate or select a roadmap to render the flow graph."}
            </p>
          </div>

          <div className="h-[70vh] rounded-lg border bg-slate-50">
            {isLoadingDetail ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading roadmap graph...
              </div>
            ) : nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No roadmap selected yet.
              </div>
            ) : (
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  proOptions={{ hideAttribution: true }}
                >
                  <MiniMap zoomable pannable />
                  <Controls />
                  <Background />
                </ReactFlow>
              </ReactFlowProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoadmapGeneratorAgent;