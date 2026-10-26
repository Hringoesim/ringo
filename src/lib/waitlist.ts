// waitlist.ts: the full Ringo service's waitlist (one plan with your own
// number ported, working in every country; not launched). Ringo Light, the
// data eSIMs the app sells, is a separate product and never mixed in here.
//
// The place in line is computed exactly the way ringoesim.com's dashboard
// computes it (src/App.jsx, the queue card): every referral moves the member
// up 10 places, every survey answer moves them up 10 places, and get_user's
// queue_ahead already counts the SAVED answers.
import type { WaitlistUser } from '../api/light';
import { SITE } from '../api/light';

export const PLACES_PER_REFERRAL = 10;
export const PLACES_PER_ANSWER = 10;
export const PROFILE_QUESTIONS = 6;

export function isPioneer(status: string | null | undefined): boolean {
  return status === 'pioneer_active' || status === 'promoter_pioneer';
}

/** A signup row that has not joined the waitlist yet. */
export function isLead(status: string | null | undefined): boolean {
  return !status || status === 'lead';
}

export interface Place {
  /** null when the site has no queue figure: say "You're in line for Ringo." */
  ahead: number | null;
  behind: number | null;
}

/**
 * The live place: `liveAnswers` is the survey's answered count right now
 * (defaults to the saved count), credited before the save lands.
 */
export function placeFrom(user: WaitlistUser | null | undefined, liveAnswers?: number): Place {
  if (!user) return { ahead: null, behind: null };
  const referrals = (user.pioneer_referrals_count || 0) + (user.free_referrals_count || 0);
  const queueAhead = typeof user.queue_ahead === 'number' ? user.queue_ahead : null;
  const queueBehind = typeof user.queue_behind === 'number' ? user.queue_behind : null;
  const aheadNow = queueAhead != null ? Math.max(0, queueAhead - referrals * PLACES_PER_REFERRAL) : null;
  const behindNow = queueBehind != null ? queueBehind + (queueAhead != null && aheadNow != null ? queueAhead - aheadNow : 0) : null;
  const saved = typeof user.profile_answers === 'number' ? user.profile_answers : 0;
  const live = typeof liveAnswers === 'number' ? liveAnswers : saved;
  const pending = Math.max(0, live - saved) * PLACES_PER_ANSWER;
  const ahead = aheadNow != null ? Math.max(0, aheadNow - pending) : null;
  const behind = behindNow != null ? behindNow + (aheadNow != null && ahead != null ? aheadNow - ahead : 0) : null;
  return { ahead, behind };
}

/** The member's referral link, the same one the website's dashboard shares. */
export function referralLink(code: string | null | undefined): string | null {
  return code ? `${SITE}/r/${code}` : null;
}

/** The first name to greet with, from the name given in the survey; null without one (never guessed from the email). */
export function firstNameOf(user: WaitlistUser | null | undefined): string | null {
  const first = String(user?.name || '').trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
}

export const fmt = (n: number) => n.toLocaleString('en-US');
