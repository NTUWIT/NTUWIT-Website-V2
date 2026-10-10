/**
 * The results page is the record of a Coding Night, so every number on it
 * comes from summarise() and is asserted here: best tests passed per problem,
 * time taken, and the counts and timeline of submissions and runs.
 *
 * Run: yarn test
 */
import assert from "node:assert/strict";

import { rankParticipants, summarise, type Attempt } from "@/lib/results";
import { isReorderOf, moveItem } from "@/lib/order";
import { formatMinutes, minutesUntil } from "@/lib/duration";

const START = new Date("2026-10-10T19:00:00Z");
const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);
// Scored like the judge: 100 points, partial credit by fraction passed.
const sub = (userId: string, problemId: string, minutes: number, passed: number, total: number, points = 100): Attempt => ({
  id: `${userId}-${problemId}-s${minutes}`,
  kind: "submit",
  userId,
  problemId,
  language: "python",
  status: passed === total ? "accepted" : "wrong_answer",
  passedCount: passed,
  totalCount: total,
  score: passed === total ? points : Math.round((points * passed) / total),
  createdAt: at(minutes),
});
const run = (userId: string, problemId: string, minutes: number, passed = 1, total = 2): Attempt => ({
  ...sub(userId, problemId, minutes, passed, total),
  id: `${userId}-${problemId}-r${minutes}`,
  kind: "run",
  score: 0,
});

/* ---------- empty ---------- */

assert.deepEqual(summarise([], START), [], "no activity, no rows");

/* ---------- one participant, two problems ---------- */

{
  const [ada] = summarise(
    [
      run("ada", "p1", 2),
      sub("ada", "p1", 5, 3, 10),
      run("ada", "p1", 6),
      sub("ada", "p1", 12, 10, 10), // solved p1 at 12
      sub("ada", "p1", 15, 4, 10), // a worse retry must not lower the best
      sub("ada", "p2", 20, 2, 5),
      sub("ada", "p2", 31, 4, 5), // best on p2 reached at 31
      sub("ada", "p2", 40, 4, 5), // equal later score must not move the time
    ],
    START,
  );
  assert.ok(ada);
  assert.equal(ada.userId, "ada");
  assert.deepEqual(ada.problems.p1, { bestScore: 100, bestPassed: 10, total: 10, solved: true, bestAt: at(12), submissions: 3, runs: 2 });
  assert.deepEqual(ada.problems.p2, { bestScore: 80, bestPassed: 4, total: 5, solved: false, bestAt: at(31), submissions: 3, runs: 0 });
  assert.equal(ada.score, 180, "sum of best score per problem");
  assert.equal(ada.testsPassed, 14, "sum of best passed per problem");
  assert.equal(ada.testsTotal, 15);
  assert.equal(ada.solved, 1);
  assert.equal(ada.submissions, 6);
  assert.equal(ada.runs, 2);
  assert.equal(ada.timeTakenMs, 31 * 60_000, "start to the moment the final result was reached");
  assert.deepEqual(ada.firstAt, at(2));
  assert.deepEqual(ada.lastAt, at(40));
  // Timeline: every attempt, oldest first, both kinds.
  assert.equal(ada.timeline.length, 8);
  assert.deepEqual(ada.timeline.map((a) => a.kind), ["run", "submit", "run", "submit", "submit", "submit", "submit", "submit"]);
  for (let i = 1; i < ada.timeline.length; i++) {
    assert.ok(ada.timeline[i - 1]!.createdAt.getTime() <= ada.timeline[i]!.createdAt.getTime(), "timeline sorted");
  }
}

/* ---------- runs only: present, but nothing scored ---------- */

