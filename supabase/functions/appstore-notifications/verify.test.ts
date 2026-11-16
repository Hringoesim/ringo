// A stand-in for Apple's chain (own root, intermediate, leaf with Apple's marker
// extensions) proves the verifier accepts a properly chained signature and
// rejects everything else. The pinned Apple root itself is checked by fingerprint.
import { beforeAll, describe, expect, it } from 'vitest';
import * as x509 from '@peculiar/x509';
import {
  APPLE_ROOT_CA_G3_B64,
  JwsVerifyError,
  OID_APPLE_RECEIPT_SIGNING_LEAF,
  OID_APPLE_WWDR_INTERMEDIATE,
  verifyAppleJws,
} from './verify';

const P384 = { name: 'ECDSA', namedCurve: 'P-384', hash: 'SHA-384' } as const;
const P256 = { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' } as const;
const NULL_DER = new Uint8Array([5, 0]);
const DAY = 86_400_000;

const b64url = (b: Uint8Array | string) =>
  Buffer.from(typeof b === 'string' ? new TextEncoder().encode(b) : b).toString('base64url');
const der = (c: x509.X509Certificate) => Buffer.from(c.rawData).toString('base64');
const keys = (alg: typeof P384 | typeof P256) =>
  crypto.subtle.generateKey(alg, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;

interface Chain {
  rootB64: string;
  x5c: string[];
  leafKey: CryptoKey;
}

async function makeChain(o: { leafOid?: boolean; interOid?: boolean; leafNotAfter?: Date } = {}): Promise<Chain> {
  const now = Date.now();
  const rootKeys = await keys(P384);
  const interKeys = await keys(P384);
  const leafKeys = await keys(P256);
  const root = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: '01',
    name: 'CN=Test Root',
    notBefore: new Date(now - DAY),
    notAfter: new Date(now + 365 * DAY),
    signingAlgorithm: P384,
    keys: rootKeys,
    extensions: [new x509.BasicConstraintsExtension(true, undefined, true)],
  });
  const inter = await x509.X509CertificateGenerator.create({
    serialNumber: '02',
    subject: 'CN=Test Intermediate',
    issuer: root.subject,
    notBefore: new Date(now - DAY),
    notAfter: new Date(now + 365 * DAY),
    signingAlgorithm: P384,
    publicKey: interKeys.publicKey,
    signingKey: rootKeys.privateKey,
    extensions: [
      new x509.BasicConstraintsExtension(true, 0, true),
      ...(o.interOid === false ? [] : [new x509.Extension(OID_APPLE_WWDR_INTERMEDIATE, false, NULL_DER)]),
    ],
  });
  const leaf = await x509.X509CertificateGenerator.create({
    serialNumber: '03',
    subject: 'CN=Test Leaf',
    issuer: inter.subject,
    notBefore: new Date(now - DAY),
    notAfter: o.leafNotAfter ?? new Date(now + 30 * DAY),
    signingAlgorithm: P384,
    publicKey: leafKeys.publicKey,
    signingKey: interKeys.privateKey,
    extensions:
      o.leafOid === false ? [] : [new x509.Extension(OID_APPLE_RECEIPT_SIGNING_LEAF, false, NULL_DER)],
  });
  return { rootB64: der(root), x5c: [der(leaf), der(inter), der(root)], leafKey: leafKeys.privateKey };
}

async function sign(chain: Chain, payload: unknown, header: Record<string, unknown> = {}): Promise<string> {
  const h = b64url(JSON.stringify({ alg: 'ES256', x5c: chain.x5c, ...header }));
  const p = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chain.leafKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
}

const PAYLOAD = { notificationType: 'SUBSCRIBED', data: { bundleId: 'com.ringoesim.app' } };

describe('verifyAppleJws', () => {
  let good: Chain;
  beforeAll(async () => {
    good = await makeChain();
  });

  it('returns the payload when the chain leads to the trusted root', async () => {
    const jws = await sign(good, PAYLOAD);
    await expect(verifyAppleJws(jws, { rootB64: good.rootB64 })).resolves.toEqual(PAYLOAD);
  });

  it('rejects the old attack: an unsigned payload anyone could post', async () => {
    const forged = `${b64url('{"alg":"none"}')}.${b64url(JSON.stringify(PAYLOAD))}.`;
    await expect(verifyAppleJws(forged)).rejects.toBeInstanceOf(JwsVerifyError);
    const noChain = `${b64url('{"alg":"ES256"}')}.${b64url(JSON.stringify(PAYLOAD))}.${b64url('x')}`;
    await expect(verifyAppleJws(noChain)).rejects.toThrow(/x5c/);
  });

  it('rejects a self-made chain that is valid in itself but not rooted in Apple', async () => {
    const attacker = await makeChain();
    const jws = await sign(attacker, PAYLOAD);
    // Checked against the real pinned Apple root (the production default).
    await expect(verifyAppleJws(jws)).rejects.toThrow(/trusted root|signature check/);
    // And against another root it was not issued by.
    await expect(verifyAppleJws(jws, { rootB64: good.rootB64 })).rejects.toThrow(/trusted root|signature check/);
  });

  it('rejects a payload changed after signing', async () => {
    const [h, , s] = (await sign(good, PAYLOAD)).split('.');
    const tampered = `${h}.${b64url(JSON.stringify({ ...PAYLOAD, notificationType: 'DID_RENEW' }))}.${s}`;
    await expect(verifyAppleJws(tampered, { rootB64: good.rootB64 })).rejects.toThrow(/signature does not match/);
  });

  it('rejects a signature made with a key that is not the leaf certificate key', async () => {
    const other = await keys(P256);
    const jws = await sign({ ...good, leafKey: other.privateKey }, PAYLOAD);
    await expect(verifyAppleJws(jws, { rootB64: good.rootB64 })).rejects.toThrow(/signature does not match/);
  });

  it('rejects any algorithm other than ES256', async () => {
    const jws = await sign(good, PAYLOAD, { alg: 'HS256' });
    await expect(verifyAppleJws(jws, { rootB64: good.rootB64 })).rejects.toThrow(/ES256/);
  });

  it('rejects an expired certificate', async () => {
    const jws = await sign(good, PAYLOAD);
    const later = new Date(Date.now() + 60 * DAY); // past the leaf's 30 days
    await expect(verifyAppleJws(jws, { rootB64: good.rootB64, now: later })).rejects.toThrow(/validity/);
  });

  it('rejects certificates without Apple marker extensions', async () => {
    const noLeaf = await makeChain({ leafOid: false });
    await expect(verifyAppleJws(await sign(noLeaf, PAYLOAD), { rootB64: noLeaf.rootB64 })).rejects.toThrow(/leaf/);
    const noInter = await makeChain({ interOid: false });
    await expect(verifyAppleJws(await sign(noInter, PAYLOAD), { rootB64: noInter.rootB64 })).rejects.toThrow(/intermediate/);
  });

  it('rejects junk input', async () => {
    for (const bad of [undefined, null, 42, '', 'a.b', 'a.b.c', '!!.!!.!!']) {
      await expect(verifyAppleJws(bad)).rejects.toBeInstanceOf(JwsVerifyError);
    }
  });

  it('pins the real Apple Root CA G3', async () => {
    const root = new x509.X509Certificate(APPLE_ROOT_CA_G3_B64);
    expect(root.subject).toContain('Apple Root CA - G3');
    const fp = Buffer.from(await root.getThumbprint('SHA-256')).toString('hex');
    expect(fp).toBe('63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179');
  });
});
