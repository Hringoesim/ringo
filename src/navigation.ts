// Navigation contract shared between the app shell and screens.
export type NavTarget =
  | 'home'
  | 'browse'
  | 'numbers'
  | 'plan'
  | 'country'
  | 'addNumber'
  | 'install'
  | 'activate'
  | 'port'
  | 'tiers'
  | 'kyc'
  | 'settings'
  | 'terms'
  | 'privacy'
  | 'twofactor';

// Generic navigation handler. Extra args carry route params
// (e.g. onNav('country', 'JP') or onNav('addNumber', 'PT')).
export type OnNav = (target: NavTarget, ...args: string[]) => void;
