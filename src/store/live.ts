// live.ts — the app shows what ringoesim.com sells right now. Every time the
// app opens or comes back to the foreground, the "live tick" moves on, and
// every store and open screen that reads the site listens to it and asks
// again (the requests themselves bypass any HTTP cache, see api/light.ts).
// What was last received stays in memory only, to paint at once while the
// fresh answer loads; nothing the site says is kept on the phone between
// launches.
import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

let tick = 0;
let lastBump = 0;
const listeners = new Set<() => void>();

/** Moves the tick on: every listener refetches. Two signals of one return (visibilitychange and the native resume) count once. */
export function bumpLive(): void {
  const now = Date.now();
  if (now - lastBump < 1500) return;
  lastBump = now;
  tick += 1;
  listeners.forEach((l) => l());
}

export const live = {
  get: (): number => tick,
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** The current live tick: put it in an effect's dependencies to refetch on every return to the app. */
export function useLiveTick(): number {
  return useSyncExternalStore(live.subscribe, live.get, live.get);
}

let started = false;
/** Listens for the app returning to the foreground. Called once at launch (App.tsx). */
export function startLive(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  // The launch counts as the first return: lastBump is set so the resume
  // WKWebView may fire during start-up does not ask twice.
  lastBump = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') bumpLive();
  });
  if (Capacitor.isNativePlatform()) {
    void CapApp.addListener('appStateChange', ({ isActive }) => { if (isActive) bumpLive(); }).catch(() => { /* visibilitychange stands */ });
  }
}
