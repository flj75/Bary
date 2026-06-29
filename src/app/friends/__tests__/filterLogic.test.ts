/**
 * Tests logique de filtrage — Écran 5 (FriendsPage)
 * US-15 (recherche dans le carnet)
 *
 * Environnement : node (pas de jsdom).
 * On teste la logique pure extraite de FriendsPage :
 *   - normalize (helper)
 *   - filtered = friends.filter(f => normalize(f.name).includes(normalize(search)))
 *   - isEmpty / noResults
 *   - avatarColor (déterminisme de la couleur)
 *
 * Non testable ici (UI / jsdom requis) :
 *   - rendu des modales (FriendFormModal, DeleteConfirmModal)
 *   - titre de la modale d'édition ("Modifier") vs ajout ("Ajouter un ami")
 *   - tap sur une ligne → modal type 'edit'
 *   - tap "× Supprimer" → modal type 'delete'
 *   - tap "+ Ajouter un ami" → modal type 'add'
 *   - confirmation suppression → ami retiré de la liste
 *   - initialName pré-rempli avec la valeur de search dans le CTA "Ajouter {search} comme ami"
 */

import { describe, it, expect } from 'vitest';
import type { Friend } from '@/lib/friends/store';
import type { Station } from '@/types/station';

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

// ── Reproduction exacte de la logique FriendsPage ─────────────────────────────
// Source : src/app/friends/page.tsx lignes 12-13 et 159-164

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function computeFiltered(friends: Friend[], search: string): Friend[] {
  return friends.filter(f => normalize(f.name).includes(normalize(search)));
}

