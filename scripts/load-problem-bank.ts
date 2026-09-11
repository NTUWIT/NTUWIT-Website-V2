/**
 * Loads docs/PROBLEM-BANK.md into the database as one problem set, through the
 * same server actions the admin console calls: `addSet`, then `saveProblem`
 * with the exact payload ProblemWizard submits, then `moveProblem`. Only
 * Clerk's session lookup and Next's cache are stubbed (scripts/stubs), so the
 * validation, the problem validator, the duplicate handling and the writes are
 * all the real code.
 *
 * Safe to rerun: the set is reused and problems that already exist are skipped.
 * Nothing is activated; participants see nothing until an admin opens the set.
 *
 * Run: yarn load:bank
 */
import assert from "node:assert/strict";

import { addSet, moveProblem, saveProblem } from "@/app/(admin)/admin/actions";
import { getAllTests, getProblemBySlug, listSets } from "@/lib/db/queries";
import { built } from "./problem-bank";
import { stubSession } from "./stubs/clerk-server";

const SET_NAME = "Pattern Test Bank";
const SLUG_PREFIX = "test-";

// The wizard's payload for a new problem, field for field.
const payloadFor = (b: (typeof built)[number], order: number) => ({
  setId: null,
  title: b.title,
  slug: `${SLUG_PREFIX}${b.slug}`,
  difficulty: b.difficulty,
  points: { easy: 100, medium: 200, hard: 300 }[b.difficulty],
  timeLimitMs: 5000,
  memoryLimitKb: 131072,
  order,
  statementMd: b.brief,
  signature: b.signature,
  tests: b.tests.map((t) => ({ stdin: t.stdin, expectedStdout: t.expectedStdout, isSample: t.isSample })),
});

async function main() {
  // 1. The guard: a signed-in non-admin must be refused, and nothing written.
  stubSession.role = "member";
  const refused = await saveProblem(payloadFor(built[0]!, 0));
  assert.equal(refused.ok, false, "a non-admin must not be able to save a problem");
  assert.equal(await getProblemBySlug(`${SLUG_PREFIX}${built[0]!.slug}`), null, "a refused save must write nothing");
  console.log("guard: non-admin refused, nothing written");
  stubSession.role = "admin";

  // 2. The set.
  let set = (await listSets()).find((s) => s.name === SET_NAME);
  if (!set) {
    const created = await addSet(SET_NAME, `All ${built.length} problems from docs/PROBLEM-BANK.md, for testing the judge.`, 99);
    assert.ok(created.ok, JSON.stringify(created));
    set = (await listSets()).find((s) => s.name === SET_NAME);
  }
  assert.ok(set, "the set exists after addSet");
  console.log(`set: "${SET_NAME}"`);

  // 3. Every problem: save through the wizard's action, then move into the set.
  let created = 0, skipped = 0;
  const failures: string[] = [];
  for (const [i, b] of built.entries()) {
    const payload = payloadFor(b, i);
    if (await getProblemBySlug(payload.slug)) {
      skipped++;
    } else {
      const result = await saveProblem(payload);
      if (!result.ok) {
        failures.push(`${b.title}: ${result.errors.join("; ")}`);
        continue;
      }
      created++;
    }
    const row = await getProblemBySlug(payload.slug);
    assert.ok(row, `${payload.slug} is readable after saving`);
    const moved = await moveProblem(row.id, set.id);
    assert.ok(moved.ok, JSON.stringify(moved));
  }
  console.log(`problems: ${created} created, ${skipped} already there, ${failures.length} failed`);
  for (const f of failures) console.log(`  FAIL ${f}`);

  // The wizard's edit path: resaving with an id replaces the problem and its
  // tests. Resaving the bank's own payload must leave it exactly as it was.
  const first = await getProblemBySlug(`${SLUG_PREFIX}${built[0]!.slug}`);
  assert.ok(first, "first problem exists for the edit check");
  const edited = await saveProblem({ ...payloadFor(built[0]!, 0), id: first.id, setId: set.id });
  assert.ok(edited.ok, `edit through the wizard's action failed: ${JSON.stringify(edited)}`);
  console.log("edit: resaved one problem through the wizard's edit path");

  // 4. Read everything back and compare with what was sent.
  let mismatches = 0;
  for (const b of built) {
    const row = await getProblemBySlug(`${SLUG_PREFIX}${b.slug}`);
    if (!row) continue;
    const stored = await getAllTests(row.id);
    const same =
      row.setId === set.id &&
      JSON.stringify(row.signature) === JSON.stringify(b.signature) &&
      stored.length === b.tests.length &&
      b.tests.every((t) => stored.some((s) => s.stdin === t.stdin && s.expectedStdout === t.expectedStdout && s.isSample === t.isSample));
    if (!same) {
      mismatches++;
      console.log(`  MISMATCH ${b.title}`);
    }
  }
  const final = (await listSets()).find((s) => s.id === set.id)!;
  console.log(`read back: ${final.problems} problems in the set, ${mismatches} differ from the bank`);

  assert.equal(failures.length, 0, "every problem saved");
  assert.equal(mismatches, 0, "every stored problem matches the bank");
  assert.equal(final.problems, built.length, "the set holds the whole bank");
  console.log("load-problem-bank: done. The set is not active; open it from /admin to test.");
  process.exit(0);
}

void main();
