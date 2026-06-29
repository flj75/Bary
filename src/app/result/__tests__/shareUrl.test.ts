/**
 * Tests logique URL de partage — ResultPage
 * US-18 (reconstruction résultat depuis les query params)
 * BUG-01 (séparateur | non ambigu avec stationIds IDFM:xxx)
 *
 * Environnement : node (pas de jsdom).
 * On teste la logique pure extraite de result/page.tsx :
 *   - buildShareUrl (encode les participants dans le paramètre g)
 *   - parsing côté récepteur (reproduce l'algorithme du useEffect US-18)
 *
 * Non testable ici (UI / jsdom requis) :
 *   - rendu React (écran résultat, écran "Lien invalide", spinner)
 *   - navigation router.replace
 *   - fetch('/data/stations.json')
 *   - navigator.clipboard.writeText
 *   - toast "Lien invalide" sur la HomePage
 *   - useEffect qui détecte ?error=invalid_link
 */

import { describe, it, expect } from 'vitest';
import type { Station } from '@/types/station';
import type { Participant } from '@/types/session';
import type { MeetingPointResult } from '@/lib/algorithm';

// ── Reproduction exacte de buildShareUrl (result/page.tsx) ───────────────────
// On remplace window.location.origin par une constante pour les tests node.

const ORIGIN = 'https://bary.app';

function buildShareUrl(result: MeetingPointResult, participants: Participant[]): string {
  const s = encodeURIComponent(result.optimal.station.id);
  const encodeNameSafe = (name: string) =>
    encodeURIComponent(name).replace(/%7C/gi, '%257C');
  const g = participants
    .map(p => `${encodeNameSafe(p.name)}|${encodeURIComponent(p.station.id)}`)
    .join(',');
  return `${ORIGIN}/result?s=${s}&g=${g}`;
}

// ── Reproduction exacte du parsing côté récepteur (result/page.tsx useEffect) ─
// On simule URLSearchParams.get('g') qui décode automatiquement la valeur.

interface ParsedParticipant {
  name: string;
  stationId: string;
}

function parseGParam(rawG: string): ParsedParticipant[] {
  // Simule ce que URLSearchParams.get retourne : les %xx sont décodés une fois.
  // Dans le vrai code, URLSearchParams.get est appelé sur window.location.search
  // qui contient la valeur brute. On reproduit ce comportement ici.
  const g = decodeURIComponent(rawG);
  return g.split(',').map((entry) => {
    const sepIdx = entry.indexOf('|');
    if (sepIdx === -1) throw new Error('no_separator');
    const name = decodeURIComponent(decodeURIComponent(entry.slice(0, sepIdx)));
    const stationId = decodeURIComponent(entry.slice(sepIdx + 1));
    if (!name || !stationId) throw new Error('empty_field');
    return { name, stationId };
  });
}

/**
 * Extrait le paramètre `g` brut depuis une URL construite par buildShareUrl.
 * On récupère la partie après `g=` telle quelle dans l'URL (avant tout décodage).
 * URLSearchParams.get applique un premier decodeURIComponent automatiquement,
 * c'est pourquoi parseGParam commence par décoder une fois.
 *
 * Note : buildShareUrl n'encode PAS globalement la valeur de g= — il place
 * les entrées encodées directement dans l'URL. Le rawG extrait est donc déjà
 * à l'état "dans l'URL" (ex: Jean%257CPierre|IDFM%3AmonomodalStopPlace%3A473875).
 */
function extractRawG(url: string): string {
  const match = url.match(/[?&]g=(.+)$/);
  if (!match) throw new Error('no_g_param');
  return match[1];
}

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

const SAINT_LAZARE: Station = {
  id: 'IDFM:462972',
  name: 'Saint-Lazare',
  lat: 48.875661,
  lng: 2.324026,
  lines: [{ id: 'IDFM:C01373', name: '3', mode: 'metro', color: '#6e6e00' }],
};

function makeParticipant(id: string, name: string, station: Station): Participant {
  return { id, name, station };
}

function makeResult(station: Station): MeetingPointResult {
  return {
    optimal: {
      station,
      times: new Map(),
    },
    metrics: {
      avgTime: 10,
      maxTime: 15,
      furthestParticipants: [],
      progressBars: new Map(),
    },
  };
}

// ── Cas 1 : round-trip nominal avec stationId IDFM (BUG-01) ──────────────────

