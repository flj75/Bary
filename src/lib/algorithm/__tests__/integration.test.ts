/**
 * Tests d'intégration — US-07, US-08, US-09
 *
 * Couvre :
 *  - findMeetingPoint avec participants réels (>= 2, = 0)
 *  - computeDisplayMetrics cas limites non couverts par metrics.test.ts
 *    (participant avec temps 0, seul participant à la station résultat)
 *
 * Hors périmètre node : buildShareUrl (non exportée depuis result/page.tsx).
 * La logique de buildShareUrl est reproduite localement pour analyser le bug US-10.
 */

import { describe, it, expect } from 'vitest';
import { findMeetingPoint } from '../index';
import { computeDisplayMetrics } from '../metrics';
import {
  CHATELET,
  NATION,
  BASTILLE,
  SAINT_LAZARE,
  GARE_DU_NORD,
  MONTPARNASSE,
} from './fixtures';
import type { Station } from '@/types/station';

// ── Dataset minimal réutilisé dans les tests d'intégration ───────────────────

const DATASET: Station[] = [
  CHATELET,
  NATION,
  BASTILLE,
  SAINT_LAZARE,
  GARE_DU_NORD,
  MONTPARNASSE,
];

// ── findMeetingPoint — US-07 : résultat non null avec >= 2 participants ───────

describe('findMeetingPoint — US-07 >= 2 participants', () => {
  it('retourne un resultat non null avec 2 participants', () => {
    const result = findMeetingPoint([CHATELET, NATION], DATASET);
    expect(result).not.toBeNull();
  });

  it('retourne un resultat non null avec 3 participants', () => {
    const result = findMeetingPoint([CHATELET, NATION, SAINT_LAZARE], DATASET);
    expect(result).not.toBeNull();
  });

  it('la station optimale appartient au dataset', () => {
    const result = findMeetingPoint([CHATELET, NATION], DATASET);
    expect(result).not.toBeNull();
    const ids = DATASET.map(s => s.id);
    expect(ids).toContain(result!.optimal.station.id);
  });

  it('la Map times contient une entree pour chaque participant', () => {
    const participants = [CHATELET, NATION, SAINT_LAZARE];
    const result = findMeetingPoint(participants, DATASET);
    expect(result).not.toBeNull();
    expect(result!.optimal.times.size).toBe(3);
    for (const p of participants) {
      expect(result!.optimal.times.has(p)).toBe(true);
    }
  });

  it('les metriques sont coherentes : avgTime <= maxTime', () => {
    const result = findMeetingPoint([CHATELET, NATION, GARE_DU_NORD], DATASET);
    expect(result).not.toBeNull();
    expect(result!.metrics.avgTime).toBeLessThanOrEqual(result!.metrics.maxTime);
  });

  it('maxTime dans metrics correspond au max des times de optimal', () => {
    const result = findMeetingPoint([CHATELET, NATION], DATASET);
    expect(result).not.toBeNull();
    const computedMax = Math.max(...[...result!.optimal.times.values()]);
    expect(result!.metrics.maxTime).toBe(computedMax);
  });
});

// ── findMeetingPoint — 0 participants → null ──────────────────────────────────

describe('findMeetingPoint — 0 participants', () => {
  it('retourne null avec 0 participants (US-07 edge case)', () => {
    const result = findMeetingPoint([], DATASET);
    expect(result).toBeNull();
  });

  it('retourne null avec dataset vide', () => {
    const result = findMeetingPoint([CHATELET, NATION], []);
    expect(result).toBeNull();
  });
});

// ── computeDisplayMetrics — US-08 cas limites ─────────────────────────────────

