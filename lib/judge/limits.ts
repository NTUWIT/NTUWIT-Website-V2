/**
 * Limits shared by the judge and by problem validation. Kept out of piston.ts
 * because that module is server-only, and the admin console validates a problem
 * in the browser as it is typed.
 */

/**
 * Wall clock per execution: Piston's compile timeout (10s) plus a batch's run
 * (MAX_RUN_TIMEOUT_MS) plus queueing. At 8s a C++ or Java call that compiled
 * and then ran was cut off mid-run and reported as an unreachable judge.
 */
export const REQUEST_TIMEOUT_MS = 20_000;

/**
 * The longest run Piston accepts, its PISTON_RUN_TIMEOUT. A batch of tests
 * shares this budget. Must match infra/piston/compose.yml on the droplet.
 */
export const MAX_RUN_TIMEOUT_MS = 6_000;

/** Tests per execution. More saves compiles; fewer loses less to one slow case. */
export const MAX_BATCH = 25;

/**
 * Time a request may spend starting executions. Kept so that one more
 * execution (REQUEST_TIMEOUT_MS) still ends inside the routes' 60s maxDuration,
 * so a participant always gets an answer instead of a spinner.
 */
export const JUDGE_BUDGET_MS = 38_000;

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
