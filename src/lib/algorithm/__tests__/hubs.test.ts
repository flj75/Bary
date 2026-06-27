import { describe, it, expect } from 'vitest';
import {
  PARIS_HUBS,
  getHubForStation,
  effectiveTravelTime,
} from '../hubs';
import { HaversineTravelTimeProvider } from '../haversine';
import {
  CHATELET,
  CHATELET_LES_HALLES_RER,
  LES_HALLES,
  SAINT_LAZARE,
  SAINT_LAZARE_M12,
  HAUSSMANN_SL,
  MAGENTA,
  GARE_DU_NORD,
  AUBER,
  HAVRE_CAUMARTIN,
  OPERA,
  CHAUSSEE_DANTIN,
  NATION,
  BASTILLE,
} from './fixtures';
import type { Station } from '@/types/station';

const provider = new HaversineTravelTimeProvider();

// Ensemble de stations couvrant les hubs réels du dataset
const ALL_HUB_STATIONS: Station[] = [
  CHATELET,
  CHATELET_LES_HALLES_RER,
  LES_HALLES,
  SAINT_LAZARE,
  SAINT_LAZARE_M12,
  HAUSSMANN_SL,
  MAGENTA,
  GARE_DU_NORD,
  AUBER,
  HAVRE_CAUMARTIN,
  OPERA,
  CHAUSSEE_DANTIN,
  NATION,
  BASTILLE,
];

// ── PARIS_HUBS ────────────────────────────────────────────────────────────────

