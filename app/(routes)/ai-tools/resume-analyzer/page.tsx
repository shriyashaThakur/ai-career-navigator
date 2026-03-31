"use client";

import { FileText, Loader2, Search, Sparkles, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResumeListItem = {
  id: number;
  fileName: string;
  targetRole: string | null;
  atsScore: number;
  extractedSkillsCount: number;
  createdAt: string;
};

type ResumeDetail = {
  id: number;
  fileName: string;
  targetRole: string | null;
  rawText: string;
  extractedSkills: string[];
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  experience: Array<{ role?: string; company?: string; duration?: string }>;
  atsScore: number;
  scoreBreakdown: Record<string, number>;
  analysis: Record<string, unknown>;
  createdAt: string;
};

type ResumeAnalyzeResponse = {
  resume: ResumeDetail;
};

type ApiError = {
  error?: string;
};

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const getScoreTone = (score: number) => {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
};

const getArrayFromAnalysis = (analysis: Record<string, unknown>, key: string) => {
  const value = analysis[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
};

function ResumeAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [selectedResume, setSelectedResume] = useState<ResumeDetail | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<number | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyRoleFilter, setHistoryRoleFilter] = useState("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadResumeDetail = useCallback(async (resumeId: number) => {
    setIsLoadingDetail(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/resume/${resumeId}`, { method: "GET" });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to load resume details"));
      }

      const payload = (await response.json()) as { resume: ResumeDetail };
      setSelectedResume(payload.resume);
      setSelectedResumeId(payload.resume.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load resume details";
      setErrorMessage(message);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const loadResumeList = useCallback(async () => {
    setIsLoadingResumes(true);

    try {
      const response = await fetch("/api/resume", { method: "GET" });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to load saved resumes"));
      }

      const payload = (await response.json()) as { resumes: ResumeListItem[] };
      setResumes(payload.resumes);

      if (payload.resumes.length > 0 && !selectedResumeId) {
        await loadResumeDetail(payload.resumes[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load saved resumes";
      setErrorMessage(message);
    } finally {
      setIsLoadingResumes(false);
    }
  }, [loadResumeDetail, selectedResumeId]);

  useEffect(() => {
    loadResumeList();
  }, [loadResumeList]);

  const handleAnalyzeResume = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!file) {
      setErrorMessage("Please upload a PDF resume.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (targetRole.trim()) {
        formData.append("targetRole", targetRole.trim());
      }
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription.trim());
      }

      const response = await fetch("/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Resume analysis failed"));
      }

      const payload = (await response.json()) as ResumeAnalyzeResponse;
      setSelectedResume(payload.resume);
      setSelectedResumeId(payload.resume.id);
      setFile(null);
      await loadResumeList();
      setSuccessMessage("Resume analyzed and saved successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume analysis failed";
      setErrorMessage(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteResume = async (resumeId: number) => {
    const confirmed = window.confirm("Delete this analyzed resume permanently?");
    if (!confirmed) {
      return;
    }

    setDeletingResumeId(resumeId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/resume/${resumeId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Failed to delete resume"));
      }

      const listResponse = await fetch("/api/resume", { method: "GET" });
      if (!listResponse.ok) {
        throw new Error(await getErrorMessage(listResponse, "Failed to refresh resume list"));
      }

      const payload = (await listResponse.json()) as { resumes: ResumeListItem[] };
      setResumes(payload.resumes);

      if (selectedResumeId === resumeId) {
        const nextResume = payload.resumes[0];
        if (nextResume) {
          await loadResumeDetail(nextResume.id);
        } else {
          setSelectedResumeId(null);
          setSelectedResume(null);
        }
      }

      setSuccessMessage("Resume deleted successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete resume";
      setErrorMessage(message);
    } finally {
      setDeletingResumeId(null);
    }
  };

  const roleFilterOptions = useMemo(() => {
    const roleSet = new Set<string>();
    for (const resume of resumes) {
      const role = resume.targetRole?.trim();
      if (role) {
        roleSet.add(role);
      }
    }
    return ["all", ...Array.from(roleSet).sort((a, b) => a.localeCompare(b))];
  }, [resumes]);

  const filteredResumes = useMemo(() => {
    const search = historySearch.trim().toLowerCase();
    return resumes.filter((resume) => {
      const matchesRole =
        historyRoleFilter === "all" || (resume.targetRole ?? "").trim() === historyRoleFilter;
      if (!matchesRole) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = `${resume.fileName} ${resume.targetRole ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [historyRoleFilter, historySearch, resumes]);

  const scoreBreakdownCards = useMemo(() => {
    if (!selectedResume) {
      return [];
    }

    return [
      { label: "Keyword & Skill Match", key: "keyword_score" },
      { label: "Formatting", key: "formatting_score" },
      { label: "Section Completeness", key: "section_score" },
      { label: "Experience Relevance", key: "relevance_score" },
    ].map((item) => ({
      ...item,
      value: Math.max(0, Math.min(100, Math.round(selectedResume.scoreBreakdown[item.key] ?? 0))),
    }));
  }, [selectedResume]);

  const score = selectedResume?.atsScore ?? 0;
  const scoreColorClass = getScoreTone(score);
  const circleFill = `conic-gradient(#0f172a ${score}%, #e2e8f0 ${score}% 100%)`;

  const criticalMissingSkills = selectedResume
    ? getArrayFromAnalysis(selectedResume.analysis, "critical_missing_skills")
    : [];
  const formattingWarnings = selectedResume
    ? getArrayFromAnalysis(selectedResume.analysis, "formatting_warnings")
    : [];
  const predictedRoles = selectedResume
    ? getArrayFromAnalysis(selectedResume.analysis, "predicted_roles")
    : [];
  const suggestedImprovements =
    selectedResume && typeof selectedResume.analysis.suggested_improvements === "string"
      ? selectedResume.analysis.suggested_improvements
      : "";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#1d4084] via-[#355ca9] to-[#f48322] p-8 shadow-lg">
        {/* Subtle glow effect for that premium dashboard feel */}
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
  
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            AI Resume Analyzer
          </h1>
          <p className="mt-2 text-sm font-medium text-white/80 max-w-2xl leading-relaxed">
            Upload your resume PDF, get an ATS score and actionable suggestions, and track your
            analysis history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          <form onSubmit={handleAnalyzeResume} className="space-y-4 rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Analyze New Resume</h2>

            <div className="space-y-2">
              <label htmlFor="resumeFile" className="text-sm font-medium">
                Resume PDF
              </label>
              <Input
                id="resumeFile"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setFile(selected);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Supports PDF files up to 8MB.
                {file ? ` Selected: ${file.name}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="targetRole" className="text-sm font-medium">
                Target Role (optional)
              </label>
              <Input
                id="targetRole"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                placeholder="e.g., Backend Developer, ML Engineer"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="jobDescription" className="text-sm font-medium">
                Paste Job Description (Optional)
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the full job description here for more accurate JD-aligned ATS scoring..."
                className="min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isAnalyzing} 
              className="w-full h-10 rounded-xl bg-[#355ca9] hover:bg-[#1d4084] text-white font-bold shadow-md shadow-blue-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing PDF...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm">Analyze Resume</span>
                </>
              )}
            </Button>
          </form>

          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Past Analyses</h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Select any saved resume analysis.
            </p>

            <div className="mb-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder="Search by filename or role"
                  className="pl-9"
                />
              </div>
              <select
                value={historyRoleFilter}
                onChange={(event) => setHistoryRoleFilter(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {roleFilterOptions.map((role) => (
                  <option key={role} value={role}>
                    {role === "all" ? "All Target Roles" : role}
                  </option>
                ))}
              </select>
            </div>

            {isLoadingResumes ? (
              <p className="text-sm text-muted-foreground">Loading saved resumes...</p>
            ) : resumes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved resume analyses yet.</p>
            ) : filteredResumes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resumes match your filter.</p>
            ) : (
              <div className="space-y-2">
                {filteredResumes.map((resume) => (
                  <div
                    key={resume.id}
                    className={`rounded-lg border p-2 transition ${
                      selectedResumeId === resume.id
                        ? "border-slate-900 bg-slate-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadResumeDetail(resume.id)}
                      className="w-full rounded-md p-2 text-left"
                    >
                      <p className="line-clamp-1 text-sm font-semibold">{resume.fileName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ATS: {resume.atsScore} • {formatDate(resume.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Role: {resume.targetRole || "Not specified"}
                      </p>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={deletingResumeId === resume.id}
                        onClick={() => handleDeleteResume(resume.id)}
                      >
                        {deletingResumeId === resume.id ? (
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

        <div className="space-y-6 xl:col-span-2">
          {isLoadingDetail ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border bg-white">
              <p className="text-sm text-muted-foreground">Loading analysis details...</p>
            </div>
          ) : !selectedResume ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border bg-white">
              <p className="text-sm text-muted-foreground">
                Upload a resume or select one from history to view results.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-white p-5">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-xl font-bold">{selectedResume.fileName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Target Role: {selectedResume.targetRole || "Not specified"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analyzed on {formatDate(selectedResume.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <div
                      className="grid h-28 w-28 place-items-center rounded-full"
                      style={{ background: circleFill }}
                    >
                      <div className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-inner">
                        <span className={`text-2xl font-bold ${scoreColorClass}`}>{score}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Final ATS Score</p>
                      <p className={`text-3xl font-bold ${scoreColorClass}`}>{score}/100</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {scoreBreakdownCards.map((item) => (
                  <div key={item.key} className="rounded-xl border bg-white p-4">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border bg-white p-5">
                <h3 className="text-lg font-semibold">Extracted Skills</h3>
                {selectedResume.extractedSkills.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No skills extracted.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedResume.extractedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-lg font-semibold">Critical Missing Skills</h3>
                  {criticalMissingSkills.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No critical gaps found.</p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {criticalMissingSkills.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-lg font-semibold">Formatting Warnings</h3>
                  {formattingWarnings.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No major formatting warnings detected.
                    </p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {formattingWarnings.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5">
                <h3 className="text-lg font-semibold">AI Suggested Improvements</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {suggestedImprovements || "No improvements provided yet."}
                </p>
              </div>

              <div className="rounded-xl border bg-white p-5">
                <h3 className="text-lg font-semibold">Predicted Roles</h3>
                {predictedRoles.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No predicted roles returned.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {predictedRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-lg font-semibold">Education</h3>
                  {selectedResume.education.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">No education entries found.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {selectedResume.education.map((entry, index) => (
                        <div key={`${entry.institution}-${index}`} className="rounded-md border p-3">
                          <p className="font-medium">{entry.degree || "Degree not provided"}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.institution || "Institution not provided"}
                          </p>
                          <p className="text-xs text-muted-foreground">{entry.year || "Year N/A"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-white p-5">
                  <h3 className="text-lg font-semibold">Experience</h3>
                  {selectedResume.experience.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No experience entries found.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {selectedResume.experience.map((entry, index) => (
                        <div key={`${entry.company}-${index}`} className="rounded-md border p-3">
                          <p className="font-medium">{entry.role || "Role not provided"}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.company || "Company not provided"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.duration || "Duration N/A"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5">
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                  <FileText className="h-4 w-4" />
                  Extracted Resume Text (Preview)
                </h3>
                <p className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-xs text-slate-700">
                  {selectedResume.rawText}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResumeAnalyzerPage;

