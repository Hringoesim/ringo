// esim.ts — helpers around the SGP.22 LPA activation string
// (LPA:1$<SM-DP+>$<matching id>[$<confirmation code>]) that ringoesim.com
// hands the app for an eSIM it sold: a scannable QR for another device and
// the parts for manual entry.

export interface LpaParts {
  smdp: string;
  matchingId: string;
  confirmationCode?: string;
}

export function lpaParts(lpa: string): LpaParts {
  // Whitespace around the string or a part (a trailing newline from the
  // supplier) would be typed into Settings with the code.
  const parts = String(lpa ?? '').trim().split('$').map((p) => p.trim());
  // The first field is the format marker, not an address. A string that came
  // without it ("smdp.example.com$ABC") starts at the address: dropping its
  // first field blindly showed the matching id as the SM-DP+ address.
  if (/^(?:LPA:)?1$/i.test(parts[0])) parts.shift();
  else if (parts.length < 2) return { smdp: '', matchingId: '' };
  const [smdp = '', matchingId = '', confirmationCode] = parts;
  return confirmationCode ? { smdp, matchingId, confirmationCode } : { smdp, matchingId };
}

/** A crisp, scannable QR of the LPA string, as a data URI for an <img>.
 *  The QR library (56 KB) loads here, the first time a QR is drawn, not at launch. */
export async function qrDataUri(lpa: string): Promise<string> {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(lpa);
  qr.make();
  return qr.createDataURL(6, 4); // 6px modules, 4-module quiet zone
}
