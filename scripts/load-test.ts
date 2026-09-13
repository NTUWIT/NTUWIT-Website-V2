/**
 * Load-tests the judge the way an event does: many students thinking, then
 * pressing Run or Submit, in a mix of languages.
 *
 * It drives `runTests`, the same code /api/run and /api/submit call, straight
 * at PISTON_URL. So it measures the droplet, which is the part that can fall
 * over, and it needs no sign-ins and writes nothing to the database. What it
 * does not cover is Vercel, Clerk, Neon and Upstash; see docs/DEPLOY.md.
 *
 * Every solution used is known to be correct, so any verdict other than
 * "accepted" is load damage: usually a false time limit, because Piston's run
 * timeout is wall-clock and a queued job loses time it never used.
 *
 * All traffic leaves from this one machine, so Caddy's per-address limit
 * (300/min) applies to it exactly as it applies to Vercel's few egress
 * addresses in production. That makes this a fair, slightly pessimistic model.
 *
 *   yarn load:test                      70 students, 3 minutes, default mix
 *   yarn load:test --students 20        fewer students
 *   yarn load:test --minutes 5
 *   yarn load:test --think 10           seconds between actions (default 30)
 *   yarn load:test --burst              everyone submits at the same moment
 *   yarn load:test --mix java           everyone writes Java, the worst case
 *
 * Do not point this at the judge while a real event is running.
 */
import { runTests, type RunResult } from "@/lib/judge/runner";
import type { Language } from "@/lib/languages";
import { CASES } from "./check-types";

const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
};
const has = (name: string) => process.argv.includes(`--${name}`);

const STUDENTS = arg("students", 70);
const MINUTES = arg("minutes", 3);
const THINK_S = arg("think", 30);
const BURST = has("burst");

/** Share of students per language. The default guesses a student-society room. */
const MIXES: Record<string, [Language, number][]> = {
  default: [["python", 0.6], ["cpp", 0.2], ["java", 0.1], ["javascript", 0.1]],
  java: [["java", 1]],
  python: [["python", 1]],
};
const mixName = process.argv[process.argv.indexOf("--mix") + 1] ?? "default";
const MIX = MIXES[has("mix") ? mixName : "default"];
if (!MIX) throw new Error(`unknown mix "${mixName}", use one of: ${Object.keys(MIXES).join(", ")}`);

/** Vercel's function ceilings for the two routes (maxDuration in each route file). */
const CEILING_MS = { run: 30_000, submit: 60_000 };

type Action = "run" | "submit";
type Sample = { action: Action; language: Language; ms: number; outcome: string };

const samples: Sample[] = [];
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function languageFor(student: number): Language {
  // Deterministic per student, so the room keeps its mix for the whole test.
  let x = (student * 0.618034) % 1;
  for (const [language, share] of MIX!) {
    if (x < share) return language;
    x -= share;
  }
  return MIX![0]![0];
}

async function act(student: number, action: Action) {
  const language = languageFor(student);
  const c = pick(CASES);
  // Run uses the examples only; Submit uses every test, like the real routes.
  const tests = action === "run" ? c.tests.slice(0, 2) : c.tests;
  const started = performance.now();
  let outcome: string;
  try {
    const result: RunResult = await runTests({
      language,
      source: c.solutions[language],
      signature: c.signature,
      tests,
      revealActual: false,
      timeLimitMs: 5000,
      memoryLimitKb: 131072,
    });
    outcome = result.verdict === "accepted" ? "accepted" : `false ${result.verdict}`;
  } catch (error) {
    outcome = `judge error: ${error instanceof Error ? error.message : String(error)}`;
  }
  const ms = performance.now() - started;
  if (ms > CEILING_MS[action]) outcome = `over Vercel's ${CEILING_MS[action] / 1000}s ceiling`;
  samples.push({ action, language, ms, outcome });
}

async function student(id: number, until: number) {
  // Stagger arrival across the first think period so the start is not a wall.
  await sleep(Math.random() * THINK_S * 1000);
  while (Date.now() < until) {
    // Most presses are Run; roughly one in four is a Submit.
    await act(id, Math.random() < 0.25 ? "submit" : "run");
    // Think time varies from half to one and a half times the average.
    await sleep(THINK_S * 1000 * (0.5 + Math.random()));
  }
}

const pct = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]! : 0;
const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function report(elapsedMs: number) {
  console.log(`\n${samples.length} actions in ${s(elapsedMs)}, ${STUDENTS} students\n`);
  console.log("action   count   p50     p95     max     not accepted");
  for (const action of ["run", "submit"] as Action[]) {
    const rows = samples.filter((x) => x.action === action);
    if (!rows.length) continue;
    const ms = rows.map((x) => x.ms).sort((a, b) => a - b);
    const bad = rows.filter((x) => x.outcome !== "accepted").length;
    console.log(
      `${action.padEnd(8)} ${String(rows.length).padEnd(7)} ${s(pct(ms, 50)).padEnd(7)} ${s(pct(ms, 95)).padEnd(7)} ${s(ms[ms.length - 1]!).padEnd(7)} ${bad} (${((bad / rows.length) * 100).toFixed(1)}%)`,
    );
  }

  console.log("\nby language (p95)");
  for (const [language] of MIX!) {
    const ms = samples.filter((x) => x.language === language).map((x) => x.ms).sort((a, b) => a - b);
    if (ms.length) console.log(`  ${language.padEnd(11)} ${s(pct(ms, 95))} over ${ms.length} actions`);
  }

  const failures = new Map<string, number>();
  for (const x of samples) if (x.outcome !== "accepted") failures.set(x.outcome, (failures.get(x.outcome) ?? 0) + 1);
  console.log(failures.size ? "\nwhat went wrong" : "\nevery action returned the right verdict");
  for (const [outcome, n] of [...failures].sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${outcome.slice(0, 120)}`);
}

async function main() {
  const started = Date.now();
  console.log(
    BURST
      ? `burst: ${STUDENTS} students submit at the same moment`
      : `steady: ${STUDENTS} students for ${MINUTES} min, ~${THINK_S}s between actions, mix ${MIX!.map(([l, p]) => `${l} ${p * 100}%`).join(", ")}`,
  );

  // Progress every 15s so a slow run is visibly alive.
  const ticker = setInterval(() => {
    const bad = samples.filter((x) => x.outcome !== "accepted").length;
    console.log(`  ${s(Date.now() - started)}: ${samples.length} actions, ${bad} not accepted`);
  }, 15_000);

  if (BURST) {
    await Promise.all(Array.from({ length: STUDENTS }, (_, i) => act(i, "submit")));
  } else {
    const until = started + MINUTES * 60_000;
    await Promise.all(Array.from({ length: STUDENTS }, (_, i) => student(i, until)));
  }

  clearInterval(ticker);
  report(Date.now() - started);
  process.exit(0);
}

void main();
