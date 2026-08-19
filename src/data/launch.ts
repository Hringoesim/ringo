// launch.ts — what Ringo actually sells today.
//
// Ringo Light is ONE global data eSIM. Nothing else ships at launch.
//
// A virtual number was in the 19 Aug spec and has since been pulled: a
// Telnyx-hosted number is VoIP, and VoIP numbers get reclassified by
// line-type lookup so bank one-time codes do not arrive — which is the one
// thing the number was meant to deliver. It comes back when numbers live on
// a real mobile core.
export const NUMBER_INCLUDED = false;

// Porting an existing number in (MNP) is a separate, later capability.
export const PORTING_LIVE = false;

/** Identity checks exist to issue phone numbers. A data-only eSIM does not
 *  need one, so KYC is out of the launch flow (the screen is kept). */
export const KYC_REQUIRED = NUMBER_INCLUDED;

/** Whether the user has any number to manage: the Numbers tab, the Home
 *  number card, the Settings row and the checklist item all follow this. */
export const NUMBERS_LIVE = NUMBER_INCLUDED;

/** Shown wherever a deferred feature is surfaced. */
export const COMING_SOON = 'Coming soon';
