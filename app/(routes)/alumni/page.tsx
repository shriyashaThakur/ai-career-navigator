"use client";

import { Briefcase, Building2, GraduationCap, Linkedin, Search } from "lucide-react";
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
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <h1 className="text-2xl font-bold">Alumni Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect with Terna Engineering College alumni across domains and roles.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Search by role or domain (e.g., Data Science, Backend Engineer)"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">
          Loading alumni directory...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : filteredAlumni.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">
          No alumni matched your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredAlumni.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-500" />
                  {item.currentRole}
                </p>
                <p className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  {item.company}
                </p>
                <p className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                  Class of {item.graduationYear}
                </p>
                <p className="inline-flex rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium">
                  {item.domain}
                </p>
              </div>

              <a
                href={item.linkedInUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Linkedin className="h-4 w-4" />
                Connect on LinkedIn
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlumniPage;

