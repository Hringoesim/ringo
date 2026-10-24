// avatar.ts: the member's own photo, kept on this phone only (never sent to
// ringoesim.com), shrunk to a 256px square so it fits in storage. Without
// one the avatar is their Ringo cowboy (golden for a Pioneer).
import { useSyncExternalStore } from 'react';

const KEY = (userId: string) => `ringo_avatar_v1_${userId}`;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
// One stable subscribe, so React does not resubscribe on every render.
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function read(userId: string | null): string | null {
  if (!userId) return null;
  try { return localStorage.getItem(KEY(userId)); } catch { return null; }
}

async function shrink(file: File, px = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error('empty image');
    const c = document.createElement('canvas');
    c.width = c.height = px;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, px, px);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const avatarPhoto = {
  /** Resolves true when the photo was saved, false when it could not be read or stored. */
  async set(userId: string, file: File): Promise<boolean> {
    let ok = false;
    try { localStorage.setItem(KEY(userId), await shrink(file)); ok = true; } catch { /* storage full or the image unreadable: keep the cowboy */ }
    notify();
    return ok;
  },
  clear(userId: string): void {
    try { localStorage.removeItem(KEY(userId)); } catch { /* ignore */ }
    notify();
  },
  use(userId: string | null): string | null {
    return useSyncExternalStore(subscribe, () => read(userId), () => null);
  },
};

// The traveller a member picked (owner 2026-10-25, "update the avatars"):
// one of the Ringo travellers in Avatar.tsx, kept on this phone like the
// photo. Unset means the Ringo cowboy.
const TKEY = (userId: string) => `ringo_traveller_v1_${userId}`;
function readTraveller(userId: string | null): string | null {
  if (!userId) return null;
  try { return localStorage.getItem(TKEY(userId)); } catch { return null; }
}
export const avatarTraveller = {
  set(userId: string, kind: string): void {
    try { localStorage.setItem(TKEY(userId), kind); } catch { /* storage full: keep the last one */ }
    notify();
  },
  use(userId: string | null): string | null {
    return useSyncExternalStore(subscribe, () => readTraveller(userId), () => null);
  },
};
