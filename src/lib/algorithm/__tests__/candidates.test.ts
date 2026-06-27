import { describe, it, expect } from 'vitest';
import { getReachableStations, buildCandidates } from '../candidates';
import {
  CHATELET,
  NATION,
  BASTILLE,
  SAINT_LAZARE,
  GARE_DU_NORD,
  MONTPARNASSE,
  CHATEAU_DE_VINCENNES,
  ORPHAN_STATION,
  ISOLATED_LINE_STATION,
} from './fixtures';
import type { Station } from '@/types/station';

// Mini-dataset cohérent pour les tests unitaires (évite de charger 803 stations)
const SMALL_DATASET: Station[] = [
  CHATELET,          // M1, M4, M7, M11, M14
  NATION,            // M1, M2, M6, M9, RERA
  BASTILLE,          // M1, M5, M8
  SAINT_LAZARE,      // M3, M13, M14
  GARE_DU_NORD,      // M4, M5, RER B, D
  MONTPARNASSE,      // M4, M6, M12, M13
  CHATEAU_DE_VINCENNES, // M1 seulement
];

// ── getReachableStations ──────────────────────────────────────────────────────

describe('getReachableStations', () => {
  it('inclut la station de départ elle-même (0 correspondance)', () => {
    const reach = getReachableStations(CHATELET, SMALL_DATASET);
    expect(reach.has(CHATELET.id)).toBe(true);
  });

  it('inclut les stations partageant une ligne directe (0 correspondance)', () => {
    // Châtelet et Bastille partagent M1
    const reach = getReachableStations(CHATELET, SMALL_DATASET);
    expect(reach.has(BASTILLE.id)).toBe(true);
  });

  it('inclut les stations accessibles en 1 correspondance', () => {
    // Château de Vincennes (M1 seul) vers Gare du Nord (M4/M5/B/D) :
    // M1 passe par Châtelet (M1+M4) → correspondance M4 → GdN → 1 correspondance
    const reach = getReachableStations(CHATEAU_DE_VINCENNES, SMALL_DATASET);
    expect(reach.has(GARE_DU_NORD.id)).toBe(true);
  });

  it('inclut Nation depuis Château de Vincennes via M1 direct', () => {
    // M1 : Château de Vincennes → Nation (ligne directe)
    const reach = getReachableStations(CHATEAU_DE_VINCENNES, SMALL_DATASET);
    expect(reach.has(NATION.id)).toBe(true);
  });

  it('retourne un Set vide si la station de départ a des lignes absentes du dataset', () => {
    // ISOLATED_LINE_STATION a une ligne fictive introuvable dans SMALL_DATASET
    const reach = getReachableStations(ISOLATED_LINE_STATION, SMALL_DATASET);
    // Aucune station dans SMALL_DATASET ne partage la ligne X fictive
    // et aucune station intermédiaire n'y connecte → Set vide (ou presque)
    expect(reach.size).toBe(0);
  });

  it('station orpheline (sans lignes) : aucune station accessible', () => {
    const reach = getReachableStations(ORPHAN_STATION, SMALL_DATASET);
    expect(reach.size).toBe(0);
  });

  it('ne dépasse pas la taille du dataset', () => {
    const reach = getReachableStations(CHATELET, SMALL_DATASET);
    expect(reach.size).toBeLessThanOrEqual(SMALL_DATASET.length);
  });

  it('réseau à une seule station : reach = {cette station}', () => {
    const reach = getReachableStations(CHATELET, [CHATELET]);
    expect(reach.size).toBe(1);
    expect(reach.has(CHATELET.id)).toBe(true);
  });

  it('dataset vide : reach est vide', () => {
    const reach = getReachableStations(CHATELET, []);
    expect(reach.size).toBe(0);
  });
});

// ── buildCandidates ───────────────────────────────────────────────────────────

describe('buildCandidates', () => {
  it('avec un seul participant, retourne les stations accessibles depuis lui', () => {
    const candidates = buildCandidates([CHATELET], SMALL_DATASET);
    // Châtelet est très connecté → candidates non vide
    expect(candidates.length).toBeGreaterThan(0);
    // Toutes les candidates doivent être dans le dataset
    for (const c of candidates) {
      expect(SMALL_DATASET.some((s) => s.id === c.id)).toBe(true);
    }
  });

  it('avec deux participants sur la même station, retourne les stations accessibles depuis cette station', () => {
    const candidates = buildCandidates([CHATELET, CHATELET], SMALL_DATASET);
    const single = buildCandidates([CHATELET], SMALL_DATASET);
    expect(candidates).toHaveLength(single.length);
  });

  it('intersection : retourne uniquement les stations communes aux deux participants', () => {
    // Châtelet (M1, M4, M7, M11, M14) et Nation (M1, M2, M6, M9, A)
    const candidates = buildCandidates([CHATELET, NATION], SMALL_DATASET);
    const reachChatelet = getReachableStations(CHATELET, SMALL_DATASET);
    const reachNation = getReachableStations(NATION, SMALL_DATASET);

    for (const c of candidates) {
      expect(reachChatelet.has(c.id)).toBe(true);
      expect(reachNation.has(c.id)).toBe(true);
    }
  });

  it('fallback : retourne allStations si l\'intersection est vide (réseaux disjoints)', () => {
    // ISOLATED_LINE_STATION n'a aucune ligne commune avec quoi que ce soit dans SMALL_DATASET
    // → reach = {} → intersection avec n'importe quel autre participant = vide → fallback
    const candidates = buildCandidates([CHATELET, ISOLATED_LINE_STATION], SMALL_DATASET);
    expect(candidates).toHaveLength(SMALL_DATASET.length);
  });

  it('fallback activé pour participant orphelin : retourne allStations', () => {
    const candidates = buildCandidates([ORPHAN_STATION, CHATELET], SMALL_DATASET);
    expect(candidates).toHaveLength(SMALL_DATASET.length);
  });

  it('participants vides : retourne allStations (intersection de 0 ensembles = tout)', () => {
    // Comportement : every() sur un tableau vide retourne true → tout passe l'intersection
    const candidates = buildCandidates([], SMALL_DATASET);
    expect(candidates).toHaveLength(SMALL_DATASET.length);
  });

  it('dataset vide : retourne [] (fallback sur allStations vide)', () => {
    const candidates = buildCandidates([CHATELET, NATION], []);
    expect(candidates).toHaveLength(0);
  });

  it('ne retourne pas de doublons', () => {
    const candidates = buildCandidates([CHATELET, NATION], SMALL_DATASET);
    const ids = candidates.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
