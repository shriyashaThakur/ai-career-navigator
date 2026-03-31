"use client";

import { Briefcase, Building2, GraduationCap, Linkedin, Search, Users } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type Alumni = {
  id: number;
  name: string;
  graduationYear: number;
  currentRole: string;
  company: string;
  domain: string;
  linkedInUrl: string;
  createdAt: string;
};

function AlumniPage() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlumni = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/alumni");
        if (!response.ok) {
          const json = (await response.json()) as { error?: string };
          throw new Error(json.error ?? "Failed to load alumni directory");
        }
        const payload = (await response.json()) as { alumni: Alumni[] };
        setAlumni(payload.alumni);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load alumni directory";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAlumni();
  }, []);

  const filteredAlumni = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alumni;

    return alumni.filter((item) => {
      const name = item.name.toLowerCase();
      const company = item.company.toLowerCase();
      const role = item.currentRole.toLowerCase();
      const domain = item.domain.toLowerCase();
      const graduationYear = String(item.graduationYear);
      return (
        name.includes(query) ||
        company.includes(query) ||
        role.includes(query) ||
        domain.includes(query) ||
        graduationYear.includes(query)
      );
    });
  }, [alumni, search]);

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER: Matching the Dashboard & Chatbot Style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#1d4084] via-[#355ca9] to-[#f48322] p-8 shadow-lg">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Alumni Directory</h1>
            <p className="mt-2 font-medium text-white/80">
              Connect with mentors and peers across the global industry.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* SEARCH BAR: Better visual depth */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="relative group">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#355ca9] transition-colors" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12 border-none bg-transparent pl-12 shadow-none focus-visible:ring-0 text-base"
            placeholder="Search by role, company, domain, or year..."
          />
        </div>
      </div>

      {/* CONTENT AREA */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#355ca9] border-t-transparent mb-4" />
          <p className="text-sm font-medium">Syncing Alumni Directory...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      ) : filteredAlumni.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Search className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">No alumni found</h3>
          <p className="text-sm text-slate-500">Try adjusting your search or domain filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredAlumni.map((item) => (
            <div 
              key={item.id} 
              className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[#355ca9]/5"
            >
              <div className="mb-4 flex items-start justify-between">
                <h2 className="text-xl font-bold text-slate-900 group-hover:text-[#355ca9] transition-colors">
                    {item.name}
                </h2>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#355ca9]">
                    {item.domain}
                </span>
              </div>

              <div className="space-y-3 text-sm font-medium text-slate-600">
                <p className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-slate-400 group-hover:text-[#355ca9] transition-colors" />
                  {item.currentRole}
                </p>
                <p className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-slate-400 group-hover:text-[#355ca9] transition-colors" />
                  {item.company}
                </p>
                <p className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-slate-400 group-hover:text-[#355ca9] transition-colors" />
                  Class of {item.graduationYear}
                </p>
              </div>

              <div className="mt-auto pt-6">
                <a
                  href={item.linkedInUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#355ca9] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#355ca9]/20 transition-all hover:bg-[#1d4084] hover:shadow-lg active:scale-[0.98]"
                >
                  <Linkedin className="h-4 w-4" />
                  Connect on LinkedIn
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlumniPage;