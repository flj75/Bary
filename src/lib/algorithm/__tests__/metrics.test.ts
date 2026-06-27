import { describe, it, expect } from 'vitest';
import { computeDisplayMetrics } from '../metrics';
import { CHATELET, NATION, BASTILLE, SAINT_LAZARE } from './fixtures';
import type { Station } from '@/types/station';

// ── Cas trivial : Map vide ────────────────────────────────────────────────────

describe('computeDisplayMetrics — Map vide', () => {
  it('retourne des valeurs par défaut si times est vide', () => {
    const result = computeDisplayMetrics(new Map());
    expect(result.maxTime).toBe(0);
    expect(result.avgTime).toBe(0);
    expect(result.furthestParticipants).toHaveLength(0);
    expect(result.progressBars.size).toBe(0);
  });
});

// ── Cas nominal : plusieurs participants, temps distincts ─────────────────────

describe('computeDisplayMetrics — cas nominal', () => {
  const times: Map<Station, number> = new Map([
    [CHATELET, 10],
    [NATION,   20],
    [BASTILLE, 15],
  ]);

  it('maxTime est le maximum des temps', () => {
    expect(computeDisplayMetrics(times).maxTime).toBe(20);
  });

  it('avgTime est la moyenne arrondie', () => {
    // (10 + 20 + 15) / 3 = 15
    expect(computeDisplayMetrics(times).avgTime).toBe(15);
  });

  it('furthestParticipants contient uniquement le participant au temps max (US-09 cas 1)', () => {
    const { furthestParticipants } = computeDisplayMetrics(times);
    expect(furthestParticipants).toHaveLength(1);
    expect(furthestParticipants[0]).toBe(NATION);
  });

  it('la barre du participant le plus loin est à 100%', () => {
    const { progressBars } = computeDisplayMetrics(times);
    expect(progressBars.get(NATION)).toBe(100);
  });

  it('les autres barres sont proportionnelles au max', () => {
    const { progressBars } = computeDisplayMetrics(times);
    // Châtelet : 10/20 = 50%
    expect(progressBars.get(CHATELET)).toBe(50);
    // Bastille : 15/20 = 75%
    expect(progressBars.get(BASTILLE)).toBe(75);
  });

  it('toutes les barres sont dans [0, 100]', () => {
    const { progressBars } = computeDisplayMetrics(times);
    for (const pct of progressBars.values()) {
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });
});

// ── US-08 : tous les participants sur la même station (temps = 0) ─────────────

describe('computeDisplayMetrics — US-08 tous à la même station (maxTime=0)', () => {
  const times: Map<Station, number> = new Map([
    [CHATELET, 0],
    [NATION,   0],
  ]);

  it('toutes les barres sont à 100% quand maxTime === 0', () => {
    const { progressBars } = computeDisplayMetrics(times);
    for (const pct of progressBars.values()) {
      expect(pct).toBe(100);
    }
  });

  it('maxTime est 0', () => {
    expect(computeDisplayMetrics(times).maxTime).toBe(0);
  });

  it('avgTime est 0', () => {
    expect(computeDisplayMetrics(times).avgTime).toBe(0);
  });

  it('furthestParticipants contient tous les participants (temps égal à 0)', () => {
    const { furthestParticipants } = computeDisplayMetrics(times);
    expect(furthestParticipants).toHaveLength(2);
  });
});

// ── US-09 : égalité entre deux participants sur le temps max ──────────────────

describe('computeDisplayMetrics — US-09 égalité sur le temps max ("Sofia & Hugo · 36 min")', () => {
  const times: Map<Station, number> = new Map([
    [CHATELET, 36],  // Sofia
    [NATION,   36],  // Hugo
    [BASTILLE, 20],  // Autre participant
  ]);

  it('furthestParticipants contient les deux participants ex-æquo', () => {
    const { furthestParticipants } = computeDisplayMetrics(times);
    expect(furthestParticipants).toHaveLength(2);
    const ids = furthestParticipants.map((p) => p.id);
    expect(ids).toContain(CHATELET.id);
    expect(ids).toContain(NATION.id);
  });

  it('maxTime est 36', () => {
    expect(computeDisplayMetrics(times).maxTime).toBe(36);
  });

  it('la barre des deux ex-æquo est à 100%', () => {
    const { progressBars } = computeDisplayMetrics(times);
    expect(progressBars.get(CHATELET)).toBe(100);
    expect(progressBars.get(NATION)).toBe(100);
  });

  it('la barre du troisième participant est proportionnelle', () => {
    const { progressBars } = computeDisplayMetrics(times);
    // 20/36 = 55.5... → Math.round → 56
    expect(progressBars.get(BASTILLE)).toBe(56);
  });
});

// ── Cas avec un seul participant ─────────────────────────────────────────────

describe('computeDisplayMetrics — un seul participant', () => {
  it('furthestParticipants contient ce participant unique', () => {
    const times: Map<Station, number> = new Map([[CHATELET, 25]]);
    const { furthestParticipants, maxTime, avgTime } = computeDisplayMetrics(times);
    expect(furthestParticipants).toHaveLength(1);
    expect(furthestParticipants[0]).toBe(CHATELET);
    expect(maxTime).toBe(25);
    expect(avgTime).toBe(25);
  });

  it('barre à 100% pour le participant unique', () => {
    const times: Map<Station, number> = new Map([[CHATELET, 25]]);
    const { progressBars } = computeDisplayMetrics(times);
    expect(progressBars.get(CHATELET)).toBe(100);
  });
});

// ── Cas limites supplémentaires ───────────────────────────────────────────────

describe('computeDisplayMetrics — cas limites', () => {
  it('arrondi de avgTime : (10 + 11) / 2 = 10.5 → 11', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET, 10],
      [NATION,   11],
    ]);
    expect(computeDisplayMetrics(times).avgTime).toBe(11);
  });

  it('arrondi de progressBars : 1/3 → 33%', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET, 1],
      [NATION,   3],
    ]);
    const { progressBars } = computeDisplayMetrics(times);
    // 1/3 * 100 = 33.33... → Math.round → 33
    expect(progressBars.get(CHATELET)).toBe(33);
  });

  it('temps très élevé (ex. 999) : maxTime et avgTime cohérents', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET, 999],
      [NATION,   1],
    ]);
    const { maxTime, avgTime } = computeDisplayMetrics(times);
    expect(maxTime).toBe(999);
    // (999 + 1) / 2 = 500
    expect(avgTime).toBe(500);
  });

  it('quatre participants avec des temps distincts : taille progressBars = 4', () => {
    const times: Map<Station, number> = new Map([
      [CHATELET, 10],
      [NATION,   20],
      [BASTILLE, 15],
      [SAINT_LAZARE, 30],
    ]);
    const { progressBars } = computeDisplayMetrics(times);
    expect(progressBars.size).toBe(4);
  });
});
