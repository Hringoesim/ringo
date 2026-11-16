// log.ts — a single logging seam. Today it routes to the console (visible in the
// native device log and browser devtools); it's the one place to later forward
// warnings/errors to a crash-reporting service (e.g. Sentry) in production, so
// swallowed failures stop being invisible.
const isDev = !!import.meta.env.DEV;

/**
 * A request path or URL with the account's `user` id and session token `t`
 * blanked. Both ride in the query string (the site's API reads them there),
 * so a path must never reach a log, a device console or a crash report whole.
 */
export function redact(s: string): string {
  return s.replace(/([?&](?:t|user)=)[^&#\s]*/g, '$1[redacted]');
}

const clean = (v: unknown): unknown => (typeof v === 'string' ? redact(v) : v);

export const log = {
  /** Non-fatal issue we recovered from (kept optimistic state, retried, etc.). */
  warn(scope: string, err: unknown, extra?: Record<string, unknown>): void {
    if (isDev) console.warn(`[ringo:${scope}]`, clean(err), extra ?? '');
    // TODO(prod): forward to crash/analytics reporting once wired.
  },
  /** A real error worth surfacing even in production logs. */
  error(scope: string, err: unknown, extra?: Record<string, unknown>): void {
    console.error(`[ringo:${scope}]`, clean(err), extra ?? '');
    // TODO(prod): forward to crash/analytics reporting once wired.
  },
};
