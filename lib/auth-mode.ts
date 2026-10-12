/**
 * Who may act as a participant, as pure functions of their inputs.
 *
 * `none` is the normal state: a participant enters a display name and acts as
 * a signed guest, no account. `invite` (Clerk accounts only) is opt-in.
 * Admin access is never decided here; it always requires Clerk.
 *
 * The mode comes from the AUTH_MODE_OVERRIDE env var alone (set in Vercel,
 * then redeploy). Kept free of imports, like lib/session.ts, so every rule is
 * asserted directly by scripts/check-auth-mode.ts. Unset means `none`; a value
 * that is set but unclear resolves to `invite`, the closed side.
 */
export const AUTH_MODES = ["invite", "none"] as const;

export type AuthMode = (typeof AUTH_MODES)[number];

/** Exact literal match only: no trimming, no case folding. */
export function parseAuthMode(raw: unknown): AuthMode | null {
  return typeof raw === "string" && (AUTH_MODES as readonly string[]).includes(raw)
    ? (raw as AuthMode)
    : null;
}

export type ResolvedAuthMode = { mode: AuthMode; warning?: string };

/**
 * The mode is set only by the AUTH_MODE_OVERRIDE env var in Vercel. Unset or
 * empty is `none`. A typo resolves to `invite`: someone meant to set it.
 */
export function resolveAuthMode(envValue: string | undefined): ResolvedAuthMode {
  const mode = parseAuthMode(envValue);
  if (mode) return { mode };
  return envValue
    ? {
        mode: "invite",
        warning: `Ignoring invalid AUTH_MODE_OVERRIDE ${JSON.stringify(envValue)}; expected one of ${AUTH_MODES.join(", ")}. Using invite.`,
      }
    : { mode: "none" };
}

/** `guest_` plus a lowercase v4 uuid. Clerk ids start `user_`, so they never collide. */
const GUEST_ID = /^guest_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isGuestId(id: unknown): id is string {
  return typeof id === "string" && GUEST_ID.test(id);
}

/**
 * Whether to offer the "enter your name" field. Only when auth is disabled
 * (`none`) and nobody is acting yet; in `invite` mode, never.
 */
export function showGuestJoin(input: { mode: AuthMode; participantId: string | null }): boolean {
  return input.mode === "none" && !input.participantId;
}

/**
 * What /sign-in shows. Only the IDE opens up when auth is disabled: anything
 * headed for /admin always gets the real account form, and a guest cookie
 * never counts as being signed in for it.
 */
export function signInView(input: {
  mode: AuthMode;
  participantId: string | null;
  redirectTo: string;
}): "guest" | "account" | "redirect" {
  const clerkUser = Boolean(input.participantId) && !isGuestId(input.participantId);
  const toAdmin = input.redirectTo === "/admin" || input.redirectTo.startsWith("/admin/");
  if (input.mode === "invite") return "account";
  // Auth disabled: a Clerk session only opens admin. In the IDE it is nobody,
  // so a Clerk user picks a name like everyone else.
  if (clerkUser) return toAdmin ? "redirect" : "guest";
  if (toAdmin) return "account";
  return input.participantId ? "account" : "guest";
}

/**
 * Invite mode: Clerk accounts only. None mode: named guests only, a Clerk
 * session never acts as a participant (it is for admin).
 */
export function resolveParticipant(input: {
  mode: AuthMode;
  clerkUserId: string | null;
  guestId: string | null;
}): string | null {
  if (input.mode === "invite") return input.clerkUserId;
  return isGuestId(input.guestId) ? input.guestId : null;
}
