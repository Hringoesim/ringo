// Distinct 3D landmark icons for the globe. Source: Microsoft Fluent Emoji 3D
// set — MIT licensed, free for commercial use (see LICENSE-3D-ICONS.txt).
// One unique landmark per city — no icon is reused.
import ferriswheel from './ferriswheel.png'; // 🎡 London Eye
import classical from './classical.png'; // 🏛️ Rome (Colosseum/Pantheon)
import mosque from './mosque.png'; // 🕌 Istanbul
import cityscape from './cityscape.png'; // 🏙️ Dubai
import temple from './temple.png'; // 🛕 Mumbai
import tokyotower from './tokyotower.png'; // 🗼 Tokyo
import torii from './torii.png'; // ⛩️ Kyoto
import bridge from './bridge.png'; // 🌉 Sydney Harbour Bridge
import mountain from './mountain.png'; // ⛰️ Rio (Sugarloaf)
import liberty from './liberty.png'; // 🗽 New York

export const LANDMARK_SRC: Record<string, string> = {
  ferriswheel, classical, mosque, cityscape, temple, tokyotower, torii, bridge, mountain, liberty,
};
