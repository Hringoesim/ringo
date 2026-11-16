// Verifies an Apple-signed JWS (App Store Server Notifications v2 payloads and
// the signed transaction info nested inside them) before any field is trusted.
//
// Apple signs with ES256 and ships the certificate chain in the `x5c` header:
// leaf, Apple WWDR intermediate, Apple Root CA G3. Anyone can build a chain and
// put it in a header, so the root from the payload is never used: the
// intermediate must be signed by the Apple Root CA G3 pinned below, the leaf by
// that intermediate, and both must carry Apple's marker extensions.
//
// Pure WebCrypto + @peculiar/x509 so it runs in Deno (edge function) and in
// Node (the unit tests in verify.test.ts).
import * as x509 from 'npm:@peculiar/x509@1';

// Apple Root CA - G3, from https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
// SHA-256 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79
// Valid until 2039-04-30.
export const APPLE_ROOT_CA_G3_B64 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==';

// Marker extensions Apple puts on its certificates.
export const OID_APPLE_WWDR_INTERMEDIATE = '1.2.840.113635.100.6.2.1';
export const OID_APPLE_RECEIPT_SIGNING_LEAF = '1.2.840.113635.100.6.11.1';

export class JwsVerifyError extends Error {
  constructor(reason: string) {
    super(`JWS rejected: ${reason}`);
    this.name = 'JwsVerifyError';
  }
}

export interface VerifyOptions {
  /** Base64 DER of the trusted root. Tests pass their own; production uses Apple's. */
  rootB64?: string;
  /** Clock used for certificate validity. */
  now?: Date;
}

function b64urlToBytes(seg: string): Uint8Array {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseJson(bytes: Uint8Array, what: string): Record<string, unknown> {
  try {
    const v = JSON.parse(new TextDecoder().decode(bytes));
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  } catch {
    /* fall through */
  }
  throw new JwsVerifyError(`${what} is not a JSON object`);
}

function within(cert: x509.X509Certificate, now: Date): boolean {
  return cert.notBefore.getTime() <= now.getTime() && now.getTime() <= cert.notAfter.getTime();
}

/**
 * Returns the decoded payload only if the JWS is signed by a certificate that
 * chains to the trusted root. Throws JwsVerifyError otherwise.
 */
export async function verifyAppleJws<T>(jws: unknown, opts: VerifyOptions = {}): Promise<T> {
  if (typeof jws !== 'string') throw new JwsVerifyError('not a string');
  const parts = jws.split('.');
  if (parts.length !== 3 || parts.some((p) => !p)) throw new JwsVerifyError('not a compact JWS');
  const [h, p, s] = parts;
  const now = opts.now ?? new Date();

  let header: Record<string, unknown>;
  let signature: Uint8Array;
  let payloadBytes: Uint8Array;
  try {
    header = parseJson(b64urlToBytes(h), 'header');
    payloadBytes = b64urlToBytes(p);
    signature = b64urlToBytes(s);
  } catch (e) {
    if (e instanceof JwsVerifyError) throw e;
    throw new JwsVerifyError('bad base64url');
  }

  if (header.alg !== 'ES256') throw new JwsVerifyError('alg is not ES256');
  const x5c = header.x5c;
  if (!Array.isArray(x5c) || x5c.length < 2 || x5c.some((c) => typeof c !== 'string')) {
    throw new JwsVerifyError('missing x5c certificate chain');
  }

  let leaf: x509.X509Certificate;
  let intermediate: x509.X509Certificate;
  let root: x509.X509Certificate;
  try {
    leaf = new x509.X509Certificate(x5c[0] as string);
    intermediate = new x509.X509Certificate(x5c[1] as string);
    root = new x509.X509Certificate(opts.rootB64 ?? APPLE_ROOT_CA_G3_B64);
  } catch {
    throw new JwsVerifyError('unreadable certificate');
  }

  if (!within(leaf, now) || !within(intermediate, now) || !within(root, now)) {
    throw new JwsVerifyError('certificate outside its validity period');
  }
  if (!leaf.getExtension(OID_APPLE_RECEIPT_SIGNING_LEAF)) {
    throw new JwsVerifyError('leaf is not an Apple receipt-signing certificate');
  }
  if (!intermediate.getExtension(OID_APPLE_WWDR_INTERMEDIATE)) {
    throw new JwsVerifyError('intermediate is not an Apple WWDR certificate');
  }
  const bc = intermediate.getExtension(x509.BasicConstraintsExtension);
  if (!bc?.ca) throw new JwsVerifyError('intermediate is not a CA');

  let chainOk = false;
  let sigOk = false;
  try {
    chainOk =
      (await intermediate.verify({ publicKey: root, date: now })) &&
      (await leaf.verify({ publicKey: intermediate, date: now }));
    if (chainOk) {
      const key = await leaf.publicKey.export({ name: 'ECDSA', namedCurve: 'P-256' }, ['verify']);
      sigOk = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        signature,
        new TextEncoder().encode(`${h}.${p}`),
      );
    }
  } catch {
    throw new JwsVerifyError('signature check failed');
  }
  if (!chainOk) throw new JwsVerifyError('certificate chain does not lead to the trusted root');
  if (!sigOk) throw new JwsVerifyError('signature does not match');

  return parseJson(payloadBytes, 'payload') as T;
}
