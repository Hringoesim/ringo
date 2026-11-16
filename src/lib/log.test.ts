import { afterEach, describe, expect, it, vi } from 'vitest';
import { log, redact } from './log';

afterEach(() => { vi.restoreAllMocks(); });

describe('redact', () => {
  it('blanks the session token and the user id wherever they sit in the query', () => {
    expect(redact('/app-profile?user=u-123&t=secret.tok')).toBe('/app-profile?user=[redacted]&t=[redacted]');
    expect(redact('/esim-plans?destination=japan&app=1&user=u-123&t=secret.tok')).toBe('/esim-plans?destination=japan&app=1&user=[redacted]&t=[redacted]');
    expect(redact('/esim-subscription?t=secret.tok&usage=1 -> 401 Unauthorized')).toBe('/esim-subscription?t=[redacted]&usage=1 -> 401 Unauthorized');
  });

  it('leaves every other parameter, and parameters that only end in t or user, alone', () => {
    expect(redact('/light-status?pi=pi_123')).toBe('/light-status?pi=pi_123');
    expect(redact('/x?count=3&superuser=1&dest=fr')).toBe('/x?count=3&superuser=1&dest=fr');
    expect(redact('no query here')).toBe('no query here');
  });
});

describe('log', () => {
  it('never prints a token or user id handed to it in a string, warn or error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    log.warn('api', '/app-usage?user=u-123&t=secret.tok -> timed out');
    log.error('api', '/app-usage?user=u-123&t=secret.tok -> 500');
    const printed = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(printed).not.toContain('secret.tok');
    expect(printed).not.toContain('u-123');
    expect(printed).toContain('/app-usage?user=[redacted]&t=[redacted] -> 500');
  });

  it('passes an Error through untouched', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = new Error('boom');
    log.error('push', e, { step: 'register' });
    expect(error).toHaveBeenCalledWith('[ringo:push]', e, { step: 'register' });
  });
});
