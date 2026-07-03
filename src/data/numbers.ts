import type { PhoneNumber } from './types';

// Real data only: Hippolyte's actual main number. No fabricated placeholder
// numbers — additional numbers appear here only when genuinely allocated or
// ported via the orchestrator.
export const NUMBERS: PhoneNumber[] = [
  { id: 'be', flag: '🇧🇪', country: 'Belgium', number: '+32 470 56 71 40', tag: 'Primary', active: true, source: 'ported', status: 'active', network: 'Proximus', ran: '5G' },
];
