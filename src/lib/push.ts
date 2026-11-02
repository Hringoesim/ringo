// push.ts — push notifications, from JS. ringoesim.com is the sender; the
// app only asks for permission, hands over this phone's APNs token and the
// member's two switches (POST /api/app-push-register), and opens the screen a
// tapped push names.
//
// - Permission is asked in ONE place: the onboarding step (NotifyScreen,
//   owner 2026-11-02: only 4 of 16 phones had offers on), right after signing
//   up and picking a traveller, before the tabs. It explains why, carries the
//   offers switch (on by default, visible and changeable: App Store guideline
//   4.5.4) and raises the iOS dialog once from "Turn on notifications". A
//   member from before the step sees it once at launch, while iOS has not
//   been asked yet or the offers switch was never set; a phone where iOS has
//   been refused is never nagged. 'Not now' and an iOS 'Don't Allow' both
//   close the ask for good on this phone; after that only the switches under
//   Help can turn notifications on (they open iOS Settings once iOS has been
//   refused). The older PushSheet (after the first delivered purchase) stays
//   as the ask for a phone that somehow never saw the step.
// - Service alerts (data running low, eSIM ready) are on once notifications
//   are allowed. Offers (Rewards, promos) are what the member left the switch
//   on: on from the step unless turned off, off as easily under Help.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { useSyncExternalStore } from 'react';
import { light } from '../api/light';
import { account } from '../store/account';
import { log } from './log';
import { lastCountry, readCountry } from './location';

type Permission = 'granted' | 'denied' | 'prompt' | 'unavailable';
type ApnsEnv = 'production' | 'sandbox';

interface NotifyPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  status(): Promise<{ permission: Exclude<Permission, 'unavailable'>; environment: ApnsEnv; token?: string; error?: string }>;
  register(): Promise<void>;
  openSettings(): Promise<void>;
  addListener(event: 'token', fn: (e: { token: string; environment: ApnsEnv }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'tap', fn: (e: { path?: string }) => void): Promise<PluginListenerHandle>;
}

const Native = registerPlugin<NotifyPlugin>('Notify');
export const pushAvailable = (): boolean => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export interface PushPrefs { service: boolean; offers: boolean }
export interface PushState {
  permission: Permission; prefs: PushPrefs; token: string | null; environment: ApnsEnv;
  /** true once the native side has said where permission stands */
  known: boolean;
}

const PREFS_KEY = 'ringo_push_prefs_v1';
const PROMPTED_KEY = 'ringo_push_prompted_v1';
const SENT_KEY = 'ringo_push_sent_v1';
// The onboarding step has been shown on this phone (any answer, or closed).
const ONBOARD_KEY = 'ringo_push_onboard_v1';

function readPrefs(): PushPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    if (v && typeof v.service === 'boolean' && typeof v.offers === 'boolean') return v;
  } catch { /* ignore */ }
  return { service: true, offers: false };
}

