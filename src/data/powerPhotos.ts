// The Power Use regions seen from space (owner 2026-10-27: Power plans wear
// satellite pictures, a different one per region). NASA photographs taken
// from the International Space Station, public domain.
import europe from '../assets/store/europe-orbit.jpg'; // iss066e116300
import latam from '../assets/store/latam-orbit.jpg'; // iss058e006004, the Andes
import africa from '../assets/store/africa-orbit.jpg'; // iss047e022280, Sahara dunes
import northAmerica from '../assets/store/north-america-orbit.jpg'; // iss070e062746, city lights
import caribbean from '../assets/store/caribbean-orbit.jpg'; // iss065e023015

export const POWER_PHOTOS: Record<string, string> = {
  europe, latam, africa, 'north-america': northAmerica, caribbean,
};

/** The satellite picture for a Power region, by its id or the id its Power Use card belongs to. */
export function powerPhotoFor(...ids: (string | null | undefined)[]): string | undefined {
  for (const id of ids) {
    if (!id) continue;
    const key = Object.keys(POWER_PHOTOS).find((k) => id === k || id.startsWith(`${k}-`) || id.endsWith(`-${k}`));
    if (key) return POWER_PHOTOS[key];
  }
  return undefined;
}
