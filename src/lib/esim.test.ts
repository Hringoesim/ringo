import { describe, expect, it } from 'vitest';
import { lpaParts, qrDataUri } from './esim';

describe('lpaParts', () => {
  it('splits a standard activation string into SM-DP+ address and matching id', () => {
    expect(lpaParts('LPA:1$smdp.example.com$ABC-123')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC-123' });
  });

  it('returns the confirmation code when the string carries one', () => {
    expect(lpaParts('LPA:1$rsp.truphone.com$QR-G-5C-1LS-1W1Z9P7$4321')).toEqual({
      smdp: 'rsp.truphone.com',
      matchingId: 'QR-G-5C-1LS-1W1Z9P7',
      confirmationCode: '4321',
    });
  });

  it('leaves the confirmation code out entirely when it is absent or empty', () => {
    expect('confirmationCode' in lpaParts('LPA:1$smdp.example.com$ABC')).toBe(false);
    expect('confirmationCode' in lpaParts('LPA:1$smdp.example.com$ABC$')).toBe(false);
  });

  it('ignores fields after the confirmation code', () => {
    expect(lpaParts('LPA:1$smdp.example.com$ABC$99$extra$more')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC', confirmationCode: '99' });
  });

  it('keeps an empty matching id empty (SM-DP+ default profile form)', () => {
    expect(lpaParts('LPA:1$smdp.example.com$')).toEqual({ smdp: 'smdp.example.com', matchingId: '' });
    expect(lpaParts('LPA:1$smdp.example.com')).toEqual({ smdp: 'smdp.example.com', matchingId: '' });
  });

  it('gives empty parts, never a throw, for input with no separators', () => {
    expect(lpaParts('')).toEqual({ smdp: '', matchingId: '' });
    expect(lpaParts('LPA:1')).toEqual({ smdp: '', matchingId: '' });
    expect(lpaParts('not an activation code')).toEqual({ smdp: '', matchingId: '' });
  });

  it('gives empty parts, never a throw, for a missing value', () => {
    expect(lpaParts(undefined as unknown as string)).toEqual({ smdp: '', matchingId: '' });
    expect(lpaParts(null as unknown as string)).toEqual({ smdp: '', matchingId: '' });
  });
});

describe('lpaParts: strings that are not exactly LPA:1$…', () => {
  it('drops whitespace around the string and around each part', () => {
    expect(lpaParts('  LPA:1$smdp.example.com$ABC-123\n')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC-123' });
    expect(lpaParts('LPA:1$ smdp.example.com $ABC-123$ 4321 ')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC-123', confirmationCode: '4321' });
  });

  // Regression: the first field was dropped whatever it was, so a string
  // without the marker showed the matching id as the SM-DP+ address.
  it('reads a string without the LPA:1 marker from its first field', () => {
    expect(lpaParts('smdp.example.com$ABC-123')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC-123' });
    expect(lpaParts('smdp.example.com$ABC-123$77')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC-123', confirmationCode: '77' });
  });

  it('takes the marker in any letter case, or as the bare format number', () => {
    expect(lpaParts('lpa:1$smdp.example.com$ABC')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC' });
    expect(lpaParts('1$smdp.example.com$ABC')).toEqual({ smdp: 'smdp.example.com', matchingId: 'ABC' });
  });
});

describe('qrDataUri', () => {
  const lpa = 'LPA:1$smdp.example.com$ABC-123';

  it('resolves to an image data URI usable as an <img> src', async () => {
    await expect(qrDataUri(lpa)).resolves.toMatch(/^data:image\/gif;base64,[A-Za-z0-9+/]+=*$/);
  });

  it('is deterministic for one string and differs between strings', async () => {
    const [a, again, other] = await Promise.all([qrDataUri(lpa), qrDataUri(lpa), qrDataUri('LPA:1$smdp.example.com$ABC-124')]);
    expect(a).toBe(again);
    expect(a).not.toBe(other);
  });
});
