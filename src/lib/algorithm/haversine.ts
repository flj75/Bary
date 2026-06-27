import type { Station } from '@/types/station';
import type { TravelTimeProvider } from '@/types/algorithm';

export const AVG_SPEED_KMH = 30;
export const OVERHEAD_MIN = 4;
export const TRANSFER_PENALTY = 5;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

export function toMinutes(distanceKm: number, transfers: number): number {
  return Math.round(
    (distanceKm / AVG_SPEED_KMH) * 60 + OVERHEAD_MIN + transfers * TRANSFER_PENALTY
  );
}

export function estimateTransfers(from: Station, to: Station): number {
  const fromLines = new Set(from.lines.map((l) => l.id));
  for (const line of to.lines) {
    if (fromLines.has(line.id)) return 0;
  }
  return 1;
}

export class HaversineTravelTimeProvider implements TravelTimeProvider {
  getMinutes(from: Station, to: Station): number {
    return toMinutes(haversineKm(from, to), estimateTransfers(from, to));
  }
}
