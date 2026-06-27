import { describe, it, expect } from 'vitest';
import { findMeetingPoint } from '../index';
import {
  CHATELET,
  NATION,
  BASTILLE,
  GARE_DU_NORD,
  MONTPARNASSE,
  CHATEAU_DE_VINCENNES,
  BALARD,
  ORPHAN_STATION,
  ISOLATED_LINE_STATION,
} from './fixtures';
import type { Station } from '@/types/station';

// Dataset minimal pour les tests du point d'entrée
const SMALL_DATASET: Station[] = [
  CHATELET,
  NATION,
  BASTILLE,
  GARE_DU_NORD,
  MONTPARNASSE,
  CHATEAU_DE_VINCENNES,
  BALARD,
];

// ── US-17 : dataset vide → retour null ────────────────────────────────────────

describe('findMeetingPoint — US-17 dataset vide', () => {
  it('retourne null si allStations est vide', () => {
    const result = findMeetingPoint([CHATELET, NATION], []);
    expect(result).toBeNull();
  });

  it('retourne null si participants est vide', () => {
    // Avec participants vide, findOptimalStation reçoit participants=[] → null
    const result = findMeetingPoint([], SMALL_DATASET);
    expect(result).toBeNull();
  });
});

// ── US-07 : cas nominal ───────────────────────────────────────────────────────

describe('findMeetingPoint — US-07 cas nominal', () => {
  it('retourne un résultat non null avec participants et dataset valides', () => {
    const result = findMeetingPoint([CHATELET, NATION], SMALL_DATASET);
    expect(result).not.toBeNull();
  });

  it('la station optimale est dans le dataset', () => {
    const result = findMeetingPoint([CHATELET, NATION], SMALL_DATASET);
    expect(result).not.toBeNull();
    const stationIds = SMALL_DATASET.map((s) => s.id);
    expect(stationIds).toContain(result!.optimal.station.id);
  });

  it('retourne les métriques d\'affichage (maxTime, avgTime, furthestParticipants, progressBars)', () => {
    const result = findMeetingPoint([CHATELET, NATION], SMALL_DATASET);
    expect(result).not.toBeNull();
    const { metrics } = result!;
    expect(typeof metrics.maxTime).toBe('number');
    expect(typeof metrics.avgTime).toBe('number');
    expect(Array.isArray(metrics.furthestParticipants)).toBe(true);
    expect(metrics.progressBars).toBeInstanceOf(Map);
  });

  it('la Map times contient un temps pour chaque participant', () => {
    const participants = [CHATELET, NATION];
    const result = findMeetingPoint(participants, SMALL_DATASET);
    expect(result!.optimal.times.size).toBe(participants.length);
    for (const p of participants) {
      expect(result!.optimal.times.has(p)).toBe(true);
    }
  });

  it('le maxTime dans metrics correspond au max des times de optimal', () => {
    const result = findMeetingPoint([CHATELET, NATION], SMALL_DATASET);
    expect(result).not.toBeNull();
    const computedMax = Math.max(...[...result!.optimal.times.values()]);
    expect(result!.metrics.maxTime).toBe(computedMax);
  });

  it('la barre de progression du participant le plus loin est à 100%', () => {
    const result = findMeetingPoint([CHATELET, NATION], SMALL_DATASET);
    const { furthestParticipants, progressBars } = result!.metrics;
    expect(furthestParticipants.length).toBeGreaterThanOrEqual(1);
    for (const p of furthestParticipants) {
      expect(progressBars.get(p)).toBe(100);
    }
  });
});

// ── US-08 : tous les participants sur la même station ─────────────────────────

describe('findMeetingPoint — US-08 tous à la même station', () => {
  it('tous les participants à Châtelet : la station optimale est Châtelet', () => {
    // Châtelet dans le dataset → c'est candidate + point de départ commun
    // Le minimax préfère le temps min → Châtelet (distance 0)
    const result = findMeetingPoint([CHATELET, CHATELET], SMALL_DATASET);
    expect(result).not.toBeNull();
    expect(result!.optimal.station.id).toBe(CHATELET.id);
  });

  it('US-08 : toutes les barres sont à 100% quand tous sont sur la station résultat', () => {
    const result = findMeetingPoint([CHATELET, CHATELET], SMALL_DATASET);
    expect(result).not.toBeNull();
    // Quand tous les participants sont à la station résultat (Châtelet), temps = OVERHEAD_MIN = 4
    // maxTime = 4, chaque barre = 4/4*100 = 100%
    const { progressBars, maxTime } = result!.metrics;
    if (maxTime === 0) {
      // Si la distance haversine est nulle (même station), toutes barres à 100%
      for (const pct of progressBars.values()) {
        expect(pct).toBe(100);
      }
    }
    // Même si maxTime > 0 (OVERHEAD_MIN), les deux participants ont le même temps → 100% chacun
    const values = [...progressBars.values()];
    const allEqual = values.every((v) => v === values[0]);
    expect(allEqual).toBe(true);
    expect(values[0]).toBe(100);
  });
});

// ── US-17 : station orpheline → fallback ─────────────────────────────────────

describe('findMeetingPoint — US-17 station orpheline (fallback)', () => {
  it('participant orphelin (sans lignes) → fallback → résultat non null', () => {
    const dataset = [...SMALL_DATASET, ORPHAN_STATION];
    const result = findMeetingPoint([CHATELET, ORPHAN_STATION], dataset);
    // Le fallback doit s'activer et retourner un résultat
    expect(result).not.toBeNull();
  });

  it('participant sur réseau isolé → fallback → résultat non null', () => {
    const dataset = [...SMALL_DATASET, ISOLATED_LINE_STATION];
    const result = findMeetingPoint([CHATELET, ISOLATED_LINE_STATION], dataset);
    expect(result).not.toBeNull();
  });
});

// ── Résultat minimax cohérent avec la géographie ─────────────────────────────

describe('findMeetingPoint — cohérence géographique', () => {
  it('Château de Vincennes (est) + Balard (ouest) : la station optimale est entre les deux', () => {
    const result = findMeetingPoint(
      [CHATEAU_DE_VINCENNES, BALARD],
      SMALL_DATASET
    );
    expect(result).not.toBeNull();
    const winner = result!.optimal.station;
    // La station gagnante doit être longitudinalement entre Vincennes (lng ~2.44) et Balard (lng ~2.28)
    expect(winner.lng).toBeGreaterThanOrEqual(2.27);
    expect(winner.lng).toBeLessThanOrEqual(2.45);
  });

  it('avgTime est entre 0 et maxTime (inclus)', () => {
    const result = findMeetingPoint([CHATELET, NATION, GARE_DU_NORD], SMALL_DATASET);
    expect(result).not.toBeNull();
    const { avgTime, maxTime } = result!.metrics;
    expect(avgTime).toBeGreaterThanOrEqual(0);
    expect(avgTime).toBeLessThanOrEqual(maxTime);
  });
});
