/**
 * Tests FriendStore — US-12 (enregistrer un ami)
 *
 * Environnement : node (pas de window/localStorage natifs).
 * On fournit un stub minimal de localStorage avant chaque test.
 *
 * Hors périmètre : comportements UI (modales, navigation) — non testables sans jsdom.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Stub localStorage ─────────────────────────────────────────────────────────
// FriendStore vérifie `typeof window === 'undefined'` pour court-circuiter.
// On installe window + localStorage avant d'importer le module.

const store: Record<string, string> = {};

const localStorageStub = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

// Installer window + localStorage dans le contexte global Node
(globalThis as unknown as Record<string, unknown>).window = globalThis;
(globalThis as unknown as Record<string, unknown>).localStorage = localStorageStub;

// Import APRES l'installation de window pour que la garde `typeof window` passe
import { FriendStore } from '../store';
import type { Station } from '@/types/station';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHATELET: Station = {
  id: 'IDFM:463079',
  name: 'Châtelet',
  lat: 48.857689,
  lng: 2.347759,
  lines: [
    { id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' },
  ],
};

const NATION: Station = {
  id: 'IDFM:monomodalStopPlace:473875',
  name: 'Nation',
  lat: 48.848233,
  lng: 2.395944,
  lines: [
    { id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' },
  ],
};

const SAINT_LAZARE: Station = {
  id: 'IDFM:462972',
  name: 'Saint-Lazare',
  lat: 48.875661,
  lng: 2.324026,
  lines: [
    { id: 'IDFM:C01373', name: '3', mode: 'metro', color: '#6e6e00' },
  ],
};

// ── Isolation : localStorage propre avant chaque test ────────────────────────

beforeEach(() => {
  localStorageStub.clear();
  // Restaurer setItem a son implementation normale (cas ou un test l'aurait stubbe)
  localStorageStub.setItem = (key: string, value: string) => { store[key] = value; };
});

// ── getAll ────────────────────────────────────────────────────────────────────

describe('FriendStore.getAll (US-12)', () => {
  it('retourne un tableau vide si localStorage est vide', () => {
    expect(FriendStore.getAll()).toEqual([]);
  });

  it('retourne un tableau vide si la cle bary_friends est absente', () => {
    // localStorage propre : aucune cle
    expect(localStorageStub.getItem('bary_friends')).toBeNull();
    expect(FriendStore.getAll()).toEqual([]);
  });

  it('retourne les amis persistes apres un add', () => {
    FriendStore.add('Alice', CHATELET);
    const all = FriendStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Alice');
  });

  it('retourne [] si localStorage contient du JSON invalide (resilience)', () => {
    localStorageStub.setItem('bary_friends', 'INVALID_JSON{{{');
    expect(FriendStore.getAll()).toEqual([]);
  });
});

// ── add ───────────────────────────────────────────────────────────────────────

describe('FriendStore.add (US-12)', () => {
  it('cree un ami avec un id uuid, un name et une station complete', () => {
    const friend = FriendStore.add('Alice', CHATELET);
    expect(friend.id).toBeDefined();
    expect(typeof friend.id).toBe('string');
    expect(friend.id.length).toBeGreaterThan(0);
    expect(friend.name).toBe('Alice');
    expect(friend.station).toEqual(CHATELET);
  });

  it("l'id genere est un UUID valide (format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)", () => {
    const friend = FriendStore.add('Bob', NATION);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(friend.id).toMatch(uuidRegex);
  });

  it('persiste dans localStorage (getAll le retrouve)', () => {
    FriendStore.add('Alice', CHATELET);
    const all = FriendStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Alice');
    expect(all[0].station.id).toBe(CHATELET.id);
  });

  it('accumule plusieurs amis sans ecraser les precedents', () => {
    FriendStore.add('Alice', CHATELET);
    FriendStore.add('Bob', NATION);
    FriendStore.add('Carl', SAINT_LAZARE);
    const all = FriendStore.getAll();
    expect(all).toHaveLength(3);
    expect(all.map(f => f.name)).toEqual(['Alice', 'Bob', 'Carl']);
  });

  it('deux amis au meme prenom sont autorises (US-03 edge case)', () => {
    FriendStore.add('Alice', CHATELET);
    FriendStore.add('Alice', NATION);
    const all = FriendStore.getAll();
    expect(all).toHaveLength(2);
    // Les ids doivent etre differents
    expect(all[0].id).not.toBe(all[1].id);
  });

  it('conserve la station complete (lat, lng, lines) dans localStorage', () => {
    FriendStore.add('Alice', CHATELET);
    const stored = FriendStore.getAll()[0];
    expect(stored.station.lat).toBe(CHATELET.lat);
    expect(stored.station.lng).toBe(CHATELET.lng);
    expect(stored.station.lines).toHaveLength(1);
    expect(stored.station.lines[0].color).toBe('#ffbe00');
  });

  it('retourne le Friend cree (valeur de retour de add)', () => {
    const returned = FriendStore.add('Alice', CHATELET);
    const stored = FriendStore.getAll()[0];
    expect(returned.id).toBe(stored.id);
    expect(returned.name).toBe(stored.name);
  });

  it('BUG-02 : FriendStore.add propage une erreur non catchee si localStorage est plein (QuotaExceededError)', () => {
    // La fonction write() n'a pas de try/catch.
    // Si localStorage.setItem lance une QuotaExceededError, elle se propage a l'appelant.
    // US-12 edge case : "afficher un message d'erreur explicite" — non implémenté.
    const originalSetItem = localStorageStub.setItem;
    localStorageStub.setItem = (_key: string, _value: string) => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    };
    expect(() => FriendStore.add('Alice', CHATELET)).toThrow();
    localStorageStub.setItem = originalSetItem;
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe('FriendStore.update (US-12)', () => {
  it('modifie le name d\'un ami existant', () => {
    const f = FriendStore.add('Alice', CHATELET);
    FriendStore.update(f.id, { name: 'Alicia' });
    const updated = FriendStore.getAll().find(x => x.id === f.id);
    expect(updated?.name).toBe('Alicia');
  });

  it('modifie la station d\'un ami existant', () => {
    const f = FriendStore.add('Alice', CHATELET);
    FriendStore.update(f.id, { station: NATION });
    const updated = FriendStore.getAll().find(x => x.id === f.id);
    expect(updated?.station.id).toBe(NATION.id);
  });

  it('modifie name et station simultanement', () => {
    const f = FriendStore.add('Alice', CHATELET);
    FriendStore.update(f.id, { name: 'Alicia', station: NATION });
    const updated = FriendStore.getAll().find(x => x.id === f.id);
    expect(updated?.name).toBe('Alicia');
    expect(updated?.station.id).toBe(NATION.id);
  });

  it('ne modifie pas les autres amis', () => {
    const alice = FriendStore.add('Alice', CHATELET);
    const bob = FriendStore.add('Bob', NATION);
    FriendStore.update(alice.id, { name: 'Alicia' });
    const bobAfter = FriendStore.getAll().find(x => x.id === bob.id);
    expect(bobAfter?.name).toBe('Bob');
    expect(bobAfter?.station.id).toBe(NATION.id);
  });

  it('est sans effet si l\'id n\'existe pas', () => {
    FriendStore.add('Alice', CHATELET);
    FriendStore.update('id-inexistant', { name: 'Ghost' });
    const all = FriendStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Alice');
  });

  it('conserve l\'id original apres un update', () => {
    const f = FriendStore.add('Alice', CHATELET);
    FriendStore.update(f.id, { name: 'Alicia' });
    const updated = FriendStore.getAll().find(x => x.id === f.id);
    expect(updated?.id).toBe(f.id);
  });
});

// ── remove ────────────────────────────────────────────────────────────────────

describe('FriendStore.remove (US-12 / US-04 analogue)', () => {
  it('supprime l\'ami correspondant a l\'id', () => {
    const f = FriendStore.add('Alice', CHATELET);
    FriendStore.remove(f.id);
    expect(FriendStore.getAll()).toHaveLength(0);
  });

  it('ne supprime pas les autres amis', () => {
    const alice = FriendStore.add('Alice', CHATELET);
    const bob = FriendStore.add('Bob', NATION);
    FriendStore.remove(alice.id);
    const all = FriendStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(bob.id);
  });

  it('est sans effet si l\'id n\'existe pas', () => {
    FriendStore.add('Alice', CHATELET);
    FriendStore.remove('id-inexistant');
    expect(FriendStore.getAll()).toHaveLength(1);
  });

  it('supprime correctement l\'element du milieu (ordre preserve)', () => {
    const alice = FriendStore.add('Alice', CHATELET);
    const bob = FriendStore.add('Bob', NATION);
    const carl = FriendStore.add('Carl', SAINT_LAZARE);
    FriendStore.remove(bob.id);
    const all = FriendStore.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(alice.id);
    expect(all[1].id).toBe(carl.id);
  });

  it('suppression idempotente (supprimer deux fois le meme id)', () => {
    const f = FriendStore.add('Alice', CHATELET);
    FriendStore.remove(f.id);
    FriendStore.remove(f.id); // 2e appel sans effet
    expect(FriendStore.getAll()).toHaveLength(0);
  });
});

// ── Persistance (US-12 scenario 3) ───────────────────────────────────────────

describe('FriendStore — persistance localStorage (US-12 scenario 3)', () => {
  it('les donnees survivent a un second appel getAll (simule fermeture/reouverture)', () => {
    FriendStore.add('Alice', CHATELET);
    // Simule une "reouverture" : un nouveau appel getAll relit depuis localStorage
    const all = FriendStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Alice');
  });

  it('ajouter puis modifier puis lire : coherence totale', () => {
    const f = FriendStore.add('Alice', CHATELET);
    FriendStore.update(f.id, { name: 'Alicia', station: NATION });
    const all = FriendStore.getAll();
    expect(all[0].name).toBe('Alicia');
    expect(all[0].station.id).toBe(NATION.id);
  });
});
