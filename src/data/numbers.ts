import type { PhoneNumber } from './types';

// Default identity: Hippolyte, Belgium-anchored (demo access). The +32 number
// is the identity anchor (bank, WhatsApp, 2FA); the others ride the same eSIM.
// `network`/`ran` = the serving partner network the eSIM is attached to
// ("premium local networks" per ringoesim.com — real values come from the CMP).
export const NUMBERS: PhoneNumber[] = [
  { id: 'be', flag: '🇧🇪', country: 'Belgium',        number: '+32 470 56 71 40', tag: 'Primary', active: true,  source: 'ported', status: 'active', network: 'Proximus', ran: '5G' },
  { id: 'gb', flag: '🇬🇧', country: 'United Kingdom', number: '+44 7700 900123',  tag: 'Active',  active: true,  source: 'ringo',  status: 'active', network: 'EE',       ran: '5G' },
  { id: 'es', flag: '🇪🇸', country: 'Spain',          number: '+34 612 34 56 78', tag: 'Standby', active: false, source: 'ringo',  status: 'active', network: 'Movistar', ran: '4G+' },
];