describe('PARIS_HUBS', () => {
  it('contient exactement 5 hubs', () => {
    expect(PARIS_HUBS).toHaveLength(5);
  });

  it('chaque hub a un nom, des stationIds non vides et un walkingTimeMinutes > 0', () => {
    for (const hub of PARIS_HUBS) {
      expect(hub.name).toBeTruthy();
      expect(hub.stationIds.length).toBeGreaterThan(0);
      expect(hub.walkingTimeMinutes).toBeGreaterThan(0);
    }
  });

  it('les IDs de stations sont des strings non vides', () => {
    for (const hub of PARIS_HUBS) {
      for (const id of hub.stationIds) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });
});

// ── getHubForStation ──────────────────────────────────────────────────────────

describe('getHubForStation', () => {
  it('retourne le hub Châtelet—Les Halles pour Châtelet (M1/4/7/11/14)', () => {
    const hub = getHubForStation(CHATELET.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe('Châtelet — Les Halles');
  });

  it('retourne le hub Châtelet—Les Halles pour Châtelet-Les Halles RER', () => {
    const hub = getHubForStation(CHATELET_LES_HALLES_RER.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe('Châtelet — Les Halles');
  });

  it('retourne le hub Châtelet—Les Halles pour Les Halles (M4)', () => {
    const hub = getHubForStation(LES_HALLES.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe('Châtelet — Les Halles');
  });

  it('retourne le hub Saint-Lazare pour Haussmann Saint-Lazare (RER E)', () => {
    const hub = getHubForStation(HAUSSMANN_SL.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe('Saint-Lazare — Haussmann-Saint-Lazare');
  });

  it('retourne null pour une station hors hub (Nation)', () => {
    expect(getHubForStation(NATION.id)).toBeNull();
  });

  it('retourne null pour une station hors hub (Bastille)', () => {
    expect(getHubForStation(BASTILLE.id)).toBeNull();
  });

  it('retourne null pour un ID inconnu', () => {
    expect(getHubForStation('IDFM:FAKE_99999')).toBeNull();
  });

  it('retourne null pour une string vide', () => {
    expect(getHubForStation('')).toBeNull();
  });

  it('retourne le hub Opéra pour Chaussée d\'Antin - La Fayette', () => {
    const hub = getHubForStation(CHAUSSEE_DANTIN.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe("Opéra — Chaussée d'Antin-La Fayette");
  });

  it('retourne le hub Gare du Nord — Magenta pour Magenta (RER E)', () => {
    const hub = getHubForStation(MAGENTA.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe('Gare du Nord — Magenta');
  });

  it('Saint-Lazare M3/13/14 appartient au hub Saint-Lazare', () => {
    const hub = getHubForStation(SAINT_LAZARE.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe('Saint-Lazare — Haussmann-Saint-Lazare');
  });

  it('Saint-Lazare M12 appartient au hub Saint-Lazare', () => {
    const hub = getHubForStation(SAINT_LAZARE_M12.id);
    expect(hub).not.toBeNull();
    expect(hub!.name).toBe('Saint-Lazare — Haussmann-Saint-Lazare');
  });
});

// ── effectiveTravelTime ───────────────────────────────────────────────────────

describe('effectiveTravelTime — même hub (walking only)', () => {
  it('Châtelet → Les Halles (même hub) retourne walkingTimeMinutes = 5', () => {
    const t = effectiveTravelTime(CHATELET, LES_HALLES, ALL_HUB_STATIONS, provider);
    expect(t).toBe(5);
  });

  it('Les Halles → Châtelet-Les Halles RER (même hub) retourne 5', () => {
    const t = effectiveTravelTime(LES_HALLES, CHATELET_LES_HALLES_RER, ALL_HUB_STATIONS, provider);
    expect(t).toBe(5);
  });

  it('Saint-Lazare M14 → Haussmann SL (même hub) retourne walkingTimeMinutes = 5', () => {
    const t = effectiveTravelTime(SAINT_LAZARE, HAUSSMANN_SL, ALL_HUB_STATIONS, provider);
    expect(t).toBe(5);
  });

  it('Opéra → Chaussée d\'Antin (même hub) retourne walkingTimeMinutes = 3', () => {
    const t = effectiveTravelTime(OPERA, CHAUSSEE_DANTIN, ALL_HUB_STATIONS, provider);
    expect(t).toBe(3);
  });

  it('symétrie dans le même hub : Châtelet → Châtelet-Les Halles RER == inverse', () => {
    const t1 = effectiveTravelTime(CHATELET, CHATELET_LES_HALLES_RER, ALL_HUB_STATIONS, provider);
    const t2 = effectiveTravelTime(CHATELET_LES_HALLES_RER, CHATELET, ALL_HUB_STATIONS, provider);
    // from dans un hub ne bénéficie pas du raccourci walking (seul "to" le bénéficie)
    // mais dans ce cas les deux sont dans le même hub → walking dans les deux sens
    expect(t1).toBe(5);
    expect(t2).toBe(5);
  });
});

describe('effectiveTravelTime — candidat dans un hub (multi-entrée)', () => {
  it('Nation → Châtelet (hub) : temps <= temps haversine direct + 0', () => {
    // Le provider teste toutes les entrées du hub, retient le min
    const tHub = effectiveTravelTime(NATION, CHATELET, ALL_HUB_STATIONS, provider);
    const tDirect = provider.getMinutes(NATION, CHATELET);
    // Le hub peut trouver un chemin plus court via une autre entrée (+ walk penalty)
    // Mais il ne peut jamais être plus long que le direct non-hubbed
    expect(tHub).toBeLessThanOrEqual(tDirect);
  });

  it('Nation → Châtelet (hub) retourne un entier positif', () => {
    const t = effectiveTravelTime(NATION, CHATELET, ALL_HUB_STATIONS, provider);
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeGreaterThan(0);
  });

  it('fallback gracieux si hubStations est vide : retourne le temps direct', () => {
    // On passe allStations = [] alors que Châtelet est dans un hub
    const tFallback = effectiveTravelTime(NATION, CHATELET, [], provider);
    const tDirect = provider.getMinutes(NATION, CHATELET);
    expect(tFallback).toBe(tDirect);
  });
});

describe('effectiveTravelTime — cas standard (hors hub)', () => {
  it('Nation → Bastille (pas de hub) == provider.getMinutes direct', () => {
    const tEffective = effectiveTravelTime(NATION, BASTILLE, ALL_HUB_STATIONS, provider);
    const tDirect = provider.getMinutes(NATION, BASTILLE);
    expect(tEffective).toBe(tDirect);
  });

  it('Gare du Nord → Nation (pas de hub candidat) == provider direct', () => {
    const tEffective = effectiveTravelTime(GARE_DU_NORD, NATION, ALL_HUB_STATIONS, provider);
    const tDirect = provider.getMinutes(GARE_DU_NORD, NATION);
    expect(tEffective).toBe(tDirect);
  });
});
