import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { Language } from "@/lib/languages";
import type { Signature } from "@/lib/problems/signature";

// A named group of problems, e.g. "Coding Night 1" or "Recursion warm-up".
// Exactly one set (or one unassigned problem) is active at a time; that is what
// participants can open.
export const problemSets = pgTable("problem_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // Null means the problem stands on its own and can be activated by itself.
    setId: uuid("set_id").references(() => problemSets.id, { onDelete: "set null" }),
    difficulty: text("difficulty").notNull(),
    statementMd: text("statement_md").notNull(),
    // 5000ms, not 3000: Java spends roughly 2.7s of the budget starting the JVM
    // before a participant's code runs. Must stay under REQUEST_TIMEOUT_MS.
    timeLimitMs: integer("time_limit_ms").notNull().default(5000),
    memoryLimitKb: integer("memory_limit_kb").notNull().default(131072),
    // Starter code keyed by language; a missing language falls back to an empty editor.
    signature: jsonb("signature").$type<Signature>().notNull(),
    starterCode: jsonb("starter_code")
      .$type<Partial<Record<Language, string>>>()
      .notNull()
      .default({}),
    points: integer("points").notNull().default(100),
    visibleFrom: timestamp("visible_from", { withTimezone: true }),
    order: integer("order").notNull().default(0),
  },
  (t) => [uniqueIndex("problems_slug_idx").on(t.slug)],
);

export const testCases = pgTable(
  "test_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    stdin: text("stdin").notNull(),
    expectedStdout: text("expected_stdout").notNull(),
    isSample: boolean("is_sample").notNull().default(false),
    order: integer("order").notNull().default(0),
  },
  (t) => [index("test_cases_problem_idx").on(t.problemId)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    language: text("language").$type<Language>().notNull(),
    source: text("source").notNull(),
    status: text("status").notNull(),
    runtimeMs: integer("runtime_ms").notNull().default(0),
    passedCount: integer("passed_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    score: integer("score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("submissions_user_problem_idx").on(t.userId, t.problemId)],
);

// Denormalised best-score-per-problem. The leaderboard aggregates this table
// rather than recomputing over `submissions`.
export const scores = pgTable(
  "scores",
  {
    userId: text("user_id").notNull(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    bestScore: integer("best_score").notNull(),
    firstSolvedAt: timestamp("first_solved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.problemId] }),
    index("scores_problem_idx").on(t.problemId),
  ],
);

// Single-row table holding the live event clock, so an organiser can start or
// stop the countdown during a Coding Night without a redeploy. Always id 1.
// ponytail: one row, one column. Add a real settings table when a second
// setting exists.
export const eventSettings = pgTable("event_settings", {
  id: integer("id").primaryKey(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  // What participants can open right now. At most one of these is ever set;
  // both null means nothing is live. The pair is the single source of truth for
  // visibility, checked again in every judge route.
  activeSetId: uuid("active_set_id").references(() => problemSets.id, { onDelete: "set null" }),
  activeProblemId: uuid("active_problem_id").references(() => problems.id, { onDelete: "set null" }),
});

export type ProblemSet = typeof problemSets.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;
