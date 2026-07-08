// log.ts — a single logging seam. Today it routes to the console (visible in the
// native device log and browser devtools); it's the one place to later forward
// warnings/errors to a crash-reporting service (e.g. Sentry) in production, so
// swallowed failures stop being invisible.
const isDev = !!import.meta.env.DEV;

export const log = {
  /** Non-fatal issue we recovered from (kept optimistic state, retried, etc.). */
  warn(scope: string, err: unknown, extra?: Record<string, unknown>): void {
    if (isDev) console.warn(`[ringo:${scope}]`, err, extra ?? '');
    // TODO(prod): forward to crash/analytics reporting once wired.
  },
  /** A real error worth surfacing even in production logs. */
  error(scope: string, err: unknown, extra?: Record<string, unknown>): void {
    console.error(`[ringo:${scope}]`, err, extra ?? '');
    // TODO(prod): forward to crash/analytics reporting once wired.
  },
};
