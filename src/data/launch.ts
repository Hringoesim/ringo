// launch.ts — what Ringo actually sells today.
//
// The launch product is Ringo Light: one global data eSIM. Phone numbers,
// calls/SMS and porting are built but not offered yet, so the UI shows them
// as "Coming soon" instead of hiding them — travellers still see where the
// product is going, and nothing is a dead end.
//
// Flip NUMBERS_LIVE to true when numbers ship: the Numbers tab, porting, the
// setup checklist item and the Calls & SMS row all come back on their own.
export const NUMBERS_LIVE = false;

/** Identity checks exist to issue phone numbers. A data-only eSIM does not
 *  need one, so the KYC step is out of the launch flow (the screen is kept). */
export const KYC_REQUIRED = NUMBERS_LIVE;

/** Shown wherever a deferred feature is surfaced. */
export const COMING_SOON = 'Coming soon';