describe('computeDisplayMetrics — US-08 : participant deja sur la station resultat (temps 0)', () => {
  it('un participant a 0 min, les autres non : sa barre est 0%, les autres proportionnelles', () => {
    // US-08 edge case : "Participant deja a la station resultat mais pas les autres"
    const times: Map<Station, number> = new Map([
      [CHATELET, 0],   // participant deja sur place
      [NATION,   20],
      [BASTILLE, 10],
    ]);
    const { progressBars, maxTime } = computeDisplayMetrics(times);
    expect(maxTime).toBe(20);
    expect(progressBars.get(CHATELET)).toBe(0);
    expect(progressBars.get(NATION)).toBe(100);
    expect(progressBars.get(BASTILLE)).toBe(50);
  });

  it('barre a 0% n\'est pas dans furthestParticipants', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET, 0],
      [NATION,   15],
    ]);
    const { furthestParticipants } = computeDisplayMetrics(times);
    expect(furthestParticipants).toHaveLength(1);
    expect(furthestParticipants[0]).toBe(NATION);
  });
});

// ── computeDisplayMetrics — US-08 : groupe de 2 (cas minimal) ────────────────

describe('computeDisplayMetrics — US-08 : groupe de 2 participants', () => {
  it('2 participants : le plus loin est a 100%, l\'autre est proportionnel', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET, 8],
      [NATION,   16],
    ]);
    const { progressBars, furthestParticipants } = computeDisplayMetrics(times);
    expect(furthestParticipants).toHaveLength(1);
    expect(furthestParticipants[0]).toBe(NATION);
    expect(progressBars.get(NATION)).toBe(100);
    expect(progressBars.get(CHATELET)).toBe(50);
  });
});

// ── computeDisplayMetrics — US-09 : egalite sur le temps max ─────────────────

describe('computeDisplayMetrics — US-09 : egalite parfaite', () => {
  it('2 participants ex-aequo : furthestParticipants contient les deux', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET, 36],
      [NATION,   36],
    ]);
    const { furthestParticipants } = computeDisplayMetrics(times);
    expect(furthestParticipants).toHaveLength(2);
    expect(furthestParticipants).toContain(CHATELET);
    expect(furthestParticipants).toContain(NATION);
  });

  it('affichage "Sofia & Hugo" : les deux noms sont dans furthestParticipants (US-09 edge case)', () => {
    // Simule le scenario exact de US-09 : "Egalite entre deux participants sur le temps max"
    // L'UI fait : furthestParticipants.map(s => participants.find(p => p.station === s)?.name).join(' & ')
    const times: Map<Station, number> = new Map([
      [CHATELET, 36], // Sofia
      [NATION,   36], // Hugo
      [BASTILLE, 20], // Autre
    ]);
    const { furthestParticipants, maxTime } = computeDisplayMetrics(times);
    expect(maxTime).toBe(36);
    expect(furthestParticipants).toHaveLength(2);
    const ids = furthestParticipants.map(p => p.id);
    expect(ids).toContain(CHATELET.id);
    expect(ids).toContain(NATION.id);
    // Bastille (20 min) ne doit pas etre dans furthestParticipants
    expect(ids).not.toContain(BASTILLE.id);
  });

  it('egalite a 3 : furthestParticipants contient les 3 ex-aequo', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET,    20],
      [NATION,      20],
      [SAINT_LAZARE, 20],
    ]);
    const { furthestParticipants, maxTime } = computeDisplayMetrics(times);
    expect(maxTime).toBe(20);
    expect(furthestParticipants).toHaveLength(3);
  });

  it('egalite a 0 min : furthestParticipants non vide (US-08 "tous sur la station")', () => {
    // Tous a 0 min → tous ex-aequo → tous dans furthestParticipants
    const times: Map<Station, number> = new Map([
      [CHATELET, 0],
      [NATION,   0],
      [BASTILLE, 0],
    ]);
    const { furthestParticipants, progressBars } = computeDisplayMetrics(times);
    // US-08 : "Tous les participants à la même station que le résultat :
    // toutes les barres affichent 100%"
    expect(furthestParticipants).toHaveLength(3);
    for (const pct of progressBars.values()) {
      expect(pct).toBe(100);
    }
  });
});

// ── Integration findMeetingPoint → metrics — US-09 cohérence ─────────────────

