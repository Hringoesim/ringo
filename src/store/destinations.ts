// destinations.ts — every destination the site sells, from the catalogue
// endpoint (it lists them on every answer), fetched once per launch. The
// bundled list in data/destinations.ts is only the pictures and the first
// paint; this is the truth, so a country added on the site appears here.
import { useEffect, useState } from 'react';
import { light } from '../api/light';
import { DESTINATIONS, flagOf, type Destination } from '../data/destinations';
import { flags } from './flags';

let cache: Destination[] | null = null;

export function useDestinations(): Destination[] {
  const [list, setList] = useState<Destination[]>(cache || DESTINATIONS);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    light.catalog('europe').then((c) => {
      flags.set(c.app_flags);
      const out: Destination[] = c.destinations.map((d) => ({ id: d.id, label: d.label, kind: d.kind === 'region' ? 'region' : 'country', countries: d.countries || 1, flag: d.iso ? flagOf(d.iso) : undefined, region: d.region || null }));
      cache = out;
      if (alive) setList(out);
    }).catch(() => { /* the bundled list stands */ });
    return () => { alive = false; };
  }, []);
  return list;
}

/** A destination by id from the live list, or the bundled one. */
export function destinationFrom(list: Destination[], id: string): Destination | null {
  return list.find((d) => d.id === id) || DESTINATIONS.find((d) => d.id === id) || null;
}
