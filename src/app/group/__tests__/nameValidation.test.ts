/**
 * Tests validation du champ Prénom — NewPersonModal (GroupPage)
 * US-18 / BUG-03 (correction : validation à la saisie, caractères interdits)
 *
 * Environnement : node (pas de jsdom).
 * On teste la logique pure extraite de group/page.tsx :
 *   - FORBIDDEN_NAME_CHARS regex
 *   - nameHasError (dérivé : name.trim().length > 0 && FORBIDDEN_NAME_CHARS.test(name))
 *   - canSubmit (dérivé : name.trim().length > 0 && !nameHasError && station !== null)
 *   - round-trip buildShareUrl → parsing pour noms valides (sans caractères interdits)
 *
 * Non testable ici (UI / jsdom requis) :
 *   - Affichage de la bordure rose (border-rose-300) sur l'input
 *   - Affichage du message inline sous le champ
 *   - État disabled du bouton "Ajouter" dans le DOM
 *   - Fermeture de la modale après soumission
 *   - Comportement de StationAutocomplete
 */

import { describe, it, expect } from 'vitest';
import type { Station } from '@/types/station';
import type { Participant } from '@/types/session';
import type { MeetingPointResult } from '@/lib/algorithm';

// ── Reproduction exacte de la logique group/page.tsx ─────────────────────────

