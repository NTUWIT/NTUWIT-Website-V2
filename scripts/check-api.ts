/**
 * API-boundary checks: the typed error contract in lib/errors.ts must hold for
 * malformed, oversized and unauthenticated input, and zod must strip anything a
 * client tries to smuggle in.
 *
 * The validation half is pure and always runs. The HTTP half runs only when a
 * server is reachable at BASE_URL (default http://localhost:3000), because an
 * unauthenticated request is the one route behaviour testable without a session.
 *
 * Run: yarn test  (validation only)   yarn check:api  (adds the HTTP half)
 */
import assert from "node:assert/strict";

import { ERROR_STATUS } from "@/lib/errors";
import { MAX_CUSTOM_ARGS_BYTES, MAX_SOURCE_BYTES, submissionInput } from "@/lib/validation";

const UUID = "11111111-1111-4111-8111-111111111111";
const base = { problemId: UUID, language: "python", source: "print(1)" };

/* ---------- zod at the trust boundary ---------- */

assert.ok(submissionInput.safeParse(base).success, "a well-formed body must parse");

// Unknown keys are the attack surface: a client must not be able to hand the
// judge its own limits, points, tests, or another participant's identity.
const smuggled = submissionInput.safeParse({
  ...base,
  userId: "user_someone_else",
  points: 999999,
  timeLimitMs: 60_000,
  memoryLimitKb: 1_000_000,
  tests: [{ stdin: "[]", expectedStdout: "0" }],
  isSample: true,
});
assert.ok(smuggled.success, "unknown keys must be stripped, not rejected");
assert.deepEqual(
  Object.keys(smuggled.data!).sort(),
  ["language", "problemId", "source"],
  "only the three declared fields may survive parsing",
);

// Malformed shapes must all fail closed.
for (const [label, body] of [
  ["missing problemId", { language: "python", source: "x" }],
  ["problemId not a uuid", { ...base, problemId: "not-a-uuid" }],
  ["unknown language", { ...base, language: "rust" }],
  ["language wrong type", { ...base, language: 7 }],
  ["source wrong type", { ...base, source: { toString: "x" } }],
  ["null body", null],
  ["array body", []],
  ["string body", "python"],
] as const) {
  assert.ok(!submissionInput.safeParse(body).success, `${label} must be rejected`);
}

// Size ceilings bound what reaches the judge.
assert.ok(
  submissionInput.safeParse({ ...base, source: "a".repeat(MAX_SOURCE_BYTES) }).success,
  "source exactly at the limit must be accepted",
);
assert.ok(
  !submissionInput.safeParse({ ...base, source: "a".repeat(MAX_SOURCE_BYTES + 1) }).success,
  "source one byte over the limit must be rejected",
);
assert.ok(
  submissionInput.safeParse({ ...base, customArgs: "a".repeat(MAX_CUSTOM_ARGS_BYTES) }).success,
  "customArgs exactly at the limit must be accepted",
);
assert.ok(
  !submissionInput.safeParse({ ...base, customArgs: "a".repeat(MAX_CUSTOM_ARGS_BYTES + 1) }).success,
  "customArgs one byte over the limit must be rejected",
);

/* ---------- the error contract itself ---------- */

assert.equal(ERROR_STATUS.UNAUTHENTICATED, 401);
assert.equal(ERROR_STATUS.INVALID, 400);
assert.equal(ERROR_STATUS.RATE_LIMITED, 429);
assert.equal(ERROR_STATUS.JUDGE_UNAVAILABLE, 503);

/* ---------- HTTP half: only what works without a session ---------- */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

async function httpChecks() {
  const reachable = await fetch(BASE_URL, { signal: AbortSignal.timeout(2500) })
    .then((response) => response.ok)
    .catch(() => false);

  if (!reachable) {
    console.log(`check-api: no server at ${BASE_URL}, skipped the HTTP half`);
    return;
  }

  const post = (path: string, body: unknown) =>
    fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  // Signed out, every protected route must answer with the typed 401 JSON body,
  // never a redirect to a sign-in page: an API caller cannot follow one.
  for (const path of ["/api/run", "/api/submit"]) {
    const response = await post(path, base);
    assert.equal(response.status, 401, `${path} must answer 401 when signed out`);
    assert.equal(
      response.headers.get("content-type")?.includes("application/json"),
      true,
      `${path} must answer JSON, not a redirect`,
    );
    const payload = await response.json();
    assert.deepEqual(payload, { ok: false, error: "UNAUTHENTICATED" }, `${path} body`);
  }

  // Malformed JSON must not reach a handler as an exception.
  const malformed = await post("/api/run", "{not json");
  assert.ok(
    [400, 401].includes(malformed.status),
    `malformed JSON must be a typed error, got ${malformed.status}`,
  );

  // The leaderboard route requires a session too, and answers with the same
  // typed body rather than a redirect.
  const board = await fetch(`${BASE_URL}/api/leaderboard`);
  assert.equal(board.status, 401, "leaderboard must answer 401 when signed out");
  assert.deepEqual(await board.json(), { ok: false, error: "UNAUTHENTICATED" });

  console.log(`check-api: HTTP half passed against ${BASE_URL}`);
}

httpChecks()
  .then(() => console.log("check-api: all assertions passed"))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
