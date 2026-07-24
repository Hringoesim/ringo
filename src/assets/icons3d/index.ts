// Rendered 3D object icons for the primary CTAs / action tiles.
// Source: 3dicons by realvjy (https://3dicons.co) — CC0, free for commercial
// use, no attribution required (see LICENSE-3D-ICONS.txt). All icons share the
// "dynamic" camera angle, but each keeps its own vivid colour (Wise/Revolut
// style) so the four tiles read as distinct, glossy 3D objects.
import addcountry from './addcountry.png'; // red map pin → "Add country"
import port from './port.png'; // orange handset + incoming arrow → "Port number"
import topup from './topup.png'; // blue sparkle money bag → "Top up"
import install from './install.png'; // purple gradient phone → "Install eSIM"
import trophy from './trophy.png'; // gold trophy → level-up banner
import tick from './tick.png'; // teal tick → install success

/** Keyed by the ActionChip icon kind used on the dashboard. */
export const ICON_3D = { globe: addcountry, port, plan: topup, qr: install } as const;

export type Icon3DKind = keyof typeof ICON_3D;

/** Standalone celebration/status icons (replace raw emoji). */
export const ICON_3D_EXTRA = { trophy, tick } as const;