const FORBIDDEN_NAME_CHARS = /[,|&=+#?]/;

function nameHasError(name: string): boolean {
  return name.trim().length > 0 && FORBIDDEN_NAME_CHARS.test(name);
}

function canSubmit(name: string, station: Station | null): boolean {
  return name.trim().length > 0 && !nameHasError(name) && station !== null;
}

// ── Reproduction exacte de buildShareUrl (result/page.tsx) ───────────────────

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

function extractRawG(url: string): string {
  const match = url.match(/[?&]g=(.+)$/);
  if (!match) throw new Error('no_g_param');
  return match[1];
}

interface ParsedParticipant {
  name: string;
  stationId: string;
}

function parseGParam(rawG: string): ParsedParticipant[] {
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

function makeParticipant(id: string, name: string, station: Station): Participant {
  return { id, name, station };
}

function makeResult(station: Station): MeetingPointResult {
  return {
    optimal: { station, times: new Map() },
    metrics: {
      avgTime: 10,
      maxTime: 15,
      furthestParticipants: [],
      progressBars: new Map(),
    },
  };
}

// ── 1. Chaque caractère interdit déclenche nameHasError ───────────────────────

describe('BUG-03 correction — FORBIDDEN_NAME_CHARS : chaque caractère interdit', () => {
  const forbidden = [',', '|', '&', '=', '+', '#', '?'];

  for (const char of forbidden) {
    it(`"A${char}B" → nameHasError = true (caractère "${char}")`, () => {
      expect(nameHasError(`A${char}B`)).toBe(true);
    });

    it(`caractère seul "${char}" → nameHasError = true`, () => {
      expect(nameHasError(char)).toBe(true);
    });

    it(`prénom en fin "Alice${char}" → nameHasError = true`, () => {
      expect(nameHasError(`Alice${char}`)).toBe(true);
    });
  }
});

// ── 2. Caractères autorisés ne déclenchent pas nameHasError ──────────────────

describe('BUG-03 correction — caractères autorisés : pas d\'erreur', () => {
  const validNames = [
    'Alice',
    'François',
    'Élodie',
    'Jean-Pierre',
    "O'Brien",
    'Marie Claire',
    'Ñoño',
    'Björk',
    'Αλέξης',
    'a',
    '   Alice   ', // espaces en début/fin — trim valide
    'Anne-Sophie',
    "N'Dour",
  ];

  for (const name of validNames) {
    it(`"${name}" → nameHasError = false`, () => {
      expect(nameHasError(name)).toBe(false);
    });
  }
});

// ── 3. canSubmit false si nameHasError, même avec station non null ─────────────

describe('BUG-03 correction — canSubmit bloqué par nameHasError', () => {
  it('nom invalide + station non null → canSubmit false (virgule)', () => {
    expect(canSubmit('Alice,', CHATELET)).toBe(false);
  });

  it('nom invalide + station non null → canSubmit false (pipe)', () => {
    expect(canSubmit('Alice|Bob', CHATELET)).toBe(false);
  });

  it('nom invalide + station non null → canSubmit false (esperluette)', () => {
    expect(canSubmit('Alice&Bob', CHATELET)).toBe(false);
  });

  it('nom invalide + station non null → canSubmit false (égal)', () => {
    expect(canSubmit('Alice=Bob', CHATELET)).toBe(false);
  });

  it('nom invalide + station non null → canSubmit false (plus)', () => {
    expect(canSubmit('Alice+Bob', CHATELET)).toBe(false);
  });

  it('nom invalide + station non null → canSubmit false (dièse)', () => {
    expect(canSubmit('Alice#Bob', CHATELET)).toBe(false);
  });

  it('nom invalide + station non null → canSubmit false (point d\'interrogation)', () => {
    expect(canSubmit('Alice?', CHATELET)).toBe(false);
  });

  it('nom valide + station non null → canSubmit true', () => {
    expect(canSubmit('Alice', CHATELET)).toBe(true);
  });

  it('nom valide + station null → canSubmit false', () => {
    expect(canSubmit('Alice', null)).toBe(false);
  });
});

// ── 4. Prénom vide : nameHasError false, canSubmit false ──────────────────────

describe('BUG-03 correction — prénom vide : pas d\'erreur affichée, bouton désactivé', () => {
  it('name = "" → nameHasError false (champ vide, pas d\'erreur affichée)', () => {
    expect(nameHasError('')).toBe(false);
  });

  it('name = "   " (espaces seuls) → nameHasError false (trim vide)', () => {
    expect(nameHasError('   ')).toBe(false);
  });

  it('name = "" + station non null → canSubmit false', () => {
    expect(canSubmit('', CHATELET)).toBe(false);
  });

  it('name = "   " (espaces seuls) + station non null → canSubmit false', () => {
    expect(canSubmit('   ', CHATELET)).toBe(false);
  });

  it('name = "" + station null → canSubmit false', () => {
    expect(canSubmit('', null)).toBe(false);
  });
});

// ── 5. Prénom avec un seul caractère interdit ─────────────────────────────────

describe('BUG-03 correction — un seul caractère interdit dans un nom long', () => {
  it('"A," (lettre + virgule) → nameHasError true', () => {
    expect(nameHasError('A,')).toBe(true);
  });

  it('"Jean-Paul,Marie" → nameHasError true', () => {
    expect(nameHasError('Jean-Paul,Marie')).toBe(true);
  });

  it('"Élise?" → nameHasError true (accent + point d\'interrogation)', () => {
    expect(nameHasError('Élise?')).toBe(true);
  });

  it('"François&" → nameHasError true', () => {
    expect(nameHasError('François&')).toBe(true);
  });
});

// ── 6. Correction d'un prénom invalide → erreur disparaît ────────────────────

describe('BUG-03 correction — correction d\'un prénom invalide', () => {
  it('"Alice," → erreur ; après correction "Alice" → pas d\'erreur', () => {
    expect(nameHasError('Alice,')).toBe(true);
    // Simulation : l'utilisateur efface la virgule
    const corrected = 'Alice';
    expect(nameHasError(corrected)).toBe(false);
  });

  it('"Alice," → canSubmit false ; après correction "Alice" + station → canSubmit true', () => {
    expect(canSubmit('Alice,', CHATELET)).toBe(false);
    const corrected = 'Alice';
    expect(canSubmit(corrected, CHATELET)).toBe(true);
  });

  it('correction sans station reste canSubmit false', () => {
    expect(canSubmit('Alice,', null)).toBe(false);
    const corrected = 'Alice';
    expect(canSubmit(corrected, null)).toBe(false);
  });
});

// ── 7. Round-trip buildShareUrl → parsing pour noms valides ──────────────────
// Les noms autorisés par la validation doivent passer le round-trip sans erreur.

describe('BUG-03 correction — round-trip buildShareUrl → parsing pour noms valides', () => {
  it('nom simple "Alice" → round-trip OK', () => {
    const participants = [makeParticipant('p1', 'Alice', CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);
    expect(parsed[0].name).toBe('Alice');
    expect(parsed[0].stationId).toBe('IDFM:463079');
  });

  it('nom avec accent "Élodie" → round-trip OK', () => {
    const participants = [makeParticipant('p1', 'Élodie', CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);
    expect(parsed[0].name).toBe('Élodie');
  });

  it('nom avec tiret "Jean-Pierre" → round-trip OK', () => {
    const participants = [makeParticipant('p1', 'Jean-Pierre', NATION)];
    const result = makeResult(NATION);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);
    expect(parsed[0].name).toBe('Jean-Pierre');
  });

  it("nom avec apostrophe \"O'Brien\" → round-trip OK", () => {
    const participants = [makeParticipant("p1", "O'Brien", CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);
    expect(parsed[0].name).toBe("O'Brien");
  });

  it('nom avec espace "Marie Claire" → round-trip OK', () => {
    const participants = [makeParticipant('p1', 'Marie Claire', CHATELET)];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);
    expect(parsed[0].name).toBe('Marie Claire');
  });

  it('2 participants aux noms valides → round-trip OK', () => {
    const participants = [
      makeParticipant('p1', 'Alice', CHATELET),
      makeParticipant('p2', 'François', NATION),
    ];
    const result = makeResult(CHATELET);
    const url = buildShareUrl(result, participants);
    const rawG = extractRawG(url);
    const parsed = parseGParam(rawG);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Alice');
    expect(parsed[1].name).toBe('François');
  });

  it('nom avec virgule "Alice,Bob" est bloqué par nameHasError (ne peut jamais entrer dans buildShareUrl)', () => {
    // Vérifie que la validation amont empêche ce nom d'atteindre buildShareUrl
    expect(nameHasError('Alice,Bob')).toBe(true);
    expect(canSubmit('Alice,Bob', CHATELET)).toBe(false);
  });
});

// ── 8. Cas limites supplémentaires ────────────────────────────────────────────

describe('BUG-03 correction — cas limites', () => {
  it('nom contenant plusieurs caractères interdits → nameHasError true', () => {
    expect(nameHasError('A,B|C')).toBe(true);
    expect(nameHasError(',|&=+#?')).toBe(true);
  });

  it('caractère interdit en première position → nameHasError true', () => {
    expect(nameHasError(',Alice')).toBe(true);
  });

  it('caractère interdit en milieu de mot → nameHasError true', () => {
    expect(nameHasError('Al#ice')).toBe(true);
  });

  it('nom composé uniquement d\'un caractère interdit → nameHasError true', () => {
    for (const char of [',', '|', '&', '=', '+', '#', '?']) {
      expect(nameHasError(char)).toBe(true);
    }
  });

  it('nom valide mais station null → canSubmit false', () => {
    expect(canSubmit('Alice', null)).toBe(false);
  });

  it('nom invalide ET station null → canSubmit false', () => {
    expect(canSubmit('Alice,', null)).toBe(false);
  });
});
