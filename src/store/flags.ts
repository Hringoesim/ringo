// flags.ts — switches the site hands the app with the catalogue (app_flags),
// so a button can be turned on or off without a new build.
import { useSyncExternalStore } from 'react';

export interface AppFlags { google_signin?: boolean }
let current: AppFlags = {};
const listeners = new Set<() => void>();
export const flags = {
  get: (): AppFlags => current,
  set(next: AppFlags | undefined) { current = next || {}; listeners.forEach((l) => l()); },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};
export function useFlags(): AppFlags { return useSyncExternalStore(flags.subscribe, flags.get, flags.get); }