{
  const [bo] = summarise([run("bo", "p1", 3), run("bo", "p1", 4)], START);
  assert.ok(bo, "someone who only ran code still appears");
  assert.equal(bo.submissions, 0);
  assert.equal(bo.runs, 2);
  assert.equal(bo.testsPassed, 0);
  assert.equal(bo.testsTotal, 0);
  assert.equal(bo.timeTakenMs, null, "no submission, no time taken");
  assert.deepEqual(bo.problems.p1, { bestScore: 0, bestPassed: 0, total: 0, solved: false, bestAt: null, submissions: 0, runs: 2 });
  assert.equal(bo.score, 0);
}

/* ---------- zero-pass submissions count, and time comes from the first ---------- */

{
  const [cy] = summarise([sub("cy", "p1", 7, 0, 4), sub("cy", "p1", 9, 0, 4)], START);
  assert.ok(cy);
  assert.equal(cy.submissions, 2);
  assert.equal(cy.problems.p1!.bestPassed, 0);
  assert.equal(cy.problems.p1!.total, 4, "total known even with nothing passed");
  assert.deepEqual(cy.problems.p1!.bestAt, at(7), "earliest attempt at the best score");
  assert.equal(cy.timeTakenMs, 7 * 60_000);
}

/* ---------- many participants, input order does not matter ---------- */

{
  const attempts = [sub("b", "p1", 10, 1, 1), sub("a", "p1", 5, 1, 1), run("c", "p1", 1)];
  const rows = summarise(attempts, START);
  const reversed = summarise([...attempts].reverse(), START);
  assert.deepEqual(rows, reversed, "same result regardless of input order");
  assert.deepEqual(rows.map((r) => r.userId).sort(), ["a", "b", "c"]);
}

/* ---------- activity before the start never yields negative time ---------- */

{
  const [early] = summarise([sub("e", "p1", -5, 1, 1)], START);
  assert.equal(early!.timeTakenMs, 0, "clamped to zero");
}

/* ---------- dates arrive as strings from the cache or JSON ---------- */

{
  const [s] = summarise([{ ...sub("s", "p1", 3, 1, 1), createdAt: at(3).toISOString() as unknown as Date }], START);
  assert.equal(s!.timeTakenMs, 3 * 60_000);
}

/* ---------- best is by score, so a problem's points decide ---------- */

{
  // Rounding can give two pass counts the same score; the higher pass count
  // still wins, and a strictly better score always does.
  const [r] = summarise([sub("r", "p1", 5, 1, 3, 1), sub("r", "p1", 9, 2, 3, 1)], START);
  assert.equal(r!.problems.p1!.bestScore, 1);
  assert.equal(r!.problems.p1!.bestPassed, 2, "same score, more tests passed wins");
  assert.deepEqual(r!.problems.p1!.bestAt, at(9));
}

{
  // A problem edited mid-event (10 tests, then 20): 8/10 scores 80, 9/20
  // scores 45. More tests passed does not make it better; the score does.
  const [q] = summarise([sub("q", "p1", 5, 8, 10), sub("q", "p1", 9, 9, 20)], START);
  assert.equal(q!.problems.p1!.bestScore, 80);
  assert.equal(q!.problems.p1!.bestPassed, 8);
  assert.equal(q!.problems.p1!.total, 10);
  assert.equal(q!.score, 80);
}

/* ---------- ranking ---------- */

{
  const rows = summarise(
    [
      // ann: 200 points, final score reached at 50
      sub("ann", "p1", 10, 10, 10), sub("ann", "p2", 50, 5, 5),
      // ben: 200 points, reached at 40, so ahead of ann
      sub("ben", "p1", 20, 10, 10), sub("ben", "p2", 40, 5, 5),
      // cat: 250 points from a 150-point problem, beats both on score despite being slowest
      sub("cat", "p1", 80, 10, 10), sub("cat", "p3", 85, 3, 3, 150),
      // dan: 50 points
      sub("dan", "p1", 5, 5, 10),
      // eve: ran code only, never scores
      run("eve", "p1", 3),
      // fay: submitted but passed nothing
      sub("fay", "p1", 6, 0, 10),
    ],
    START,
  );
  const ranked = rankParticipants(rows);
  const order = ranked.map((r) => [r.userId, r.rank, r.tied]);
  assert.deepEqual(order, [
    ["cat", 1, false],
    ["ben", 2, false],
    ["ann", 3, false],
    ["dan", 4, false],
    // Nobody with zero points is ranked; they follow by name.
    ["eve", null, false],
    ["fay", null, false],
  ]);
}

