// summary.ts — the store's from-prices, fetched once per launch and shared by
// every card. The currency (EUR or USD) is decided by the site from the IP.
import { useEffect, useState } from 'react';
import { light, type Summary } from '../api/light';

let cache: Summary | null = null;

export function useSummary(): Summary | null {
  const [s, setS] = useState<Summary | null>(cache);
  useEffect(() => {
    let alive = true;
    light.summary().then((v) => { cache = v; if (alive) setS(v); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return s;
}
