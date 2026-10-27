// The Power Use regions as satellite dishes (owner 2026-10-27: Power plans
// wear satellite pictures, a different one per region). Unsplash licence.
import europe from '../assets/store/europe-dish.jpg'; // 1PP0Fc-KSd4, Stellan Johansson
import latam from '../assets/store/latam-dish.jpg'; // L3gq2u2H6Us, Yifu Wu
import africa from '../assets/store/africa-dish.jpg'; // FGvx38Jx4z4, Raychel Sanner
import northAmerica from '../assets/store/north-america-dish.jpg'; // 3YAIvBNlZM4, Stephan Widua
import caribbean from '../assets/store/caribbean-dish.jpg'; // FIdxhTGKmps, Bernd Dittrich

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
