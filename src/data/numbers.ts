import type { PhoneNumber } from './types';

// The Belgian number is the user's identity anchor (bank, WhatsApp, 2FA); the
// others ride the same eSIM.
export const NUMBERS: PhoneNumber[] = [
  { id: 'be', flag: '🇧🇪', country: 'Belgium', number: '+32 471 23 45 67', tag: 'Primary', active: true },
  { id: 'jp', flag: '🇯🇵', country: 'Japan',   number: '+81 80 1234 5678', tag: 'Active',  active: true },
  { id: 'us', flag: '🇺🇸', country: 'USA',     number: '+1 415 555 0123',  tag: 'Standby', active: false },
];
