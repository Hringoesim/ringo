import type { PhoneNumber } from './types';

// Default identity: a UK-anchored user (launch market). The +44 number is the
// identity anchor (bank, WhatsApp, 2FA); the others ride the same eSIM.
export const NUMBERS: PhoneNumber[] = [
  { id: 'gb', flag: '🇬🇧', country: 'United Kingdom', number: '+44 7700 900123', tag: 'Primary', active: true,  source: 'ringo', status: 'active' },
  { id: 'ie', flag: '🇮🇪', country: 'Ireland',        number: '+353 83 123 4567', tag: 'Active',  active: true,  source: 'ringo', status: 'active' },
  { id: 'es', flag: '🇪🇸', country: 'Spain',          number: '+34 612 34 56 78', tag: 'Standby', active: false, source: 'ported', status: 'active' },
];
