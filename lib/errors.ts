/**
 * The complete set of error codes that may cross the API boundary.
 * Raw exception messages are never returned: they leak stack paths and,
 * for a judge failure, potentially hidden test data.
 */
export const ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  INVALID: 400,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  JUDGE_UNAVAILABLE: 503,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type ApiResult<T> =
  | ({ ok: true } & T)
  | { ok: false; error: ErrorCode };

export function fail(error: ErrorCode): Response {
  return Response.json({ ok: false, error }, { status: ERROR_STATUS[error] });
}

export function ok<T extends object>(data: T): Response {
  return Response.json({ ok: true, ...data });
}

/** Thrown inside the judge layer and mapped to a code at the route boundary. */
export class JudgeError extends Error {
  readonly code = "JUDGE_UNAVAILABLE" as const;
}
