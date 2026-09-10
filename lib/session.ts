/**
 * Whether the event's session is open, as a pure function of the clock.
 *
 * Kept free of imports so it can be asserted directly by the test suite and
 * used on both sides of the wire. The server is the only enforcement that
 * matters; the client uses it to explain itself.
 */
export type SessionWindow = {
  startsAt: Date | null;
  endsAt: Date | null;
};

export type SessionState = "open" | "not_started" | "ended";

/**
 * With no `endsAt` there is no timer, and the session is open for as long as a
 * problem is active. With one, the window is closed at both ends: a submission
 * before it starts or after it finishes is refused, without exception.
 */
export function sessionState(window: SessionWindow, now: Date = new Date()): SessionState {
  if (!window.endsAt) return "open";
  if (window.startsAt && now.getTime() < window.startsAt.getTime()) return "not_started";
  if (now.getTime() >= window.endsAt.getTime()) return "ended";
  return "open";
}

export const isSessionOpen = (window: SessionWindow, now?: Date) =>
  sessionState(window, now) === "open";