function computeStates(friends: Friend[], filtered: Friend[], search: string) {
  const isEmpty = friends.length === 0;
  const noResults = !isEmpty && filtered.length === 0 && search.length > 0;
  return { isEmpty, noResults };
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500',
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── normalize ─────────────────────────────────────────────────────────────────

describe('FriendsPage — normalize (US-15)', () => {
  it('convertit en minuscules', () => {
    expect(normalize('Alice')).toBe('alice');
    expect(normalize('BOB')).toBe('bob');
  });

  it('supprime les accents (e accent aigu)', () => {
    expect(normalize('Élodie')).toBe('elodie');
  });

  it('supprime la cedille', () => {
    expect(normalize('François')).toBe('francois');
  });

  it('supprime les accents graves', () => {
    expect(normalize('Hélène')).toBe('helene');
  });

  it('chaine vide reste vide', () => {
    expect(normalize('')).toBe('');
  });

  it('caracteres sans accent non modifies (hors casse)', () => {
    expect(normalize('Alex')).toBe('alex');
  });
});

// ── Filtrage insensible casse et accents (US-15 scenario 1) ──────────────────

describe('FriendsPage — filtrage search (US-15 scenario 1)', () => {
  const friends: Friend[] = [
    { id: 'f1', name: 'Alice', station: CHATELET },
    { id: 'f2', name: 'Bob', station: NATION },
    { id: 'f3', name: 'Élodie', station: SAINT_LAZARE },
    { id: 'f4', name: 'François', station: CHATELET },
  ];

  it('search vide retourne tous les amis', () => {
    expect(computeFiltered(friends, '')).toHaveLength(4);
  });

  it('search "alice" trouve "Alice" (casse)', () => {
    const result = computeFiltered(friends, 'alice');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('search "ALICE" trouve "Alice" (majuscules)', () => {
    const result = computeFiltered(friends, 'ALICE');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('search "elodie" trouve "Élodie" (accent cote ami)', () => {
    const result = computeFiltered(friends, 'elodie');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Élodie');
  });

  it('search "Élodie" trouve "Élodie" (accent cote search aussi)', () => {
    const result = computeFiltered(friends, 'Élodie');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Élodie');
  });

  it('search "francois" trouve "François" (cedille cote ami)', () => {
    const result = computeFiltered(friends, 'francois');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('François');
  });

  it('search partiel "ali" trouve "Alice"', () => {
    const result = computeFiltered(friends, 'ali');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('search "zyx" ne trouve personne', () => {
    const result = computeFiltered(friends, 'zyx');
    expect(result).toHaveLength(0);
  });

  it('search "o" trouve Bob et Élodie et François (contient "o")', () => {
    const result = computeFiltered(friends, 'o');
    const names = result.map(f => f.name);
    expect(names).toContain('Bob');
    expect(names).toContain('Élodie');
    expect(names).toContain('François');
    expect(names).not.toContain('Alice');
  });
});

// ── isEmpty / noResults (US-15 scenario 2 + états vide) ──────────────────────

describe('FriendsPage — isEmpty et noResults (US-15 scenario 2 + état vide)', () => {
  it('isEmpty true quand friends.length === 0', () => {
    const filtered = computeFiltered([], '');
    const { isEmpty } = computeStates([], filtered, '');
    expect(isEmpty).toBe(true);
  });

  it('isEmpty false quand au moins 1 ami', () => {
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    const filtered = computeFiltered(friends, '');
    const { isEmpty } = computeStates(friends, filtered, '');
    expect(isEmpty).toBe(false);
  });

  it('noResults false quand isEmpty (carnet vide)', () => {
    const filtered = computeFiltered([], 'alice');
    const { noResults } = computeStates([], filtered, 'alice');
    expect(noResults).toBe(false);
  });

  it('noResults false quand search est vide (meme si filtered vide)', () => {
    // Cas impossible en pratique (si friends > 0 et search vide, filtered = friends)
    // Mais on verifie la condition search.length > 0
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    // On force filtered vide avec search vide (via injection directe)
    const { noResults } = computeStates(friends, [], '');
    expect(noResults).toBe(false);
  });

  it('noResults true quand carnet non vide, filtered vide et search non vide (US-15 scenario 2)', () => {
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    const filtered = computeFiltered(friends, 'zyx');
    const { noResults } = computeStates(friends, filtered, 'zyx');
    expect(noResults).toBe(true);
  });

  it('noResults false si au moins 1 resultat dans filtered', () => {
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    const filtered = computeFiltered(friends, 'ali');
    const { noResults } = computeStates(friends, filtered, 'ali');
    expect(noResults).toBe(false);
  });
});

// ── Condition de rendu de la liste : !isEmpty && !noResults ──────────────────
// FriendsPage affiche la liste uniquement quand les deux sont faux.

describe('FriendsPage — condition rendu liste (!isEmpty && !noResults)', () => {
  it('liste visible : friends > 0, search vide → isEmpty false, noResults false', () => {
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    const filtered = computeFiltered(friends, '');
    const { isEmpty, noResults } = computeStates(friends, filtered, '');
    expect(!isEmpty && !noResults).toBe(true);
  });

  it('liste visible : friends > 0, search match → isEmpty false, noResults false', () => {
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    const filtered = computeFiltered(friends, 'ali');
    const { isEmpty, noResults } = computeStates(friends, filtered, 'ali');
    expect(!isEmpty && !noResults).toBe(true);
  });

  it('liste cachee : friends.length === 0 → isEmpty true', () => {
    const filtered = computeFiltered([], '');
    const { isEmpty, noResults } = computeStates([], filtered, '');
    expect(!isEmpty && !noResults).toBe(false);
  });

  it('liste cachee : noResults true (search sans resultat)', () => {
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    const filtered = computeFiltered(friends, 'zyx');
    const { isEmpty, noResults } = computeStates(friends, filtered, 'zyx');
    expect(!isEmpty && !noResults).toBe(false);
  });
});

// ── Champ search visible uniquement si !isEmpty ───────────────────────────────
// FriendsPage ligne 182 : {!isEmpty && <input ... />}

describe('FriendsPage — champ search conditionnel (US-15)', () => {
  it('champ search visible si friends.length > 0', () => {
    const friends: Friend[] = [{ id: 'f1', name: 'Alice', station: CHATELET }];
    const filtered = computeFiltered(friends, '');
    const { isEmpty } = computeStates(friends, filtered, '');
    expect(!isEmpty).toBe(true); // champ visible
  });

  it('champ search cache si friends.length === 0', () => {
    const filtered = computeFiltered([], '');
    const { isEmpty } = computeStates([], filtered, '');
    expect(!isEmpty).toBe(false); // champ cache
  });
});

// ── avatarColor — determinisme ────────────────────────────────────────────────

describe('FriendsPage — avatarColor determinisme', () => {
  it('meme nom retourne toujours la meme couleur', () => {
    expect(avatarColor('Alice')).toBe(avatarColor('Alice'));
    expect(avatarColor('Bob')).toBe(avatarColor('Bob'));
  });

  it('noms differents peuvent retourner des couleurs differentes', () => {
    // Ce n'est pas garanti, mais la plupart des noms courts ont des couleurs differentes
    const colors = ['Alice', 'Bob', 'Carl', 'David', 'Eve', 'Frank']
      .map(avatarColor);
    const unique = new Set(colors);
    // Au moins 2 couleurs differentes pour 6 noms
    expect(unique.size).toBeGreaterThan(1);
  });

  it('retourne une des 6 couleurs du tableau', () => {
    const validColors = new Set(AVATAR_COLORS);
    ['Alice', 'Bob', 'Carl', 'Élodie', 'François', 'test', ''].forEach(name => {
      expect(validColors.has(avatarColor(name))).toBe(true);
    });
  });

  it('chaine vide retourne une couleur valide (pas de crash)', () => {
    const color = avatarColor('');
    expect(AVATAR_COLORS.includes(color)).toBe(true);
  });
});
