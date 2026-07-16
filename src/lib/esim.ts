// esim.ts — eSIM profile helpers. A profile (ICCID + SM-DP+ address + matching id
// + confirmation code) is the real LPA activation data, handed out from the
// backend pool (see supabase claim_esim). Here we turn it into the LPA string,
// a scannable QR, and Apple's native "Add eSIM" universal link.
import qrcode from 'qrcode-generator';

export interface EsimProfile {
  iccid: string;
  matchingId: string;
  smdp: string; // SM-DP+ address, e.g. rsp1.cmlink.com
  confirmationCode?: string;
  provider?: string;
}

/** The SGP.22 LPA activation string encoded in the QR / entered manually. */
export function lpaString(p: EsimProfile): string {
  return `LPA:1$${p.smdp}$${p.matchingId}`;
}

/** iOS 17.4+ universal link that opens the native "Add eSIM" flow pre-filled —
 *  self-install, no scanning needed on the device itself. */
export function appleInstallUrl(p: EsimProfile): string {
  return `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaString(p))}`;
}

/** A crisp, scannable QR of the LPA string, as a data URI for an <img>. */
export function qrDataUri(p: EsimProfile): string {
  const qr = qrcode(0, 'M');
  qr.addData(lpaString(p));
  qr.make();
  return qr.createDataURL(6, 4); // 6px modules, 4-module quiet zone
}

/** Human-friendly ICCID with light grouping. */
export function formatIccid(iccid: string): string {
  return iccid.replace(/(.{4})/g, '$1 ').trim();
}
