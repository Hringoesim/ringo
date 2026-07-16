// Rendered 3D object icons for the primary CTAs / action tiles.
// Source: Microsoft Fluent Emoji 3D set — MIT licensed, free for commercial use.
// https://github.com/microsoft/fluentui-emoji  (see LICENSE-3D-ICONS.txt)
import globe from './globe.png'; // 🌐 network globe → "Add country"
import port from './port.png'; // 🔄 transfer arrows → "Port number"
import topup from './topup.png'; // 💰 money bag → "Top up"
import install from './install.png'; // 📲 phone with arrow → "Install eSIM"

/** Keyed by the ActionChip icon kind used on the dashboard. */
export const ICON_3D = { globe, port, plan: topup, qr: install } as const;

export type Icon3DKind = keyof typeof ICON_3D;
