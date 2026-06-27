import type { Station } from '@/types/station';
import type { TravelTimeProvider } from '@/types/algorithm';
import { haversineKm } from './haversine';

// Point de référence tie-breaker : Châtelet (spec 04, Étape 4)
const PARIS_CENTER = { lat: 48.8597, lng: 2.3469 };

// Retourne la station la plus proche de Châtelet parmi les ex-æquo.
// Justification : les stations centrales auront un bassin de lieux plus large en v3.
function tieBreaker(stations: Station[]): Station {
  return stations.reduce((best, s) =>
    haversineKm(s, PARIS_CENTER) < haversineKm(best, PARIS_CENTER) ? s : best
  );
}

export type OptimalResult = {
  station: Station;
  times: Map<Station, number>;
};

// Retourne null si candidates est vide (dataset corrompu — cf. US-17).
export function findOptimalStation(
  participants: Station[],
  candidates: Station[],
  travelTime: TravelTimeProvider
): OptimalResult | null {
  if (candidates.length === 0) return null;

  let bestMaxTime = Infinity;
  let tied: OptimalResult[] = [];

  for (const candidate of candidates) {
    const times = new Map(
      participants.map((p) => [p, travelTime.getMinutes(p, candidate)])
    );
    const maxTime = Math.max(...times.values());

    if (maxTime < bestMaxTime) {
      bestMaxTime = maxTime;
      tied = [{ station: candidate, times }];
    } else if (maxTime === bestMaxTime) {
      tied.push({ station: candidate, times });
    }
  }

  if (tied.length === 1) return tied[0];

  // Tie-breaker : parmi les ex-æquo, retenir la station la plus proche de Châtelet
  const winner = tieBreaker(tied.map((r) => r.station));
  return tied.find((r) => r.station.id === winner.id)!;
}