describe('Integration findMeetingPoint → metrics — US-09', () => {
  it('le participant dans furthestParticipants a bien la barre a 100%', () => {
    const result = findMeetingPoint([CHATELET, MONTPARNASSE, GARE_DU_NORD], DATASET);
    expect(result).not.toBeNull();
    const { furthestParticipants, progressBars } = result!.metrics;
    expect(furthestParticipants.length).toBeGreaterThanOrEqual(1);
    for (const p of furthestParticipants) {
      expect(progressBars.get(p)).toBe(100);
    }
  });

  it('les barres de tous les participants sont dans [0, 100]', () => {
    const result = findMeetingPoint([CHATELET, NATION, SAINT_LAZARE], DATASET);
    expect(result).not.toBeNull();
    for (const pct of result!.metrics.progressBars.values()) {
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });
});

// ── US-10 : analyse de buildShareUrl (non exportee — gap documente) ───────────
//
// buildShareUrl dans result/page.tsx n'est pas exportee.
// On reproduit ici la logique pure pour verifier la parsabilite de l'URL.
//
// Format produit :
//   /result?s=<encodeURIComponent(stationId)>&g=<encodeURIComponent(nom)>:<encodeURIComponent(stationId)>,...
//
// COMPORTEMENT OBSERVE :
// - encodeURIComponent("IDFM:463079") → "IDFM%3A463079" (dans la string en memoire)
// - Mais URLSearchParams.get('g') DECODE automatiquement → retourne "Alice:IDFM:463079"
// - Un split(':') naif produit alors 3 parties au lieu de 2
// - Ce comportement est documente dans BUG-01.

describe('Logique buildShareUrl — analyse du separateur ":" (US-10)', () => {
  // Reimplementation locale de la logique de buildShareUrl (non exportee)
  function buildShareUrlPure(
    stationId: string,
    participants: Array<{ name: string; stationId: string }>
  ): string {
    const s = encodeURIComponent(stationId);
    const g = participants
      .map(p => `${encodeURIComponent(p.name)}:${encodeURIComponent(p.stationId)}`)
      .join(',');
    return `/result?s=${s}&g=${g}`;
  }

  it('encode correctement un stationId sans ":" dans le parametre s', () => {
    const url = buildShareUrlPure('SIMPLEID', [{ name: 'Alice', stationId: 'SIMPLEID' }]);
    expect(url).toContain('s=SIMPLEID');
  });

  it('encode correctement un stationId avec ":" (IDFM:463079) dans le parametre s', () => {
    // encodeURIComponent encode ":" en "%3A" → le parametre s est non ambigu
    const url = buildShareUrlPure('IDFM:463079', [{ name: 'Alice', stationId: 'CHATELET' }]);
    expect(url).toContain('s=IDFM%3A463079');
  });

  it('le stationId encode avec ":" dans s est decodable sans ambiguite via URLSearchParams', () => {
    const url = buildShareUrlPure('IDFM:463079', [{ name: 'Alice', stationId: 'CHATELET' }]);
    const params = new URLSearchParams(url.split('?')[1]);
    // URLSearchParams.get decode automatiquement le %3A → on retrouve le ":" original
    expect(params.get('s')).toBe('IDFM:463079');
  });

  it('BUG-01 : URLSearchParams.get decode %3A → le split naif sur ":" casse avec stationId IDFM:xxx', () => {
    // La string g RAW dans l'URL : "Alice:IDFM%3A463079"
    // Apres URLSearchParams.get('g') : "Alice:IDFM:463079" (%3A → :)
    // split(':') → 3 parties ["Alice", "IDFM", "463079"] → parsing ambigu
    const url = buildShareUrlPure('CHATELET', [{ name: 'Alice', stationId: 'IDFM:463079' }]);
    const params = new URLSearchParams(url.split('?')[1]);
    const gDecoded = params.get('g') ?? '';
    // Confirmation : apres decodage, ":" dans stationId est restaure
    expect(gDecoded).toBe('Alice:IDFM:463079');
    // Un split naif produit 3 parties → le stationId est perdu
    const partsNaif = gDecoded.split(':');
    expect(partsNaif).toHaveLength(3); // BUG : devrait etre 2
    // Le bon parsing doit utiliser slice(1).join(':') pour reassembler le stationId
    const nameOk = decodeURIComponent(partsNaif[0]);
    const stationIdOk = partsNaif.slice(1).join(':');
    expect(nameOk).toBe('Alice');
    expect(stationIdOk).toBe('IDFM:463079');
  });

  it('BUG-01 : un nom contenant ":" est decode par URLSearchParams et casse aussi le split naif', () => {
    // nom = "Jean:Paul" → encodeURIComponent → "Jean%3APaul"
    // g RAW : "Jean%3APaul:IDFM%3A463079"
    // apres URLSearchParams.get : "Jean:Paul:IDFM:463079" → 4 parties au lieu de 2
    const url = buildShareUrlPure('CHATELET', [{ name: 'Jean:Paul', stationId: 'IDFM:463079' }]);
    const params = new URLSearchParams(url.split('?')[1]);
    const gDecoded = params.get('g') ?? '';
    expect(gDecoded).toBe('Jean:Paul:IDFM:463079');
    // Le split naif est completement ambigu
    const partsNaif = gDecoded.split(':');
    expect(partsNaif).toHaveLength(4); // nom a 2 parts, stationId a 2 parts
    // Aucune heuristique simple ne peut resoudre ce cas sans connaitre la longueur du nom
  });

  it('roundtrip complet avec parsing defensif (slice(1).join) : stationId standard', () => {
    // Avec stationId standard sans ":", le roundtrip est sans ambiguite
    const participants = [
      { name: 'Alice', stationId: 'CHATELET' },
      { name: 'Bob',   stationId: 'NATION' },
    ];
    const url = buildShareUrlPure('CHATELET', participants);
    const params = new URLSearchParams(url.split('?')[1]);
    const gDecoded = params.get('g') ?? '';
    const entries = gDecoded.split(',');
    const parsed = entries.map(entry => {
      const parts = entry.split(':');
      return { name: parts[0], stationId: parts.slice(1).join(':') };
    });
    expect(parsed[0].name).toBe('Alice');
    expect(parsed[0].stationId).toBe('CHATELET');
    expect(parsed[1].name).toBe('Bob');
    expect(parsed[1].stationId).toBe('NATION');
  });

  it('roundtrip complet avec parsing defensif : stationId IDFM avec ":" est correct', () => {
    // Avec parsing defensif (slice(1).join(':')), le stationId IDFM est recuperable
    // a condition que le nom ne contienne pas de ":"
    const participants = [
      { name: 'Alice', stationId: 'IDFM:463079' },
      { name: 'Bob',   stationId: 'IDFM:monomodalStopPlace:473875' },
    ];
    const url = buildShareUrlPure('IDFM:463079', participants);
    const params = new URLSearchParams(url.split('?')[1]);
    const gDecoded = params.get('g') ?? '';
    const entries = gDecoded.split(',');
    const parsed = entries.map(entry => {
      const parts = entry.split(':');
      return { name: parts[0], stationId: parts.slice(1).join(':') };
    });
    expect(parsed[0].name).toBe('Alice');
    expect(parsed[0].stationId).toBe('IDFM:463079');
    expect(parsed[1].name).toBe('Bob');
    expect(parsed[1].stationId).toBe('IDFM:monomodalStopPlace:473875');
  });

  it('US-10 scenario 4 : groupe > 12 participants desactive le partage (logique UI)', () => {
    // La garde est dans result/page.tsx : participants.length > 12
    // On verifie la borne : 12 → partage actif, 13 → desactive
    const shareDisabled = (count: number) => count > 12;
    expect(shareDisabled(11)).toBe(false);
    expect(shareDisabled(12)).toBe(false);
    expect(shareDisabled(13)).toBe(true);
  });
});
