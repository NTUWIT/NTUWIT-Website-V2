/**
 * Limits shared by the judge and by problem validation. Kept out of piston.ts
 * because that module is server-only, and the admin console validates a problem
 * in the browser as it is typed.
 */

/** Judge-side wall clock per execution. Kept under Vercel's function ceiling. */
export const REQUEST_TIMEOUT_MS = 8_000;
