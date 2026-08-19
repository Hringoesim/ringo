// launch.ts — what Ringo actually sells today.
//
// Ringo Light is one global eSIM: data in 180+ countries PLUS a real virtual
// phone number (Telnyx), included in the price. The number is part of the
// product — it is the reason a traveller picks Ringo over a cheap data-only
// eSIM, because bank codes arrive and family can call.
export const NUMBER_INCLUDED = true;

// Porting an EXISTING number in (MNP) is a separate, later capability — the
// included number is newly issued. Flip this when porting ships and the
// porting flow, its checklist item and its entry points all come back.
export const PORTING_LIVE = false;

/** Identity checks are required to issue a phone number in most markets, so
 *  KYC follows the number rather than porting. */
export const KYC_REQUIRED = NUMBER_INCLUDED;

/** Kept for the surfaces that ask "can the user manage numbers yet". */
export const NUMBERS_LIVE = NUMBER_INCLUDED;

/** Shown wherever a deferred feature is surfaced. */
export const COMING_SOON = 'Coming soon';