describe('buildShareUrl + parsing — round-trip stationId IDFM (BUG-01)', () => {
  it('stationId contenant ":" est préservé après encode→parse', () => {
    const participants = [
      makeParticipant('p1', 'Alice', CHATELET),
      makeParticipant('p2', 'Bob', NATION),
    ];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed[0].stationId).toBe('IDFM:463079');
    expect(parsed[1].stationId).toBe('IDFM:monomodalStopPlace:473875');
  });

  it('les noms sont préservés après encode→parse', () => {
    const participants = [
      makeParticipant('p1', 'Alice', CHATELET),
      makeParticipant('p2', 'Bob', NATION),
    ];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed[0].name).toBe('Alice');
    expect(parsed[1].name).toBe('Bob');
  });

  it('stationId avec plusieurs ":" (Nation : IDFM:monomodalStopPlace:473875) est préservé', () => {
    const participants = [makeParticipant('p1', 'Alice', NATION)];
    const result = makeResult(NATION);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed[0].stationId).toBe('IDFM:monomodalStopPlace:473875');
  });
});

// ── Cas 2 : nom contenant "|" (double-encodage BUG-01) ───────────────────────

describe('buildShareUrl + parsing — nom contenant "|"', () => {
  it('nom "Alice|Bob" est préservé après double-encodage→double-décodage', () => {
    const participants = [makeParticipant('p1', 'Alice|Bob', CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed[0].name).toBe('Alice|Bob');
    expect(parsed[0].stationId).toBe('IDFM:463079');
  });

  it('le split sur indexOf("|") coupe sur le premier "|" même si le nom en contient un', () => {
    // Invariant : dans la chaîne brute telle que dans l'URL,
    // le "|" du nom est double-encodé en "%257C",
    // après un seul decodeURIComponent (ce que URLSearchParams.get fait),
    // le "|" du nom est encore "%7C" (pas un vrai "|"), donc indexOf("|") trouve
    // uniquement le séparateur nom/stationId.
    const participants = [makeParticipant('p1', 'Jean|Pierre', NATION)];
    const result = makeResult(NATION);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);

    // Après un seul decodeURIComponent (simule URLSearchParams.get),
    // la partie nom contient encore "%7C" (pas "|"), et le séparateur est le seul "|".
    const afterFirstDecode = decodeURIComponent(rawG);
    const entries = afterFirstDecode.split(',');
    const sepIdx = entries[0].indexOf('|');

    // L'invariant clé : la partie nom (avant le séparateur) contient encore %7C —
    // le "|" du nom n'a pas encore été exposé comme "|" brut à ce stade.
    const namePart = entries[0].slice(0, sepIdx);
    expect(namePart).toContain('%7C');

    // Et la partie stationId (après le séparateur) est le stationId tel que
    // URLSearchParams.get le retourne : décodé une fois (donc ":" et non "%3A").
    const stationPart = entries[0].slice(sepIdx + 1);
    expect(stationPart).toBe('IDFM:monomodalStopPlace:473875');
  });

  it('nom "A|B|C" (plusieurs pipes) est préservé', () => {
    const participants = [makeParticipant('p1', 'A|B|C', SAINT_LAZARE)];
    const result = makeResult(SAINT_LAZARE);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed[0].name).toBe('A|B|C');
    expect(parsed[0].stationId).toBe('IDFM:462972');
  });
});

// ── Cas 3 : parsing robuste — separateur manquant ────────────────────────────

describe('parsing — entrée sans "|" → erreur', () => {
  it('entrée "AliceIDFM:463079" sans séparateur → lève une erreur', () => {
    // Simule rawG tel qu'il serait dans l'URL (déjà encodé une fois pour la query string)
    const rawG = encodeURIComponent('AliceIDFM:463079');
    expect(() => parseGParam(rawG)).toThrow();
  });

  it('entrée complètement vide → lève une erreur', () => {
    // Une entrée vide n'a pas de "|" donc indexOf retourne -1
    const rawG = encodeURIComponent('');
    expect(() => parseGParam(rawG)).toThrow();
  });
});

// ── Cas 4 : parsing — nom vide ────────────────────────────────────────────────

describe('parsing — nom vide → erreur', () => {
  it('"|IDFM%3A463079" (nom vide, séparateur présent) → lève une erreur', () => {
    // On construit un rawG comme buildShareUrl le ferait pour un nom vide :
    // encodeNameSafe('') = '' , encodeURIComponent('IDFM:463079') = 'IDFM%3A463079'
    // entry brute dans l'URL : |IDFM%3A463079
    const entry = `|${encodeURIComponent('IDFM:463079')}`;
    // Ce rawG est la valeur telle quelle dans l'URL (pas d'encodage global supplémentaire)
    expect(() => parseGParam(entry)).toThrow();
  });
});

// ── Cas 5 : parsing — stationId vide ─────────────────────────────────────────

describe('parsing — stationId vide → erreur', () => {
  it('"Alice|" (stationId vide) → lève une erreur', () => {
    // entry brute dans l'URL : Alice| (nom ok, stationId vide)
    const entry = `${encodeURIComponent('Alice')}|`;
    expect(() => parseGParam(entry)).toThrow();
  });
});

// ── Cas 6 : participant avec stationId absent du dataset → erreur ─────────────

