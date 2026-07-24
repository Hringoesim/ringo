// Rendered 3D object icons for the primary CTAs / action tiles.
// Source: 3dicons by realvjy (https://3dicons.co) — CC0, free for commercial
// use, no attribution required (see LICENSE-3D-ICONS.txt). All icons use the
// "dynamic" camera angle + gradient style so they read as one family, and the
// orange→pink→purple gradients match the Ringo warm-sunset palette.
import addcountry from './addcountry.png'; // map pin → "Add country"
import port from './port.png'; // handset + incoming arrow → "Port number"
import topup from './topup.png'; // money bag → "Top up"
import install from './install.png'; // phone → "Install eSIM"
import trophy from './trophy.png'; // trophy → level-up banner
import tick from './tick.png'; // green tick → install success

/** Keyed by the ActionChip icon kind used on the dashboard. */
export const ICON_3D = { globe: addcountry, port, plan: topup, qr: install } as const;

export type Icon3DKind = keyof typeof ICON_3D;

/** Standalone celebration/status icons (replace raw emoji). */
export const ICON_3D_EXTRA = { trophy, tick } as const;