{
  // Exactly equal score and time: shared rank, next rank skipped, flagged.
  const rows = summarise(
    [sub("x", "p1", 30, 1, 1), sub("y", "p1", 30, 1, 1), sub("z", "p1", 10, 1, 1), sub("w", "p1", 45, 1, 1)],
    START,
  );
  const ranked = rankParticipants(rows).map((r) => [r.userId, r.rank, r.tied]);
  assert.deepEqual(ranked, [
    ["z", 1, false],
    ["x", 2, true],
    ["y", 2, true],
    ["w", 4, false],
  ]);
}

{
  // A millisecond is enough to separate two participants.
  const a = sub("a", "p1", 30, 1, 1);
  const b = { ...sub("b", "p1", 30, 1, 1), createdAt: new Date(at(30).getTime() + 1) };
  const ranked = rankParticipants(summarise([b, a], START)).map((r) => [r.userId, r.rank, r.tied]);
  assert.deepEqual(ranked, [["a", 1, false], ["b", 2, false]]);
}

{
  // Ranking ignores input order and never mutates its input.
  const rows = summarise([sub("m", "p1", 9, 1, 1), sub("n", "p1", 3, 1, 1)], START);
  const copy = JSON.stringify(rows);
  assert.deepEqual(rankParticipants(rows), rankParticipants([...rows].reverse()));
  assert.equal(JSON.stringify(rows), copy);
}

/* ---------- reordering a set ---------- */

assert.deepEqual(moveItem(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
assert.deepEqual(moveItem(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
assert.deepEqual(moveItem(["a", "b", "c"], 0, -1), ["a", "b", "c"], "top cannot move up");
assert.deepEqual(moveItem(["a", "b", "c"], 2, 1), ["a", "b", "c"], "bottom cannot move down");
const original = ["a", "b", "c"];
moveItem(original, 0, 1);
assert.deepEqual(original, ["a", "b", "c"], "moveItem does not mutate");

assert.ok(isReorderOf(["a", "b", "c"], ["c", "a", "b"]));
assert.ok(isReorderOf([], []));
assert.ok(!isReorderOf(["a", "b"], ["a"]), "dropping a problem is not a reorder");
assert.ok(!isReorderOf(["a", "b"], ["a", "b", "x"]), "adding a problem is not a reorder");
assert.ok(!isReorderOf(["a", "b"], ["a", "x"]), "swapping in another problem is not a reorder");
assert.ok(!isReorderOf(["a", "b"], ["a", "a"]), "duplicates are not a reorder");

/* ---------- timer: "end at" a clock time ---------- */

{
  const now = new Date(2026, 9, 10, 19, 5, 30); // 19:05:30 local
  assert.equal(minutesUntil("20:30", now), 85, "rounds up to whole minutes, never short");
  assert.equal(minutesUntil("19:06", now), 1);
  assert.equal(minutesUntil("19:05", now), 23 * 60 + 60, "a time already past means tomorrow");
  assert.equal(minutesUntil("00:15", now), 5 * 60 + 10, "past midnight");
  for (const bad of ["", "7pm", "25:00", "19:60", "19", "aa:bb"]) {
    assert.equal(minutesUntil(bad, now), null, `${JSON.stringify(bad)} is not a time`);
  }
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(60), "1 h");
  assert.equal(formatMinutes(90), "1 h 30 min");
  assert.equal(formatMinutes(125), "2 h 5 min");
}

console.log("check-results: all assertions passed");
