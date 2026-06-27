import type { Station } from '@/types/station';
import type { TravelTimeProvider } from '@/types/algorithm';
import { HaversineTravelTimeProvider } from './haversine';
import { effectiveTravelTime } from './hubs';
import { buildCandidates } from './candidates';
import { findOptimalStation, type OptimalResult } from './minimax';
import { computeDisplayMetrics, type DisplayMetrics } from './metrics';

export type { OptimalResult, DisplayMetrics };

export type MeetingPointResult = {
  optimal: OptimalResult;
  metrics: DisplayMetrics;
};

// Crée un TravelTimeProvider hub-aware en capturant allStations dans une closure.
// C'est ce provider qui est passé à findOptimalStation, qui n'a donc pas besoin
// de connaître la logique des hubs directement.
function makeProvider(allStations: Station[]): TravelTimeProvider {
  const haversine = new HaversineTravelTimeProvider();
  return {
    getMinutes(from: Station, to: Station): number {
      return effectiveTravelTime(from, to, allStations, haversine);
    },
  };
}

// Point d'entrée unique exposé aux pages Next.js.
// Retourne null si le dataset est vide (US-17).
export function findMeetingPoint(
  participants: Station[],
  allStations: Station[]
): MeetingPointResult | null {
  const candidates = buildCandidates(participants, allStations);
  const provider = makeProvider(allStations);
  const optimal = findOptimalStation(participants, candidates, provider);

  if (!optimal) return null;

  return {
    optimal,
    metrics: computeDisplayMetrics(optimal.times),
  };
}
