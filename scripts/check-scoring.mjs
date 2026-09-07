// Runnable check for the scoring semantics from the submissions-scoring spec.
// ponytail: models the ON CONFLICT clause rather than executing it, so it pins
// the intended semantics without a live database. Replace with a query against
// a throwaway Postgres if the upsert clause is ever edited.
import assert from "node:assert/strict";

// Mirrors: INSERT ... ON CONFLICT (user_id, problem_id)
//          DO UPDATE SET best_score = excluded.best_score
//          WHERE excluded.best_score > scores.best_score
function upsert(table, { userId, problemId, score, at }) {
  const key = `${userId}:${problemId}`;
  const existing = table.get(key);
  if (!existing) {
    table.set(key, { bestScore: score, firstSolvedAt: at });
    return;
  }
  if (score > existing.bestScore) existing.bestScore = score;
  // firstSolvedAt is only ever set on insert, never in the DO UPDATE branch.
}

const totalFor = (table, userId) =>
  [...table.entries()]
    .filter(([k]) => k.startsWith(`${userId}:`))
    .reduce((sum, [, v]) => sum + v.bestScore, 0);

// Re-submitting an already-solved problem does not inflate the total.
{
  const t = new Map();
  upsert(t, { userId: "u1", problemId: "p1", score: 100, at: 1000 });
  const afterFirst = totalFor(t, "u1");
  upsert(t, { userId: "u1", problemId: "p1", score: 100, at: 2000 });
  upsert(t, { userId: "u1", problemId: "p1", score: 100, at: 3000 });
  assert.equal(afterFirst, 100);
  assert.equal(totalFor(t, "u1"), 100, "re-submits must not inflate the total");
  assert.equal(t.get("u1:p1").firstSolvedAt, 1000, "first_solved_at must not move");
}

// Concurrent duplicates settle to the same value as a single submission.
{
  const a = new Map();
  upsert(a, { userId: "u1", problemId: "p1", score: 100, at: 1000 });
  const b = new Map();
  upsert(b, { userId: "u1", problemId: "p1", score: 100, at: 1000 });
  upsert(b, { userId: "u1", problemId: "p1", score: 100, at: 1000 });
  assert.deepEqual(b.get("u1:p1"), a.get("u1:p1"), "duplicates are idempotent");
}

// A better score raises the stored value; a worse one never lowers it.
{
  const t = new Map();
  upsert(t, { userId: "u1", problemId: "p1", score: 50, at: 1000 });
  upsert(t, { userId: "u1", problemId: "p1", score: 80, at: 2000 });
  assert.equal(t.get("u1:p1").bestScore, 80, "a better score must raise the total");
  upsert(t, { userId: "u1", problemId: "p1", score: 10, at: 3000 });
  assert.equal(t.get("u1:p1").bestScore, 80, "a worse score must not lower the total");
  assert.equal(t.get("u1:p1").firstSolvedAt, 1000, "first_solved_at still unmoved");
}

// Distinct problems accumulate.
{
  const t = new Map();
  upsert(t, { userId: "u1", problemId: "p1", score: 100, at: 1000 });
  upsert(t, { userId: "u1", problemId: "p2", score: 70, at: 1500 });
  assert.equal(totalFor(t, "u1"), 170, "separate problems must both count");
}

console.log("check-scoring: all assertions passed");