describe('parsing + stationMap lookup — stationId absent du dataset', () => {
  it('stationId inconnu → erreur levée lors du lookup', () => {
    const stationMap = new Map<string, Station>([
      ['IDFM:463079', CHATELET],
    ]);

    // Simule le code du useEffect : stationMap.get(stationId) suivi d'un guard
    function lookupStation(stationId: string): Station {
      const station = stationMap.get(stationId);
      if (!station) throw new Error('station_not_found');
      return station;
    }

    expect(() => lookupStation('IDFM:INCONNU_999')).toThrow('station_not_found');
  });

  it('stationId connu → retourne la station correcte', () => {
    const stationMap = new Map<string, Station>([
      ['IDFM:463079', CHATELET],
      ['IDFM:monomodalStopPlace:473875', NATION],
    ]);

    const station = stationMap.get('IDFM:463079');
    expect(station).toBeDefined();
    expect(station?.name).toBe('Châtelet');
  });
});

// ── Cas 7 : round-trip complet à 2 participants ───────────────────────────────

describe('round-trip complet — 2 participants (US-18 Scénario 1)', () => {
  it('buildShareUrl → parse → noms et stationIds cohérents', () => {
    const participants = [
      makeParticipant('p1', 'Alice', CHATELET),
      makeParticipant('p2', 'Bob', NATION),
    ];
    const result = makeResult(CHATELET);

    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Alice');
    expect(parsed[0].stationId).toBe('IDFM:463079');
    expect(parsed[1].name).toBe('Bob');
    expect(parsed[1].stationId).toBe('IDFM:monomodalStopPlace:473875');
  });

  it('buildShareUrl → parse → 3 participants avec stationIds IDFM variés', () => {
    const participants = [
      makeParticipant('p1', 'Alice', CHATELET),
      makeParticipant('p2', 'Bob', NATION),
      makeParticipant('p3', 'Carol', SAINT_LAZARE),
    ];
    const result = makeResult(SAINT_LAZARE);

    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed).toHaveLength(3);
    expect(parsed[2].name).toBe('Carol');
    expect(parsed[2].stationId).toBe('IDFM:462972');
  });

  it('le paramètre s contient le stationId de la station résultat (décodable)', () => {
    const participants = [
      makeParticipant('p1', 'Alice', CHATELET),
      makeParticipant('p2', 'Bob', NATION),
    ];
    const result = makeResult(CHATELET);

    const url = buildShareUrl(result, participants);
    const matchS = url.match(/[?&]s=([^&]+)/);
    expect(matchS).toBeTruthy();
    const decodedS = decodeURIComponent(matchS![1]);
    expect(decodedS).toBe('IDFM:463079');
  });
});

// ── Cas 8 : noms avec caractères spéciaux (accents, espaces) ─────────────────

describe('buildShareUrl + parsing — noms avec caractères spéciaux', () => {
  it('nom avec accent "Élodie" est préservé', () => {
    const participants = [makeParticipant('p1', 'Élodie', CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed[0].name).toBe('Élodie');
  });

  it('nom avec espace "Jean Pierre" est préservé', () => {
    const participants = [makeParticipant('p1', 'Jean Pierre', NATION)];
    const result = makeResult(NATION);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);

    expect(parsed[0].name).toBe('Jean Pierre');
  });
});

// ── BUG-03 : nom contenant "," casse le split(',') sur g ─────────────────────
// buildShareUrl encode ',' en '%2C' dans le nom.
// URLSearchParams.get décode '%2C' → ',' avant que le parsing ne commence.
// Le split(',') sur g interprète alors ce ',' comme séparateur d'entrées,
// produisant deux morceaux au lieu d'un seul — cassant le parsing.

describe('BUG-03 : nom contenant "," casse le parsing (virgule non protégée)', () => {
  it('nom "Alice,Bob" — le split sur "," produit une entrée sans "|" → erreur levée', () => {
    const participants = [makeParticipant('p1', 'Alice,Bob', CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);

    // Ce test DOCUMENTE le bug : avec le code actuel, parseGParam lève une erreur
    // car 'Alice' (première partie après split(',')) n'a pas de '|'.
    // Le comportement attendu serait que le nom 'Alice,Bob' soit préservé.
    expect(() => parseGParam(rawG)).toThrow();
  });

  it('nom "Alice,Bob" — après le premier decode, le "," est exposé dans la chaîne g', () => {
    const participants = [makeParticipant('p1', 'Alice,Bob', CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);

    // Après le premier decodeURIComponent (ce que URLSearchParams.get fait),
    // le ',' du nom est décodé, rendant la chaîne ambiguë pour split(',').
    const afterFirstDecode = decodeURIComponent(rawG);
    const parts = afterFirstDecode.split(',');
    // Avec le bug : 2 parties au lieu de 1 ("Alice" et "Bob|IDFM:463079")
    expect(parts.length).toBeGreaterThan(1);
    // La première partie n'a pas de '|' → le parsing plante
    expect(parts[0].includes('|')).toBe(false);
  });
});
