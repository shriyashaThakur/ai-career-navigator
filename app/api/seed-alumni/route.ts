import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { alumniTable } from "@/configs/schema";

const mockAlumni = [
  {
    name: "Aarav Patil",
    graduationYear: 2020,
    currentRole: "Full Stack Developer",
    company: "Jio Platforms",
    domain: "Software Engineering",
    linkedInUrl: "https://www.linkedin.com/in/aarav-patil-terna",
  },
  {
    name: "Riya Kulkarni",
    graduationYear: 2019,
    currentRole: "Data Analyst",
    company: "TCS",
    domain: "Data Science",
    linkedInUrl: "https://www.linkedin.com/in/riya-kulkarni-terna",
  },
  {
    name: "Kunal Deshmukh",
    graduationYear: 2018,
    currentRole: "Software Development Engineer",
    company: "Google",
    domain: "Software Engineering",
    linkedInUrl: "https://www.linkedin.com/in/kunal-deshmukh-terna",
  },
  {
    name: "Sneha Joshi",
    graduationYear: 2021,
    currentRole: "Cybersecurity Associate",
    company: "Accenture",
    domain: "Cybersecurity",
    linkedInUrl: "https://www.linkedin.com/in/sneha-joshi-terna",
  },
  {
    name: "Pranav More",
    graduationYear: 2017,
    currentRole: "Cloud Engineer",
    company: "Infosys",
    domain: "Cloud Computing",
    linkedInUrl: "https://www.linkedin.com/in/pranav-more-terna",
  },
  {
    name: "Neha Sawant",
    graduationYear: 2022,
    currentRole: "Product Analyst",
    company: "Deloitte",
    domain: "Product Management",
    linkedInUrl: "https://www.linkedin.com/in/neha-sawant-terna",
  },
  {
    name: "Aditya Gokhale",
    graduationYear: 2016,
    currentRole: "ML Engineer",
    company: "Fractal Analytics",
    domain: "Machine Learning",
    linkedInUrl: "https://www.linkedin.com/in/aditya-gokhale-terna",
  },
  {
    name: "Mrunal Shah",
    graduationYear: 2020,
    currentRole: "Backend Engineer",
    company: "Amazon",
    domain: "Software Engineering",
    linkedInUrl: "https://www.linkedin.com/in/mrunal-shah-terna",
  },
];

export async function GET() {
  try {
    const existing = await db.select().from(alumniTable);
    const existingUrls = new Set(existing.map((item) => item.linkedInUrl));
    const recordsToInsert = mockAlumni.filter((item) => !existingUrls.has(item.linkedInUrl));

    if (recordsToInsert.length > 0) {
      await db.insert(alumniTable).values(recordsToInsert);
    }

    return NextResponse.json({
      success: true,
      inserted: recordsToInsert.length,
      total: existing.length + recordsToInsert.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

