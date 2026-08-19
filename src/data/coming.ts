// What Ringo does not sell yet. Anything listed here is a promise someone
// will hold Ringo to, so keep it honest and keep it short.
export interface ComingItem {
  key: string;
  title: string;
  sub: string;
}

/** What is coming after Ringo Light. Keep this list honest — anything listed
 *  here is a promise someone will hold Ringo to. */
export const COMING_ITEMS: ComingItem[] = [
  { key: 'porting', title: 'Keep your own number', sub: 'Port the number you already use into Ringo' },
  { key: 'calls_sms', title: 'Calls and texts', sub: 'Outbound calling and SMS on your Ringo number' },
  { key: 'more_data', title: 'Bigger data plans', sub: 'For people who live abroad rather than travel' },
];
