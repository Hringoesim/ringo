// avatar.ts: the member's own photo, kept on this phone only (never sent to
// ringoesim.com), shrunk to a 256px square so it fits in storage. Without
// one the avatar is their Ringo cowboy.
import { useSyncExternalStore } from 'react';

const KEY = (userId: string) => `ringo_avatar_v1_${userId}`;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function read(userId: string | null): string | null {
  if (!userId) return null;
  try { return localStorage.getItem(KEY(userId)); } catch { return null; }
}

async function shrink(file: File, px = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = c.height = px;
    c.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, px, px);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const avatarPhoto = {
  async set(userId: string, file: File): Promise<void> {
    try { localStorage.setItem(KEY(userId), await shrink(file)); } catch { /* storage full or the image unreadable: keep the cowboy */ }
    notify();
  },
  clear(userId: string): void {
    try { localStorage.removeItem(KEY(userId)); } catch { /* ignore */ }
    notify();
  },
  use(userId: string | null): string | null {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => read(userId), () => null);
  },
};
