// The Power Use regions (owner 2026-10-28): a landmark of the region with
// something that says speed, and a satellite dish for Africa. Unsplash licence.
import europe from '../assets/store/europe-power.jpg'; // CQzjHau2ZIU, Denis Denis: Eiffel Tower, Paris, a train crossing below
import latam from '../assets/store/latam-power.jpg'; // RGiXPGlt1XA, Krys Amon: Rio at night
import africa from '../assets/store/africa-power.jpg'; // 5sOvIR6ySaU, Hassan Sajjad: satellite dish at sunset
import northAmerica from '../assets/store/north-america-power.jpg'; // afybtLpD2Ok, Zac Ong: New York, traffic trails
import caribbean from '../assets/store/caribbean-power.jpg'; // GAtatY-9Vl8, Rafael Peier: Havana, car in motion

export const POWER_PHOTOS: Record<string, string> = {
  europe, latam, africa, 'north-america': northAmerica, caribbean,
};

/** The Power picture for a region, by its id or the id its Power Use card belongs to. */
export function powerPhotoFor(...ids: (string | null | undefined)[]): string | undefined {
  for (const id of ids) {
    if (!id) continue;
    const key = Object.keys(POWER_PHOTOS).find((k) => id === k || id.startsWith(`${k}-`) || id.endsWith(`-${k}`));
    if (key) return POWER_PHOTOS[key];
  }
  return undefined;
}
