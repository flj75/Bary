import { describe, it, expect } from 'vitest';
import { findOptimalStation } from '../minimax';
import { HaversineTravelTimeProvider } from '../haversine';
import {
  CHATELET,
  NATION,
  BASTILLE,
  SAINT_LAZARE,
  GARE_DU_NORD,
  MONTPARNASSE,
  CHATEAU_DE_VINCENNES,
  BALARD,
} from './fixtures';
import type { Station } from '@/types/station';
import type { TravelTimeProvider } from '@/types/algorithm';

const haversine = new HaversineTravelTimeProvider();

// Provider de test déterministe : retourne des temps fixes
function makeFixedProvider(table: Map<string, number>): TravelTimeProvider {
  return {
    getMinutes(from: Station, to: Station): number {
      const key = `${from.id}->${to.id}`;
      const t = table.get(key);
      if (t === undefined) throw new Error(`Temps manquant pour ${key}`);
      return t;
    },
  };
}

// ── Cas retour null ────────────────────────────────────────────────────────────

describe('findOptimalStation — retour null (US-17)', () => {
  it('retourne null si candidates est vide', () => {
    expect(findOptimalStation([CHATELET], [], haversine)).toBeNull();
  });

  it('retourne null si participants est vide', () => {
    expect(findOptimalStation([], [CHATELET, NATION], haversine)).toBeNull();
  });

  it('retourne null si participants ET candidates sont vides', () => {
    expect(findOptimalStation([], [], haversine)).toBeNull();
  });
});

// ── Cas nominal ───────────────────────────────────────────────────────────────

describe('findOptimalStation — cas nominal', () => {
  it('avec un seul candidat, retourne ce candidat', () => {
    const result = findOptimalStation([CHATELET, NATION], [BASTILLE], haversine);
    expect(result).not.toBeNull();
    expect(result!.station.id).toBe(BASTILLE.id);
  });

  it('avec un seul participant, retourne le candidat avec le temps min', () => {
    // Châtelet est plus proche de Bastille que de Nation
    // → le candidat le plus proche est retenu
    const candidates = [BASTILLE, NATION];
    const result = findOptimalStation([CHATELET], candidates, haversine);
    expect(result).not.toBeNull();
    const tBastille = haversine.getMinutes(CHATELET, BASTILLE);
    const tNation = haversine.getMinutes(CHATELET, NATION);
    // Le résultat doit être le candidat avec le plus petit maxTime
    const expectedWinner = tBastille <= tNation ? BASTILLE.id : NATION.id;
    expect(result!.station.id).toBe(expectedWinner);
  });

  it('retourne la bonne station : minimax parmi plusieurs candidats', () => {
    // Provider déterministe : Alice et Bob avec temps connus
    //   Candidates : A, B, C
    //   Alice→A=10, Bob→A=20  → max=20
    //   Alice→B=15, Bob→B=15  → max=15 ← gagnant
    //   Alice→C=5,  Bob→C=25  → max=25
    const alice: Station = { ...CHATELET, id: 'alice' };
    const bob: Station   = { ...NATION,   id: 'bob'   };
    const cA: Station    = { ...BASTILLE, id: 'cA'    };
    const cB: Station    = { ...SAINT_LAZARE, id: 'cB' };
    const cC: Station    = { ...GARE_DU_NORD, id: 'cC' };

    const table = new Map([
      ['alice->cA', 10], ['bob->cA', 20],
      ['alice->cB', 15], ['bob->cB', 15],
      ['alice->cC', 5],  ['bob->cC', 25],
    ]);

    const result = findOptimalStation([alice, bob], [cA, cB, cC], makeFixedProvider(table));
    expect(result).not.toBeNull();
    expect(result!.station.id).toBe('cB');
  });

  it('la Map `times` contient un temps pour chaque participant', () => {
    const participants = [CHATELET, NATION];
    const candidates = [BASTILLE, MONTPARNASSE];
    const result = findOptimalStation(participants, candidates, haversine);
    expect(result).not.toBeNull();
    expect(result!.times.size).toBe(participants.length);
    for (const p of participants) {
      expect(result!.times.has(p)).toBe(true);
    }
  });

  it('le maxTime du résultat est bien le minimum parmi les candidats', () => {
    const participants = [CHATELET, NATION];
    const candidates = [BASTILLE, MONTPARNASSE, GARE_DU_NORD];
    const result = findOptimalStation(participants, candidates, haversine);
    expect(result).not.toBeNull();

    // Calcule le maxTime de chaque candidat indépendamment
    const maxTimes = candidates.map((c) => {
      const times = participants.map((p) => haversine.getMinutes(p, c));
      return Math.max(...times);
    });
    const bestPossibleMax = Math.min(...maxTimes);

    const resultMaxTime = Math.max(...[...result!.times.values()]);
    expect(resultMaxTime).toBe(bestPossibleMax);
  });
});

// ── US-08 : tous les participants sur la même station ─────────────────────────

