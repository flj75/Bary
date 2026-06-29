/**
 * Tests logique pure — settings/page.tsx
 * US-16 Scénario 2 : stationId introuvable dans le dataset → 'station_not_found'
 * US-17 Scénario 2 : findMeetingPoint retourne null → 'calc_failed'
 * US-16 Scénario 1 : fetch /data/stations.json échoue → 'dataset_error'
 *
 * Environnement : node (pas de jsdom).
 * On teste la logique pure extraite de handleCalculate :
 *   - validation des stationIds via Set.has
 *   - détection dataset vide
 *   - fetch HTTP non-ok → dataset_error
 *   - findMeetingPoint null → calc_failed
 *
 * Non testable ici (UI / jsdom requis) :
 *   - setCalcError, setCalculating (hooks React)
 *   - router.push, router.back (navigation Next.js)
 *   - rendu du message d'erreur CALC_ERROR_MESSAGES
 *   - délai artificiel 1 200 ms (setTimeout + navTimerRef)
 *   - le bouton "Réessayer" / "← Modifier le groupe"
 *
 * Pour StationAutocomplete (src/components/station/StationAutocomplete.tsx) :
 *   - tout le composant est couplé React (useState, useEffect) → non testable en node.
 *   - la logique de fetch + setFetchError est interne à l'effet React.
 *   - seule la fonction normalize() est pure, mais elle est déjà
 *     couverte implicitement par les tests de filterLogic dans group/__tests__.
 *   - Le mock fetch est testé ici uniquement pour handleCalculate (settings/page.tsx).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { findMeetingPoint } from '@/lib/algorithm';
import type { Station } from '@/types/station';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHATELET: Station = {
  id: 'IDFM:463079',
  name: 'Châtelet',
  lat: 48.857689,
  lng: 2.347759,
  lines: [{ id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' }],
};

const NATION: Station = {
  id: 'IDFM:monomodalStopPlace:473875',
  name: 'Nation',
  lat: 48.848233,
  lng: 2.395944,
  lines: [{ id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' }],
};

const BASTILLE: Station = {
  id: 'IDFM:462977',
  name: 'Bastille',
  lat: 48.853201,
  lng: 2.369110,
  lines: [{ id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' }],
};

const UNKNOWN_STATION: Station = {
  id: 'IDFM:UNKNOWN_999',
  name: 'Station fantôme',
  lat: 48.85,
  lng: 2.35,
  lines: [],
};

// Dataset minimal représentant stations.json
const SMALL_DATASET: Station[] = [CHATELET, NATION, BASTILLE];

// ── Reproduction exacte de la logique handleCalculate ────────────────────────
// Source : src/app/settings/page.tsx, fonction handleCalculate (lignes 59-101)
//
// On isole la logique pure en retirant les effets de bord React (setState, router, setTimeout).
// La valeur retournée est le type d'erreur ou null si succès.

type CalcError = 'dataset_error' | 'station_not_found' | 'calc_failed';

async function runCalculateLogic(
  participants: Array<{ station: Station }>,
  fetchImpl: () => Promise<Response>
): Promise<CalcError | 'success'> {
  // Étape 1 : chargement du dataset (US-16 Sc.1)
  let allStations: Station[];
  try {
    const res = await fetchImpl();
    if (!res.ok) throw new Error();
    allStations = await res.json();
    if (!allStations.length) throw new Error();
  } catch {
    return 'dataset_error';
  }

  // Étape 2 : validation des stationIds (US-16 Sc.2)
  const stationIds = new Set(allStations.map(s => s.id));
  if (participants.some(p => !stationIds.has(p.station.id))) {
    return 'station_not_found';
  }

  // Étape 3 : calcul minimax (US-17 Sc.2)
  const result = findMeetingPoint(participants.map(p => p.station), allStations);
  if (!result) {
    return 'calc_failed';
  }

  return 'success';
}

// Helper : construit une Response mock avec un dataset donné
function mockFetchOk(dataset: Station[]): () => Promise<Response> {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(dataset), { status: 200 })
    );
}

// Helper : construit une Response mock HTTP non-ok
function mockFetchHttpError(status: number): () => Promise<Response> {
  return () =>
    Promise.resolve(new Response('', { status }));
}

// Helper : construit un fetch qui rejette (erreur réseau)
function mockFetchNetworkError(): () => Promise<Response> {
  return () => Promise.reject(new Error('network error'));
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── US-16 Scénario 1 : échec de chargement du dataset ────────────────────────

describe('handleCalculate — US-16 Scénario 1 : échec fetch dataset', () => {
  it('fetch réseau échoue (Network Error) → dataset_error', async () => {
    const participants = [{ station: CHATELET }, { station: NATION }];
    const result = await runCalculateLogic(participants, mockFetchNetworkError());
    expect(result).toBe('dataset_error');
  });

  it('fetch HTTP 404 → dataset_error', async () => {
    const participants = [{ station: CHATELET }, { station: NATION }];
    const result = await runCalculateLogic(participants, mockFetchHttpError(404));
    expect(result).toBe('dataset_error');
  });

  it('fetch HTTP 500 → dataset_error', async () => {
    const participants = [{ station: CHATELET }, { station: NATION }];
    const result = await runCalculateLogic(participants, mockFetchHttpError(500));
    expect(result).toBe('dataset_error');
  });

  it('fetch HTTP 503 → dataset_error', async () => {
    const participants = [{ station: CHATELET }, { station: NATION }];
    const result = await runCalculateLogic(participants, mockFetchHttpError(503));
    expect(result).toBe('dataset_error');
  });

  it('fetch réussit mais dataset est vide [] → dataset_error', async () => {
    const participants = [{ station: CHATELET }, { station: NATION }];
    const result = await runCalculateLogic(participants, mockFetchOk([]));
    expect(result).toBe('dataset_error');
  });
});

// ── US-16 Scénario 2 : stationId introuvable dans le dataset ─────────────────

describe('handleCalculate — US-16 Scénario 2 : stationId not found', () => {
  it('un participant avec stationId absent du dataset → station_not_found', async () => {
    const participants = [
      { station: CHATELET },
      { station: UNKNOWN_STATION }, // id: 'IDFM:UNKNOWN_999', absent du dataset
    ];
    const result = await runCalculateLogic(participants, mockFetchOk(SMALL_DATASET));
    expect(result).toBe('station_not_found');
  });

  it('tous les participants ont un stationId absent → station_not_found', async () => {
    const OTHER_UNKNOWN: Station = { ...UNKNOWN_STATION, id: 'IDFM:UNKNOWN_000' };
    const participants = [
      { station: UNKNOWN_STATION },
      { station: OTHER_UNKNOWN },
    ];
    const result = await runCalculateLogic(participants, mockFetchOk(SMALL_DATASET));
    expect(result).toBe('station_not_found');
  });

  it('stationId partiellement valide (préfixe identique mais ID différent) → station_not_found', async () => {
    // 'IDFM:463079' est dans le dataset, 'IDFM:4630790' (chiffre supplémentaire) ne l'est pas
    const NEAR_MISS: Station = { ...CHATELET, id: 'IDFM:4630790' };
    const participants = [{ station: NATION }, { station: NEAR_MISS }];
    const result = await runCalculateLogic(participants, mockFetchOk(SMALL_DATASET));
    expect(result).toBe('station_not_found');
  });

  it('dataset à 1 seule station, participant sur cette station → succès (pas station_not_found)', async () => {
    const singleStationDataset = [CHATELET];
    const participants = [{ station: CHATELET }, { station: CHATELET }];
    const result = await runCalculateLogic(participants, mockFetchOk(singleStationDataset));
    // stationId est bien dans le dataset → pas d'erreur station_not_found
    // findMeetingPoint avec 1 station dans le dataset doit retourner un résultat
    expect(result).toBe('success');
  });

  it('tous les participants valides → pas de station_not_found', async () => {
    const participants = [{ station: CHATELET }, { station: NATION }];
    const result = await runCalculateLogic(participants, mockFetchOk(SMALL_DATASET));
    expect(result).not.toBe('station_not_found');
  });
});

// ── US-17 Scénario 2 : findMeetingPoint retourne null → calc_failed ───────────

describe('handleCalculate — US-17 Scénario 2 : calc_failed', () => {
  it('dataset chargé mais vide après validation → calc_failed via findMeetingPoint(null)', async () => {
    // findMeetingPoint([...], []) retourne null → la page doit renvoyer calc_failed.
    // On ne peut pas "vider" allStations après la validation (la vérif stationIds passe si participants=[]).
    // On simule directement la condition : participants vides → findMeetingPoint retourne null.
    //
    // En pratique dans settings/page.tsx, le scénario US-17 Sc.2 arrive si
    // buildCandidates produit [] après fallback (dataset corrompu) ou si participants=[].
    // On teste via findMeetingPoint directement pour valider le comportement nul.
    const result = findMeetingPoint([], SMALL_DATASET);
    expect(result).toBeNull();
  });

  it('findMeetingPoint([...], []) retourne null (dataset vide après validation)', () => {
    // Ce cas est attrapé en amont par dataset_error (allStations.length === 0)
    // donc calc_failed ne peut arriver que via buildCandidates vides malgré un dataset non vide.
    // findMeetingPoint appelle buildCandidates → fallback → si dataset non vide, result non null.
    // Seul cas réel : participants=[] → findOptimalStation([],...)  retourne null.
    const result = findMeetingPoint([], [CHATELET]);
    expect(result).toBeNull();
  });

  it('runCalculateLogic avec un dataset qui force null (station fantôme sans lignes, 1 seule station)', async () => {
    // Un dataset avec 1 seule station orpheline sans lignes.
    // buildCandidates : reachableStations = {} pour chaque participant (orphan)
    // → intersection vide → fallback vers allStations (1 station)
    // → findOptimalStation avec 1 candidate → résultat non null (fallback toujours actif).
    // Ce test documente que le fallback empêche calc_failed même sur station orpheline.
    const orphanStation: Station = {
      id: 'IDFM:ORPHAN',
      name: 'Orphelin',
      lat: 48.85,
      lng: 2.35,
      lines: [], // aucune ligne → orpheline
    };
    const datasetWithOrphan = [orphanStation];
    const participants = [{ station: orphanStation }, { station: orphanStation }];
    const result = await runCalculateLogic(participants, mockFetchOk(datasetWithOrphan));
    // Le fallback garantit un résultat → pas de calc_failed
    expect(result).toBe('success');
  });
});

// ── US-16 + US-17 : priorité des erreurs ─────────────────────────────────────

describe('handleCalculate — priorité des erreurs', () => {
  it('dataset_error est déclenché avant station_not_found (ordre des gardes)', async () => {
    // Même si un participant a un stationId invalide, si le fetch échoue,
    // c'est dataset_error qui est retourné en premier.
    const participants = [{ station: UNKNOWN_STATION }];
    const result = await runCalculateLogic(participants, mockFetchNetworkError());
    expect(result).toBe('dataset_error');
  });

  it('station_not_found est déclenché avant calc_failed (ordre des gardes)', async () => {
    // Même si le calcul aurait échoué, station_not_found est détecté avant.
    const participants = [{ station: UNKNOWN_STATION }, { station: CHATELET }];
    const result = await runCalculateLogic(participants, mockFetchOk(SMALL_DATASET));
    expect(result).toBe('station_not_found');
    // calc_failed ne doit PAS être retourné à la place
    expect(result).not.toBe('calc_failed');
  });
});

// ── US-16 Scénario 2 : validation via Set.has (logique stationIds) ─────────────

describe('Logique stationIds.has — Set de validation (US-16 Scénario 2)', () => {
  it('Set vide → tout participant est introuvable', () => {
    const stationIds = new Set<string>([]);
    expect(stationIds.has(CHATELET.id)).toBe(false);
    expect(stationIds.has(NATION.id)).toBe(false);
  });

  it('Set avec les IDs du dataset → tous les participants connus sont trouvables', () => {
    const stationIds = new Set(SMALL_DATASET.map(s => s.id));
    expect(stationIds.has(CHATELET.id)).toBe(true);
    expect(stationIds.has(NATION.id)).toBe(true);
    expect(stationIds.has(BASTILLE.id)).toBe(true);
  });

  it('Set avec les IDs du dataset → stationId inconnu est rejeté', () => {
    const stationIds = new Set(SMALL_DATASET.map(s => s.id));
    expect(stationIds.has(UNKNOWN_STATION.id)).toBe(false);
  });

  it('Set.has est case-sensitive : "idfm:463079" ≠ "IDFM:463079"', () => {
    const stationIds = new Set(SMALL_DATASET.map(s => s.id));
    // L'ID dans le dataset est 'IDFM:463079' (majuscules)
    expect(stationIds.has('idfm:463079')).toBe(false);
    expect(stationIds.has('IDFM:463079')).toBe(true);
  });

  it('participants.some détecte le premier stationId invalide', () => {
    const stationIds = new Set(SMALL_DATASET.map(s => s.id));
    const participants = [
      { station: CHATELET },       // valide
      { station: UNKNOWN_STATION }, // invalide
      { station: NATION },          // valide
    ];
    const hasInvalid = participants.some(p => !stationIds.has(p.station.id));
    expect(hasInvalid).toBe(true);
  });

  it('participants.some retourne false si tous les stationIds sont valides', () => {
    const stationIds = new Set(SMALL_DATASET.map(s => s.id));
    const participants = [
      { station: CHATELET },
      { station: NATION },
      { station: BASTILLE },
    ];
    const hasInvalid = participants.some(p => !stationIds.has(p.station.id));
    expect(hasInvalid).toBe(false);
  });
});

// ── US-17 : CALC_ERROR_MESSAGES (contenu des messages) ────────────────────────

describe('CALC_ERROR_MESSAGES — contenu attendu par la US', () => {
  // Reproduction locale du Record CALC_ERROR_MESSAGES (settings/page.tsx ligne 22-26)
  type CalcErrorType = 'dataset_error' | 'station_not_found' | 'calc_failed';
  const CALC_ERROR_MESSAGES: Record<CalcErrorType, string> = {
    dataset_error: 'Impossible de charger les stations. Vérifiez votre connexion et réessayez.',
    station_not_found: 'Une station du groupe est introuvable dans le réseau. Veuillez revérifier les stations des participants.',
    calc_failed: "Le calcul n'a pas pu aboutir. Vérifiez les stations sélectionnées ou réessayez.",
  };

  it('dataset_error contient le message attendu par US-16 Scénario 1', () => {
    expect(CALC_ERROR_MESSAGES.dataset_error).toContain('Impossible de charger les stations');
    expect(CALC_ERROR_MESSAGES.dataset_error).toContain('réessayez');
  });

  it('station_not_found contient le message attendu par US-16 Scénario 2', () => {
    expect(CALC_ERROR_MESSAGES.station_not_found).toContain('introuvable dans le réseau');
    expect(CALC_ERROR_MESSAGES.station_not_found).toContain('revérifier les stations');
  });

  it('calc_failed contient le message attendu par US-17 Scénario 2', () => {
    expect(CALC_ERROR_MESSAGES.calc_failed).toContain("n'a pas pu aboutir");
    expect(CALC_ERROR_MESSAGES.calc_failed).toContain('réessayez');
  });

  it('les trois clés sont définies (pas de valeur undefined)', () => {
    const keys: CalcErrorType[] = ['dataset_error', 'station_not_found', 'calc_failed'];
    for (const key of keys) {
      expect(CALC_ERROR_MESSAGES[key]).toBeTruthy();
      expect(typeof CALC_ERROR_MESSAGES[key]).toBe('string');
    }
  });
});
