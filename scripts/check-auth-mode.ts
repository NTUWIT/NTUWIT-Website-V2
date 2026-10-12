/**
 * The auth-mode fallback is a last resort used under pressure, so every rule
 * that decides who a participant is lives in pure functions and is asserted
 * here. The invariants, in order of how badly breaking them would hurt:
 *
 *   1. Any doubt about the mode resolves to `invite`, never `none`.
 *   2. A guest identity only exists in `none` mode, and only from a cookie
 *      this server signed.
 *   3. A guest id can never look like, or stand in for, a Clerk id.
 *
 * The mode comes only from the AUTH_MODE_OVERRIDE env var.
 *
 * Admin access is not decided here at all: `isAdmin` reads Clerk only, and the
 * HTTP half of check-api.ts asserts a guest gets a 404 from /admin.
 *
 * Run: yarn test
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import {
  AUTH_MODES,
  isGuestId,
  parseAuthMode,
  resolveAuthMode,
  resolveParticipant,
  showGuestJoin,
  signInView,
} from "@/lib/auth-mode";
import { MIN_SECRET_BYTES, newGuestId, signGuest, verifyGuest } from "@/lib/guest-cookie";
import { guestName } from "@/lib/validation";

/* ---------- parseAuthMode: exact literals only ---------- */

assert.deepEqual([...AUTH_MODES], ["invite", "none"], "exactly two modes exist");
assert.equal(parseAuthMode("invite"), "invite");
assert.equal(parseAuthMode("none"), "none");

for (const raw of [
  "", " ", "NONE", "None", "none ", " none", "none\n", "INVITE", "open_signup", "open-signup",
  "disabled", "off", "true", "anything", null, undefined, 0, 1, 7, true, false, {}, [], ["none"],
  { toString: () => "none" },
]) {
  assert.equal(parseAuthMode(raw), null, `parseAuthMode(${JSON.stringify(raw)}) must be null`);
}

/* ---------- resolveAuthMode: env var only, a typo fails closed ---------- */

const r = resolveAuthMode;

assert.deepEqual(r("none"), { mode: "none" }, "AUTH_MODE_OVERRIDE=none disables auth");
assert.deepEqual(r("invite"), { mode: "invite" });

// Unset or empty is the normal state: no auth, no warning.
assert.deepEqual(r(undefined), { mode: "none" });
assert.deepEqual(r(""), { mode: "none" });

// Anything else is a typo: invite, with a warning naming the variable. A
// near-miss must never open the doors.
for (const value of ["NONE", "None", "none ", " none", "none\n", "open_signup", "disabled", "off", "false", "0", "true"]) {
  const out = r(value);
  assert.equal(out.mode, "invite", `AUTH_MODE_OVERRIDE=${JSON.stringify(value)} must fail closed`);
  assert.ok(out.warning && /AUTH_MODE_OVERRIDE/.test(out.warning), `${JSON.stringify(value)} must warn`);
}

/* ---------- isGuestId: one exact shape ---------- */

const GUEST = "guest_3b241101-e2bb-4255-8caf-4136c566a962";
const OTHER_GUEST = "guest_9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b";
assert.ok(isGuestId(GUEST));
for (const id of [
  "user_2abc123", "guest_", "guest_x", "guest_3b241101e2bb42558caf4136c566a962",
  `${GUEST} `, ` ${GUEST}`, `${GUEST}\n`, "GUEST_3b241101-e2bb-4255-8caf-4136c566a962",
  "guest_3B241101-E2BB-4255-8CAF-4136C566A962", "guest_3b241101-e2bb-1255-8caf-4136c566a962",
  "", null, undefined, 5,
]) {
  assert.ok(!isGuestId(id), `isGuestId(${JSON.stringify(id)}) must be false`);
}

/* ---------- resolveParticipant ---------- */

const p = resolveParticipant;

// Invite: the Clerk account. None: never a Clerk account, only a guest.
assert.equal(p({ mode: "invite", clerkUserId: "user_1", guestId: GUEST }), "user_1");
assert.equal(p({ mode: "none", clerkUserId: "user_1", guestId: null }), null, "no-auth ignores Clerk");
assert.equal(p({ mode: "none", clerkUserId: "user_1", guestId: GUEST }), GUEST);
// A guest resolves only in none.
assert.equal(p({ mode: "none", clerkUserId: null, guestId: GUEST }), GUEST);
assert.equal(p({ mode: "invite", clerkUserId: null, guestId: GUEST }), null);
// No ids, no participant.
for (const mode of AUTH_MODES) assert.equal(p({ mode, clerkUserId: null, guestId: null }), null);
// Defence in depth: a guestId that is not a guest id never resolves.
assert.equal(p({ mode: "none", clerkUserId: null, guestId: "user_1" }), null);
assert.equal(p({ mode: "none", clerkUserId: null, guestId: "guest_x" }), null);

/* ---------- showGuestJoin: name entry only when auth is disabled ---------- */

assert.equal(showGuestJoin({ mode: "none", participantId: null }), true, "none + nobody: offer a name");
assert.equal(showGuestJoin({ mode: "none", participantId: "user_1" }), false, "signed in: no name field");
assert.equal(showGuestJoin({ mode: "none", participantId: GUEST }), false, "already a guest: no name field");
for (const participantId of [null, "user_1", GUEST]) {
  assert.equal(
    showGuestJoin({ mode: "invite", participantId }),
    false,
    `invite mode must never show name entry (participant ${participantId})`,
  );
}