describe('findOptimalStation — US-08 tous à la même station', () => {
  it('retourne la station de départ commune comme résultat quand elle est candidate', () => {
    // Tous les participants sont à Châtelet, Châtelet est candidate
    const result = findOptimalStation([CHATELET, CHATELET], [CHATELET, NATION], haversine);
    expect(result).not.toBeNull();
    // Le minimax minimise le max : depuis Châtelet vers Châtelet = OVERHEAD_MIN = 4
    // vs Châtelet vers Nation = plusieurs minutes
    // → Châtelet devrait gagner
    expect(result!.station.id).toBe(CHATELET.id);
  });

  it('le temps max est minimal (OVERHEAD_MIN) quand tous sont sur la station résultat', () => {
    const result = findOptimalStation([CHATELET, CHATELET], [CHATELET], haversine);
    expect(result).not.toBeNull();
    const times = [...result!.times.values()];
    // Tous les temps sont OVERHEAD_MIN (distance 0, 0 transfert)
    expect(times.every((t) => t === 4)).toBe(true);
  });
});

// ── Tie-breaker (US-07 edge case) ─────────────────────────────────────────────

describe('findOptimalStation — tie-breaker (station la plus proche de Châtelet)', () => {
  it('en cas d\'égalité parfaite, retourne la station la plus proche de Châtelet', () => {
    // Provider fictif : deux candidats avec le même maxTime
    const alice: Station = { ...CHATELET,  id: 'alice' };
    const bob: Station   = { ...NATION,    id: 'bob'   };
    // cNear est proche de Châtelet (lat/lng Bastille)
    const cNear: Station = { ...BASTILLE,  id: 'cNear' };
    // cFar est loin (Château de Vincennes)
    const cFar: Station  = { ...CHATEAU_DE_VINCENNES, id: 'cFar' };

    const table = new Map([
      ['alice->cNear', 20], ['bob->cNear', 20], // max=20
      ['alice->cFar',  20], ['bob->cFar',  20], // max=20 → égalité → tie-breaker
    ]);

    const result = findOptimalStation([alice, bob], [cNear, cFar], makeFixedProvider(table));
    expect(result).not.toBeNull();
    // Bastille est plus proche de Châtelet (48.8597, 2.3469) que Château de Vincennes
    expect(result!.station.id).toBe('cNear');
  });

  it('sans égalité, le tie-breaker n\'est pas appliqué (résultat direct)', () => {
    const alice: Station = { ...CHATELET, id: 'alice' };
    const cA: Station   = { ...BASTILLE, id: 'cA' };
    const cB: Station   = { ...NATION,   id: 'cB' };

    const table = new Map([
      ['alice->cA', 10],
      ['alice->cB', 20],
    ]);

    const result = findOptimalStation([alice], [cA, cB], makeFixedProvider(table));
    expect(result!.station.id).toBe('cA'); // max=10, gagne sans tie-breaker
  });
});

// ── US-09 : égalité entre participants sur le temps max ──────────────────────

describe('findOptimalStation — structure times (US-09)', () => {
  it('la Map times identifie bien l\'objet Station comme clé (référence)', () => {
    const participants = [CHATELET, NATION];
    const result = findOptimalStation(participants, [BASTILLE], haversine);
    expect(result).not.toBeNull();
    // Les clés de la Map doivent être les mêmes références que participants
    expect(result!.times.has(CHATELET)).toBe(true);
    expect(result!.times.has(NATION)).toBe(true);
  });

  it('tous les temps sont des entiers positifs ou nuls', () => {
    const result = findOptimalStation([CHATELET, NATION], [BASTILLE, MONTPARNASSE], haversine);
    for (const t of result!.times.values()) {
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Cas limites ───────────────────────────────────────────────────────────────

describe('findOptimalStation — cas limites', () => {
  it('dataset réel partiel : résultat cohérent avec des stations géographiquement opposées', () => {
    // Château de Vincennes (est) et Balard (ouest) — le résultat devrait être quelque part au milieu
    const candidates = [CHATELET, BASTILLE, NATION, MONTPARNASSE, GARE_DU_NORD];
    const result = findOptimalStation(
      [CHATEAU_DE_VINCENNES, BALARD],
      candidates,
      haversine
    );
    expect(result).not.toBeNull();
    // Vérifie que le résultat est bien dans la liste des candidats
    expect(candidates.some((c) => c.id === result!.station.id)).toBe(true);
  });

  it('avec 10 participants identiques, retourne le candidat le plus proche d\'eux', () => {
    const tenChatelet = Array(10).fill(CHATELET);
    const result = findOptimalStation(tenChatelet, [CHATELET, NATION, GARE_DU_NORD], haversine);
    expect(result).not.toBeNull();
    // Tous les participants sont à Châtelet → le candidat le plus "proche" (maxTime minimal) est Châtelet
    expect(result!.station.id).toBe(CHATELET.id);
  });
});
