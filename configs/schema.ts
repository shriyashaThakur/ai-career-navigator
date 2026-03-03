import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

export const roadmapCategoriesTable = pgTable(
  "roadmap_categories",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull(),
    categoryIndex: integer("category_index").default(0).notNull(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("roadmap_categories_slug_idx").on(table.slug),
  })
);

export const roadmapsTable = pgTable(
  "roadmaps",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    categoryId: integer("category_id").references(() => roadmapCategoriesTable.id, {
      onDelete: "set null",
    }),
    title: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 100 }).notNull(),
    prompt: text().notNull(),
    verified: boolean().default(false).notNull(),
    generateTimeMs: integer("generate_time_ms"),
    // Keep full generated payload for debug/replay/versioning.
    data: jsonb().$type<Record<string, unknown> | null>().default(null),
  },
  (table) => ({
    codeUniqueIdx: uniqueIndex("roadmaps_code_idx").on(table.code),
  })
);

export const roadmapStepsTable = pgTable("roadmap_steps", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  roadmapId: integer("roadmap_id")
    .notNull()
    .references(() => roadmapsTable.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  duration: varchar({ length: 120 }),
  resourceLinks: jsonb("resource_links")
    .$type<Array<{ title: string; url: string }>>()
    .default([]),
  prerequisites: jsonb().$type<string[]>().default([]),
  positionX: integer("position_x").default(0).notNull(),
  positionY: integer("position_y").default(0).notNull(),
});

export const roadmapLikesTable = pgTable(
  "roadmap_likes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    roadmapId: integer("roadmap_id")
      .notNull()
      .references(() => roadmapsTable.id, { onDelete: "cascade" }),
    clientIp: varchar("client_ip", { length: 120 }).notNull(),
  },
  (table) => ({
    roadmapClientIpUniqueIdx: uniqueIndex("roadmap_likes_roadmap_client_ip_idx").on(
      table.roadmapId,
      table.clientIp
    ),
  })
);

export const resumesTable = pgTable("resumes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  rawText: text("raw_text").notNull(),
  targetRole: varchar("target_role", { length: 255 }),
  extractedSkills: jsonb("extracted_skills").$type<string[]>().default([]).notNull(),
  education: jsonb("education")
    .$type<Array<{ degree?: string; institution?: string; year?: string }>>()
    .default([])
    .notNull(),
  experience: jsonb("experience")
    .$type<Array<{ title?: string; company?: string; duration?: string; highlights?: string[] }>>()
    .default([])
    .notNull(),
  atsScore: integer("ats_score").default(0).notNull(),
  scoreBreakdown: jsonb("score_breakdown")
    .$type<Record<string, number> | null>()
    .default(null),
  analysis: jsonb("analysis").$type<Record<string, unknown> | null>().default(null),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const alumniTable = pgTable("alumni", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  graduationYear: integer("graduation_year").notNull(),
  currentRole: varchar("current_role", { length: 255 }).notNull(),
  company: varchar({ length: 255 }).notNull(),
  domain: varchar({ length: 255 }).notNull(),
  linkedInUrl: varchar("linkedin_url", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});