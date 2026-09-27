// destinations.ts — every destination the site sells, from the catalogue
// endpoint (it lists them on every answer), fetched at launch and again every
// time the app returns to the foreground (store/live.ts). The bundled list in
// data/destinations.ts is only the pictures and the paint of a cold start
// with no network: once the site has answered, only its list is shown, so a
// country added or removed on the site shows here at the next return.
import { useEffect, useSyncExternalStore } from 'react';
import { light } from '../api/light';
import { DESTINATIONS, flagOf, type Destination } from '../data/destinations';
import { flags } from './flags';
import { live } from './live';

/** The site's last answer, in memory only (never stored on the phone). */
let current: Destination[] | null = null;
let loadedTick = -1;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Asks the site for the list (and the app_flags that ride with it) unless this live tick already did. */
export function refreshDestinations(): Promise<void> {
  const t = live.get();
  if (loadedTick === t) return inflight || Promise.resolve();
  loadedTick = t;
  inflight = light.catalog('europe').then((c) => {
    flags.set(c.app_flags);
    const out: Destination[] = c.destinations.map((d) => ({ id: d.id, label: d.label, kind: d.kind === 'region' ? 'region' : 'country', countries: d.countries || 1, flag: d.iso ? flagOf(d.iso) : undefined, region: d.region || null }));
    if (out.length) {
      current = out;
      listeners.forEach((l) => l());
    }
  }).catch(() => {
    // No answer: the last list stands (the bundled one on a cold start), and
    // the next return to the app asks again.
    if (loadedTick === t) loadedTick = -1;
  }).finally(() => { inflight = null; });
  return inflight;
}

const snapshot = (): Destination[] => current || DESTINATIONS;
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useDestinations(): Destination[] {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  const t = useSyncExternalStore(live.subscribe, live.get, live.get);
  useEffect(() => { void refreshDestinations(); }, [t]);
  return list;
}

/** A destination by id from the live list, or the bundled one (a name for a picture credit, a header before the plans load). */
export function destinationFrom(list: Destination[], id: string): Destination | null {
  return list.find((d) => d.id === id) || DESTINATIONS.find((d) => d.id === id) || null;
}
