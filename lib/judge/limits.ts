/**
 * Limits shared by the judge and by problem validation. Kept out of piston.ts
 * because that module is server-only, and the admin console validates a problem
 * in the browser as it is typed.
 */

/** Judge-side wall clock per execution. Kept under Vercel's function ceiling. */
export const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Piston kills a run once its output reaches this many bytes and reports it as
 * a signal. Must match PISTON_OUTPUT_MAX_SIZE on the droplet: raise this only
 * after the raised value in infra/piston/compose.yml is deployed there.
 */
export const MAX_OUTPUT_BYTES = 65_536;

/**
 * The droplet's Piston accepts request bodies up to 2 MB (patched; see
 * infra/piston/apply-droplet-limits.sh). The body carries the participant's
 * source (up to MAX_SOURCE_BYTES, 64 KB), the harness around it, and the
 * arguments JSON-escaped a second time, which can nearly double text-heavy
 * input, so a test's arguments get well under half.
 */
export const MAX_STDIN_BYTES = 800_000;
