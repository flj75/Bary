import type { Station } from '@/types/station';
import type { CorrespondanceHub, TravelTimeProvider } from '@/types/algorithm';

// IDs vérifiés dans public/data/stations.json le 2026-06-24.
// Ces IDs proviennent de l'API arrets-lignes IDFM (quais individuels),
// ils diffèrent des parent_station GTFS documentés dans specs/04-algorithm.md.
//
// Saint-Lazare apparaît en 3 entrées distinctes dans le dataset (~380 m d'écart
// entre les extrêmes) : c'est le cas typique pour lequel ce système de hubs existe.
export const PARIS_HUBS: CorrespondanceHub[] = [
  {
    name: "Châtelet — Les Halles",
    stationIds: [
      "IDFM:463079",                      // Châtelet (M1, M4, M7, M11, M14)
      "IDFM:463208",                      // Les Halles (M4)
      "IDFM:monomodalStopPlace:45102",    // Châtelet - Les Halles (RER A, B, D)
    ],
    walkingTimeMinutes: 5,
  },
  {
    name: "Auber — Havre-Caumartin",
    stationIds: [
      "IDFM:monomodalStopPlace:45873",    // Auber (RER A)
      "IDFM:463188",                      // Havre-Caumartin (M3, M9)
    ],
    walkingTimeMinutes: 3,
  },
  {
    name: "Saint-Lazare — Haussmann-Saint-Lazare",
    stationIds: [
      "IDFM:462972",                      // Saint-Lazare (M3, M13, M14)
      "IDFM:21964",                       // Saint-Lazare (M12)
      "IDFM:462971",                      // Saint-Lazare (M3 — entrée distincte)
      "IDFM:monomodalStopPlace:58718",    // Haussmann Saint-Lazare (RER E)
    ],
    walkingTimeMinutes: 5,
  },
  {
    name: "Gare du Nord — Magenta",
    stationIds: [
      "IDFM:monomodalStopPlace:462394",   // Gare du Nord (M4, M5, RER B, D)
      "IDFM:monomodalStopPlace:58572",    // Magenta (RER E)
    ],
    walkingTimeMinutes: 4,
  },
  {
    name: "Opéra — Chaussée d'Antin-La Fayette",
    stationIds: [
      "IDFM:463245",                      // Opéra (M3, M7, M8)
      "IDFM:463145",                      // Chaussée d'Antin - La Fayette (M7, M9)
    ],
    walkingTimeMinutes: 3,
  },
];

export function getHubForStation(stationId: string): CorrespondanceHub | null {
  return PARIS_HUBS.find((hub) => hub.stationIds.includes(stationId)) ?? null;
}

export function effectiveTravelTime(
  from: Station,
  to: Station,
  allStations: Station[],
  provider: TravelTimeProvider
): number {
  const toHub = getHubForStation(to.id);
  const fromHub = getHubForStation(from.id);

  // Même hub : trajet à pied uniquement
  if (toHub && fromHub && toHub.name === fromHub.name) {
    return toHub.walkingTimeMinutes;
  }

  // Station candidate dans un hub : tester toutes les entrées du hub,
  // retenir le chemin le plus court (transport vers n'importe quelle entrée + marche interne)
  if (toHub) {
    const hubStations = allStations.filter((s) => toHub.stationIds.includes(s.id));
    const times = hubStations.map((entry) => {
      const t = provider.getMinutes(from, entry);
      return entry.id === to.id ? t : t + toHub.walkingTimeMinutes;
    });
    return Math.min(...times);
  }

  // Cas standard
  return provider.getMinutes(from, to);
}