/* ---------- signInView: admin always goes through a real sign-in ---------- */

const CLERK = "user_1";
const view = (
  mode: "invite" | "none",
  { clerk = null, guest = null }: { clerk?: string | null; guest?: string | null },
  redirectTo = "/ide",
) => signInView({ mode, clerkUserId: clerk, guestId: guest, redirectTo });

// Invite mode: always the account form, whoever arrives, wherever they go.
for (const who of [{}, { clerk: CLERK }, { guest: GUEST }, { clerk: CLERK, guest: GUEST }]) {
  assert.equal(view("invite", who), "account", `invite mode, ${JSON.stringify(who)}`);
  assert.equal(view("invite", who, "/admin"), "account", `invite mode to admin, ${JSON.stringify(who)}`);
}
// Auth disabled, heading for the IDE: a named guest goes straight back in...
assert.equal(view("none", { guest: GUEST }), "redirect", "a returning guest is never asked again");
// ...even when the same browser also holds a Clerk session (an organiser).
assert.equal(view("none", { clerk: CLERK, guest: GUEST }), "redirect", "Clerk never hides the guest cookie");
// Nobody yet, or only a Clerk session: pick a name. The IDE ignores accounts.
assert.equal(view("none", {}), "guest");
assert.equal(view("none", { clerk: CLERK }), "guest");
// Heading for admin: only a Clerk session counts, a guest cookie never does.
assert.equal(view("none", {}, "/admin"), "account", "admin needs a real sign-in");
assert.equal(view("none", {}, "/admin/problems/new"), "account");
assert.equal(view("none", { guest: GUEST }, "/admin"), "account", "a guest is not signed in for admin");
assert.equal(view("none", { clerk: CLERK }, "/admin"), "redirect");
assert.equal(view("none", { clerk: CLERK, guest: GUEST }, "/admin"), "redirect");

/* ---------- guest cookie signing ---------- */

const SECRET = "s".repeat(MIN_SECRET_BYTES);
const OTHER_SECRET = "t".repeat(MIN_SECRET_BYTES);
assert.ok(MIN_SECRET_BYTES >= 32, "secrets shorter than 32 bytes are never acceptable");

const signed = signGuest(GUEST, SECRET);
assert.ok(signed, "a valid id and secret must sign");
assert.equal(verifyGuest(signed, SECRET), GUEST, "round trip");
assert.equal(verifyGuest(signed, OTHER_SECRET), null, "wrong secret");

const [payload, sig] = signed!.split(".");
const flip = (s: string) => s.slice(0, -1) + (s.at(-1) === "A" ? "B" : "A");
for (const [label, value] of [
  ["tampered payload", `${Buffer.from(OTHER_GUEST).toString("base64url")}.${sig}`],
  ["tampered signature", `${payload}.${flip(sig!)}`],
  ["truncated signature", `${payload}.${sig!.slice(0, 10)}`],
  ["signature only", `.${sig}`],
  ["payload only", `${payload}.`],
  ["unsigned", payload!],
  ["raw id", GUEST],
  ["extra segment", `${signed}.x`],
  ["empty", ""],
  ["garbage", "!!!.???"],
] as const) {
  assert.equal(verifyGuest(value, SECRET), null, `${label} must not verify`);
}
assert.equal(verifyGuest(undefined, SECRET), null, "missing cookie");

// Weak or missing secrets refuse to sign and to verify.
for (const weak of ["", "short", "s".repeat(MIN_SECRET_BYTES - 1), undefined]) {
  assert.equal(signGuest(GUEST, weak), null, "weak secret must not sign");
  assert.equal(verifyGuest(signed!, weak), null, "weak secret must not verify");
}

// A correctly signed value that is not a guest id must still be refused, so a
// leaked secret cannot be used to impersonate a Clerk user through this path.
const forge = (id: string) =>
  `${Buffer.from(id).toString("base64url")}.${createHmac("sha256", SECRET)
    .update(Buffer.from(id).toString("base64url"))
    .digest("base64url")}`;
assert.equal(verifyGuest(forge(GUEST), SECRET), GUEST, "forge() mirrors the real format");
assert.equal(verifyGuest(forge("user_abc123"), SECRET), null, "signed Clerk-shaped id");
assert.equal(verifyGuest(forge("guest_x"), SECRET), null, "signed malformed guest id");
assert.equal(signGuest("user_abc123", SECRET), null, "never sign a non-guest id");

// Fresh ids are well formed and unique.
const ids = new Set(Array.from({ length: 1000 }, newGuestId));
assert.equal(ids.size, 1000);
for (const id of ids) assert.ok(isGuestId(id), `newGuestId produced ${id}`);

/* ---------- display names ---------- */

assert.equal(guestName.parse("  Ada  "), "Ada", "trimmed");
assert.ok(guestName.safeParse("A").success, "1 char");
assert.ok(guestName.safeParse("a".repeat(40)).success, "40 chars");
assert.ok(guestName.safeParse("李小龙 🐉").success, "unicode names are fine");
for (const [label, name] of [
  ["empty", ""],
  ["whitespace only", "   "],
  ["41 chars", "a".repeat(41)],
  ["newline", "Ada\nLovelace"],
  ["NUL", "Ada\u0000"],
  ["bidi override", "Ada‮"],
  ["not a string", 42],
] as const) {
  assert.ok(!guestName.safeParse(name).success, `${label} must be rejected`);
}

console.log("check-auth-mode: all assertions passed");
