import type { Station } from '@/types/station';

// O(S²) où S = nombre de stations (~803). Appelée une fois par participant.
// Pour 10 participants : ~6.5M opérations, < 50 ms côté client.
export function getReachableStations(
  departure: Station,
  allStations: Station[]
): Set<string> {
  const reachable = new Set<string>();
  const departureLineIds = new Set(departure.lines.map((l) => l.id));

  for (const station of allStations) {
    const stationLineIds = station.lines.map((l) => l.id);

    // 0 correspondance : au moins une ligne en commun avec la station de départ
    const isDirect = stationLineIds.some((id) => departureLineIds.has(id));
    if (isDirect) {
      reachable.add(station.id);
      continue;
    }

    // 1 correspondance : une station intermédiaire partage une ligne avec le départ
    // ET une ligne avec le candidat
    const isOneTransfer = allStations.some((intermediate) => {
      const intermediateLineIds = new Set(intermediate.lines.map((l) => l.id));
      const connectsFromDeparture = intermediate.lines.some((l) =>
        departureLineIds.has(l.id)
      );
      const connectsToCandidate = stationLineIds.some((id) =>
        intermediateLineIds.has(id)
      );
      return connectsFromDeparture && connectsToCandidate;
    });

    if (isOneTransfer) reachable.add(station.id);
  }

  return reachable;
}

export function buildCandidates(
  participants: Station[],
  allStations: Station[]
): Station[] {
  const reachSets = participants.map((p) => getReachableStations(p, allStations));

  // Intersection : ne garder que les stations accessibles par TOUS les participants
  const intersection = allStations.filter((s) =>
    reachSets.every((reach) => reach.has(s.id))
  );

  // Fallback si l'intersection est vide (participants sur des réseaux très disjoints,
  // ex. un participant en grande banlieue sans correspondance avec le reste du groupe).
  // On retourne allStations plutôt que null : le minimax trouvera alors le meilleur
  // compromis global, même si certains temps de trajet sont très asymétriques.
  return intersection.length > 0 ? intersection : allStations;
}
