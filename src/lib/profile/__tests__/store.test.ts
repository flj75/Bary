/**
 * Tests ProfileStore — US-19 (Créer et éditer son profil utilisateur)
 *
 * Environnement : node (pas de window/localStorage natifs).
 * On fournit un stub minimal de localStorage avant chaque test.
 *
 * Ce fichier couvre :
 *   - ProfileStore.get / exists / set
 *   - Synchronisation atomique avec FriendStore.upsertMe (scénario 2)
 *   - Persistance sous la clé bary_profile
 *   - Propagation de l'erreur storage_full
 *   - Cas limites : localStorage vide, JSON invalide
 *
 * Hors périmètre (UI / jsdom requis) :
 *   - Modale OnboardingModal et ses boutons
 *   - Toast "stockage plein" dans page.tsx
 *   - Navigation vers /group
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ── Stub localStorage ─────────────────────────────────────────────────────────

const store: Record<string, string> = {};

const localStorageStub = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

(globalThis as unknown as Record<string, unknown>).window = globalThis;
(globalThis as unknown as Record<string, unknown>).localStorage = localStorageStub;

// Import APRES l'installation de window
import { ProfileStore } from '../store';
import { FriendStore } from '@/lib/friends/store';
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

// ── Isolation : localStorage propre avant chaque test ────────────────────────

beforeEach(() => {
  localStorageStub.clear();
  localStorageStub.setItem = (key: string, value: string) => { store[key] = value; };
});

// ── ProfileStore.get ──────────────────────────────────────────────────────────

describe('ProfileStore.get (US-19)', () => {
  it('retourne null si localStorage est vide', () => {
    expect(ProfileStore.get()).toBeNull();
  });

  it('retourne null si la clé bary_profile est absente', () => {
    localStorageStub.setItem('autre_cle', 'valeur');
    expect(ProfileStore.get()).toBeNull();
  });

  it('retourne le profil persisté après un set', () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const profile = ProfileStore.get();
    expect(profile).not.toBeNull();
    expect(profile?.name).toBe('Alice');
    expect(profile?.station.id).toBe(CHATELET.id);
  });

  it('retourne null si le JSON stocké est invalide (résilience)', () => {
    localStorageStub.setItem('bary_profile', 'INVALID_JSON{{{');
    expect(ProfileStore.get()).toBeNull();
  });

  it('conserve la station complète (lat, lng, lines)', () => {
    ProfileStore.set({ name: 'Bob', station: CHATELET });
    const profile = ProfileStore.get();
    expect(profile?.station.lat).toBe(CHATELET.lat);
    expect(profile?.station.lng).toBe(CHATELET.lng);
    expect(profile?.station.lines).toHaveLength(1);
    expect(profile?.station.lines[0].color).toBe('#ffbe00');
  });
});

// ── ProfileStore.exists ───────────────────────────────────────────────────────

describe('ProfileStore.exists (US-19 — scénario 1 : déclenchement de la modale)', () => {
  it('retourne false si localStorage est vide', () => {
    expect(ProfileStore.exists()).toBe(false);
  });

  it('retourne false si la clé bary_profile est absente', () => {
    localStorageStub.setItem('bary_friends', '[]');
    expect(ProfileStore.exists()).toBe(false);
  });

  it('retourne true après un set', () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    expect(ProfileStore.exists()).toBe(true);
  });

  it('retourne true même si le JSON stocké est invalide (la clé existe)', () => {
    // exists vérifie uniquement la présence de la clé, pas la validité du contenu
    localStorageStub.setItem('bary_profile', 'INVALID_JSON{{{');
    expect(ProfileStore.exists()).toBe(true);
  });
});

// ── ProfileStore.set ──────────────────────────────────────────────────────────

describe('ProfileStore.set — persistance bary_profile (US-19 scénario 2)', () => {
  it('persiste le profil sous la clé bary_profile', () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const raw = localStorageStub.getItem('bary_profile');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.name).toBe('Alice');
    expect(parsed.station.id).toBe(CHATELET.id);
  });

  it('écrase le profil précédent (idempotence)', () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    ProfileStore.set({ name: 'Bob', station: NATION });
    const profile = ProfileStore.get();
    expect(profile?.name).toBe('Bob');
    expect(profile?.station.id).toBe(NATION.id);
  });

  it("set avec un nom contenant des espaces le conserve tel quel (trim est à la charge de l'UI)", () => {
    ProfileStore.set({ name: '  Alice  ', station: CHATELET });
    const profile = ProfileStore.get();
    expect(profile?.name).toBe('  Alice  ');
  });
});

// ── Synchronisation atomique ProfileStore ↔ FriendStore (scénario 2) ─────────

describe('ProfileStore.set — synchronisation atomique avec FriendStore (US-19 scénario 2)', () => {
  it('crée une entrée isMe dans le carnet lors du premier set', () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const friends = FriendStore.getAll();
    const me = friends.find(f => f.isMe);
    expect(me).toBeDefined();
    expect(me?.name).toBe('Alice');
    expect(me?.station.id).toBe(CHATELET.id);
  });

  it("l'entrée isMe est la seule créée quand le carnet est vide", () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const friends = FriendStore.getAll();
    expect(friends).toHaveLength(1);
    expect(friends[0].isMe).toBe(true);
  });

  it("l'entrée isMe est mise à jour (pas dupliquée) lors d'un second set", () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    ProfileStore.set({ name: 'Alicia', station: NATION });
    const friends = FriendStore.getAll();
    const meEntries = friends.filter(f => f.isMe);
    expect(meEntries).toHaveLength(1);
    expect(meEntries[0].name).toBe('Alicia');
    expect(meEntries[0].station.id).toBe(NATION.id);
  });

  it("l'entrée isMe conserve son id après une modification de profil", () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const idBefore = FriendStore.getAll().find(f => f.isMe)?.id;
    ProfileStore.set({ name: 'Alicia', station: NATION });
    const idAfter = FriendStore.getAll().find(f => f.isMe)?.id;
    expect(idBefore).toBeDefined();
    expect(idBefore).toBe(idAfter);
  });

  it("l'entrée isMe est positionnée en tête du carnet (upsertMe insère en tête)", () => {
    // On ajoute d'abord un ami classique, puis on crée le profil
    FriendStore.add('Bob', NATION);
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const friends = FriendStore.getAll();
    expect(friends[0].isMe).toBe(true);
    expect(friends[0].name).toBe('Alice');
  });

  it("bary_profile et bary_friends sont cohérents après un set", () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const profile = ProfileStore.get();
    const me = FriendStore.getAll().find(f => f.isMe);
    expect(profile?.name).toBe(me?.name);
    expect(profile?.station.id).toBe(me?.station.id);
  });

  it("après un second set, bary_profile et bary_friends restent cohérents", () => {
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    ProfileStore.set({ name: 'Alicia', station: NATION });
    const profile = ProfileStore.get();
    const me = FriendStore.getAll().find(f => f.isMe);
    expect(profile?.name).toBe(me?.name);
    expect(profile?.station.id).toBe(me?.station.id);
  });

  it("les amis non-isMe ne sont pas affectés par un set profil", () => {
    FriendStore.add('Bob', NATION);
    FriendStore.add('Carl', CHATELET);
    ProfileStore.set({ name: 'Alice', station: CHATELET });
    const friends = FriendStore.getAll();
    const nonMe = friends.filter(f => !f.isMe);
    expect(nonMe).toHaveLength(2);
    expect(nonMe.map(f => f.name)).toContain('Bob');
    expect(nonMe.map(f => f.name)).toContain('Carl');
  });
});

// ── ProfileStore.set — gestion storage_full (edge case US-19) ────────────────

describe('ProfileStore.set — erreur storage_full (US-19 edge case localStorage indisponible)', () => {
  it('propage une Error("storage_full") si localStorage.setItem lance', () => {
    localStorageStub.setItem = (_key: string, _value: string) => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    };
    expect(() => ProfileStore.set({ name: 'Alice', station: CHATELET })).toThrow('storage_full');
  });
});

// ── ProfileStore.get — profil incomplet (US-20 edge case) ────────────────────

describe('ProfileStore.get — profil incomplet retourne null (US-20)', () => {
  it('retourne null si le profil stocké ne contient pas de name (station seule)', () => {
    // Simule un objet partiellement écrit : station présente mais name absent
    localStorageStub.setItem('bary_profile', JSON.stringify({ station: CHATELET }));
    expect(ProfileStore.get()).toBeNull();
  });

  it('retourne null si le profil stocké ne contient pas de station (name seul)', () => {
    // Simule un objet partiellement écrit : name présent mais station absente
    localStorageStub.setItem('bary_profile', JSON.stringify({ name: 'Alice' }));
    expect(ProfileStore.get()).toBeNull();
  });

  it('retourne null si le profil stocké est un objet vide {}', () => {
    localStorageStub.setItem('bary_profile', JSON.stringify({}));
    expect(ProfileStore.get()).toBeNull();
  });

  it('retourne null si name est une chaîne vide (falsy)', () => {
    localStorageStub.setItem('bary_profile', JSON.stringify({ name: '', station: CHATELET }));
    expect(ProfileStore.get()).toBeNull();
  });

  it('retourne null si station est null', () => {
    localStorageStub.setItem('bary_profile', JSON.stringify({ name: 'Alice', station: null }));
    expect(ProfileStore.get()).toBeNull();
  });

  it('retourne le profil complet si name et station sont tous deux présents', () => {
    // Contrôle positif : un profil complet ne doit pas être rejeté
    localStorageStub.setItem('bary_profile', JSON.stringify({ name: 'Alice', station: CHATELET }));
    const profile = ProfileStore.get();
    expect(profile).not.toBeNull();
    expect(profile?.name).toBe('Alice');
    expect(profile?.station.id).toBe(CHATELET.id);
  });
});