let state: PushState = { permission: pushAvailable() ? 'prompt' : 'unavailable', prefs: readPrefs(), token: null, environment: 'production', known: false };
const listeners = new Set<() => void>();
function setState(patch: Partial<PushState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export function usePush(): PushState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

/** Tell the site this phone's token and switches, once per change. */
export async function syncPush(): Promise<void> {
  const acct = account.get();
  const { token, environment, prefs, permission } = state;
  if (!acct || !token) return;
  const allowed = permission === 'granted';
  const country = allowed ? lastCountry() : null;
  const body = { token, environment, service_ok: allowed && prefs.service, offers_ok: allowed && prefs.offers, app_version: String(import.meta.env.VITE_APP_VERSION || ''), ...(country ? { country } : {}) };
  const sig = JSON.stringify({ u: acct.userId, ...body });
  try { if (localStorage.getItem(SENT_KEY) === sig) return; } catch { /* ignore */ }
  try {
    const r = await light.pushRegister(acct.userId, acct.t, body);
    try { localStorage.setItem(SENT_KEY, sig); } catch { /* ignore */ }
    // The switches under Help show what the site holds: when it answers with
    // something else than what was sent (a row another phone or the site
    // changed), the phone follows the site.
    if (allowed && r && typeof r.service_ok === 'boolean' && typeof r.offers_ok === 'boolean' && (r.service_ok !== prefs.service || r.offers_ok !== prefs.offers)) {
      const next = { service: r.service_ok, offers: r.offers_ok };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      setState({ prefs: next });
    }
  } catch (e) {
    log.error('push', e, { step: 'register' });
  }
}

async function refresh(): Promise<void> {
  if (!pushAvailable()) return;
  try {
    const s = await Native.status();
    setState({ permission: s.permission, environment: s.environment, token: s.token ?? state.token, known: true });
  } catch { /* plugin missing on an old build */ }
  // Where the phone is now, for pushes about the trip (never asks here).
  // In the background: a slow location fix never holds up the push token.
  if (state.permission === 'granted') void readCountry(false).then(() => syncPush()).catch(() => {});
  else await syncPush();
}

/**
 * At launch: listen for the token and for taps, read where permission
 * stands. Never raises the permission dialog. `onOpen` gets the in-app path
 * of a tapped push.
 */
export function startPush(onOpen: (path: string) => void): () => void {
  if (!pushAvailable()) return () => {};
  const handles: Promise<PluginListenerHandle>[] = [
    Native.addListener('token', (e) => { setState({ token: e.token, environment: e.environment }); void syncPush(); }),
    Native.addListener('tap', (e) => { if (e.path) onOpen(e.path); }),
  ];
  const offAccount = account.subscribe(() => { void syncPush(); });
  const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
  document.addEventListener('visibilitychange', onVisible);
  void refresh();
  return () => {
    handles.forEach((h) => void h.then((x) => x.remove()));
    offAccount();
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/**
 * The pre-prompt shows once per device (not per account), only while iOS has
 * not been asked yet and the native side has answered where permission stands.
 */
export function shouldPrompt(): boolean {
  if (!pushAvailable() || !state.known || state.permission !== 'prompt') return false;
  try { return localStorage.getItem(PROMPTED_KEY) !== '1'; } catch { return false; }
}
/** 'Not now' (or any answer): the pre-prompt never shows again on this phone. */
export function dismissPrompt(): void {
  try { localStorage.setItem(PROMPTED_KEY, '1'); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/**
 * The onboarding step (NotifyScreen) is due once per phone: notifications are
 * available, the native side has said where permission stands, the step has
 * not been shown, and either iOS has not been asked yet or the offers switch
 * was never set by the member (no saved switches). A phone where iOS has been
 * refused is never nagged.
 */
export function onboardDue(): boolean {
  if (!pushAvailable() || !state.known) return false;
  try {
    if (localStorage.getItem(ONBOARD_KEY) === '1') return false;
    if (state.permission === 'prompt') return true;
    return state.permission === 'granted' && localStorage.getItem(PREFS_KEY) === null;
  } catch { return false; }
}
/** The step has been shown: never again on this phone. The older sheet goes with it. */
export function markOnboarded(): void {
  try { localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* ignore */ }
  dismissPrompt();
}
/**
 * "Turn on notifications" on the step: save the switches as the member left
 * them (service alerts on, offers as chosen), then the iOS dialog once if iOS
 * has not been asked yet. A yes registers this phone's token with the site
 * right away, offers flag included. Returns whether notifications are allowed.
 */
export async function completeOnboard(offers: boolean): Promise<boolean> {
  markOnboarded();
  const prefs = { service: true, offers };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  setState({ prefs });
  if (state.permission === 'granted') { void syncPush(); return true; }
  if (state.permission === 'denied') return false;
  return askPermission();
}

/** Raise the iOS dialog (after the pre-prompt). Returns whether allowed. */
export async function askPermission(): Promise<boolean> {
  dismissPrompt();
  if (!pushAvailable()) return false;
  try {
    const { granted } = await Native.requestPermission();
    setState({ permission: granted ? 'granted' : 'denied' });
    // A yes to notifications is followed by the one location ask: the
    // country makes them about the trip. A no is never asked about location.
    if (granted) void readCountry(true).then(() => syncPush());
    // Telling the site happens in the background: the screen that asked
    // moves on at once, never waiting on the network.
    void refresh();
    return granted;
  } catch {
    return false;
  }
}

/** Flip one switch. Turning one on with notifications never asked raises the dialog first. */
export async function setPushPref(key: keyof PushPrefs, on: boolean): Promise<void> {
  if (on && state.permission === 'prompt' && !(await askPermission())) return;
  if (on && state.permission === 'denied') { await openPushSettings(); return; }
  const prefs = { ...state.prefs, [key]: on };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  setState({ prefs });
  void syncPush();
}

export async function openPushSettings(): Promise<void> {
  try { await Native.openSettings(); } catch { /* ignore */ }
}

/**
 * Sign out or account deletion: tell the site this phone's token no longer
 * belongs to the account, so its pushes stop arriving here. Never throws and
 * never holds the caller for long (capped at 2.5 s).
 */
export async function unregisterPush(): Promise<void> {
  try { localStorage.removeItem(SENT_KEY); } catch { /* ignore */ }
  const acct = account.get();
  const { token, environment } = state;
  if (!acct || !token) return;
  const send = light.pushRegister(acct.userId, acct.t, { token, environment, service_ok: false, offers_ok: false, app_version: String(import.meta.env.VITE_APP_VERSION || '') })
    .then(() => undefined)
    .catch((e) => { log.error('push', e, { step: 'unregister' }); });
  await Promise.race([send, new Promise<void>((r) => setTimeout(r, 2500))]);
}
