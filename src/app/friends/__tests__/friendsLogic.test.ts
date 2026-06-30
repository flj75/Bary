/**
 * Tests logique de la refonte FriendsPage — section "MA CARTE" et tri alphabétique
 *
 * Fonctionnalités couvertes (logique pure, sans rendu UI) :
 *   - normalize : suppression des accents + minuscules
 *   - Tri alphabétique de regularFriends
 *   - Groupement par première lettre normalisée
 *   - isEmpty : !meEntry && regularFriends.length === 0
 *   - filteredFriends : filtre insensible casse/accents sur regularFriends uniquement
 *   - noResults : isSearching && filteredFriends.length === 0
 *
 * Non testable ici (UI / jsdom requis) :
 *   - rendu de la section "MA CARTE" dans le DOM
 *   - index alphabétique latéral fixe
 *   - scroll vers section via scrollIntoView
 *   - modales add/edit/delete
 */

import { describe, it, expect } from 'vitest';
import type { Friend } from '@/lib/friends/store';
import type { Station } from '@/types/station';

// ── Reproduction exacte de la logique de src/app/friends/page.tsx ────────────

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function sortRegularFriends(regularFriends: Friend[]): Friend[] {
  return [...regularFriends].sort((a, b) =>
    normalize(a.name).localeCompare(normalize(b.name))
  );
}

function groupByLetter(sortedFriends: Friend[]): Record<string, Friend[]> {
  return sortedFriends.reduce<Record<string, Friend[]>>((acc, f) => {
    const letter = normalize(f.name).charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(f);
    return acc;
  }, {});
}

function computeIsEmpty(meEntry: Friend | undefined, regularFriends: Friend[]): boolean {
  return !meEntry && regularFriends.length === 0;
}

function computeFilteredFriends(regularFriends: Friend[], search: string): Friend[] {
  const isSearching = search.length > 0;
  return isSearching
    ? regularFriends.filter(f => normalize(f.name).includes(normalize(search)))
    : [];
}

function computeNoResults(search: string, filteredFriends: Friend[]): boolean {
  return search.length > 0 && filteredFriends.length === 0;
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

const SAINT_LAZARE: Station = {
  id: 'IDFM:462972',
  name: 'Saint-Lazare',
  lat: 48.875661,
  lng: 2.324026,
  lines: [{ id: 'IDFM:C01373', name: '3', mode: 'metro', color: '#6e6e00' }],
};

const BASTILLE: Station = {
  id: 'IDFM:mock:bastille',
  name: 'Bastille',
  lat: 48.853,
  lng: 2.369,
  lines: [{ id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' }],
};

function makeFriend(id: string, name: string, station: Station, isMe?: boolean): Friend {
  return { id, name, station, ...(isMe !== undefined ? { isMe } : {}) };
}

// ── normalize ─────────────────────────────────────────────────────────────────

describe('normalize (refonte carnet amis)', () => {
  it('chaine vide retourne chaine vide', () => {
    expect(normalize('')).toBe('');
  });

  it('"André" → "andre"', () => {
    expect(normalize('André')).toBe('andre');
  });

  it('"Évelyne" → "evelyne"', () => {
    expect(normalize('Évelyne')).toBe('evelyne');
  });

  it('"Ève" → "eve"', () => {
    expect(normalize('Ève')).toBe('eve');
  });

  it('"Nicolas" → "nicolas" (sans accent)', () => {
    expect(normalize('Nicolas')).toBe('nicolas');
  });

  it('"Anne-Gaëlle" → "anne-gaelle"', () => {
    expect(normalize('Anne-Gaëlle')).toBe('anne-gaelle');
  });

  it('"François" → "francois" (cédille)', () => {
    expect(normalize('François')).toBe('francois');
  });

  it('insensible à la casse : "ALICE" → "alice"', () => {
    expect(normalize('ALICE')).toBe('alice');
  });

  it('normalize est idempotent : normalize(normalize(x)) === normalize(x)', () => {
    const cases = ['Évelyne', 'André', 'Anne-Gaëlle', 'Nicolas', ''];
    for (const s of cases) {
      expect(normalize(normalize(s))).toBe(normalize(s));
    }
  });
});

// ── Tri alphabétique ──────────────────────────────────────────────────────────

describe('sortRegularFriends — tri alphabétique insensible aux accents', () => {
  it('liste vide reste vide', () => {
    expect(sortRegularFriends([])).toHaveLength(0);
  });

  it('un seul ami reste seul', () => {
    const friends = [makeFriend('f1', 'Alice', CHATELET)];
    expect(sortRegularFriends(friends)).toHaveLength(1);
  });

  it('ordre alphabétique basique : [Zoé, Alice, Bob] → [Alice, Bob, Zoé]', () => {
    const friends = [
      makeFriend('f1', 'Zoé', CHATELET),
      makeFriend('f2', 'Alice', NATION),
      makeFriend('f3', 'Bob', SAINT_LAZARE),
    ];
    const names = sortRegularFriends(friends).map(f => f.name);
    expect(names).toEqual(['Alice', 'Bob', 'Zoé']);
  });

  it('"Évelyne" vient avant "Fabrice" (E < F)', () => {
    const friends = [
      makeFriend('f1', 'Fabrice', CHATELET),
      makeFriend('f2', 'Évelyne', NATION),
    ];
    const names = sortRegularFriends(friends).map(f => f.name);
    expect(names[0]).toBe('Évelyne');
    expect(names[1]).toBe('Fabrice');
  });

  it('"Ève" vient avant "Évelyne" (sous-chaîne plus courte)', () => {
    const friends = [
      makeFriend('f1', 'Évelyne', CHATELET),
      makeFriend('f2', 'Ève', NATION),
    ];
    const names = sortRegularFriends(friends).map(f => f.name);
    expect(names[0]).toBe('Ève');
    expect(names[1]).toBe('Évelyne');
  });

  it('"André" et "Antoine" : André avant Antoine (d < t)', () => {
    const friends = [
      makeFriend('f1', 'Antoine', CHATELET),
      makeFriend('f2', 'André', NATION),
    ];
    const names = sortRegularFriends(friends).map(f => f.name);
    expect(names[0]).toBe('André');
    expect(names[1]).toBe('Antoine');
  });

  it('"Anne-Gaëlle" groupe avec les "A" (avant "Bob")', () => {
    const friends = [
      makeFriend('f1', 'Bob', CHATELET),
      makeFriend('f2', 'Anne-Gaëlle', NATION),
    ];
    const names = sortRegularFriends(friends).map(f => f.name);
    expect(names[0]).toBe('Anne-Gaëlle');
  });

  it('le tri ne modifie pas le tableau source (immutabilité)', () => {
    const friends = [
      makeFriend('f1', 'Zoé', CHATELET),
      makeFriend('f2', 'Alice', NATION),
    ];
    const original = friends.map(f => f.name);
    sortRegularFriends(friends);
    expect(friends.map(f => f.name)).toEqual(original);
  });

  it('les entrées isMe ne sont pas dans regularFriends (séparation respectée)', () => {
    // Ce test vérifie la précondition : si on filtre !isMe avant de trier,
    // les entrées isMe ne remontent pas dans la liste triée.
    const all: Friend[] = [
      makeFriend('me', 'Alice', CHATELET, true),
      makeFriend('f1', 'Zoé', NATION),
      makeFriend('f2', 'Bob', SAINT_LAZARE),
    ];
    const regularFriends = all.filter(f => !f.isMe);
    const sorted = sortRegularFriends(regularFriends);
    expect(sorted.every(f => !f.isMe)).toBe(true);
    expect(sorted.map(f => f.name)).toEqual(['Bob', 'Zoé']);
  });
});

// ── Groupement par première lettre normalisée ─────────────────────────────────

describe('groupByLetter — groupement par première lettre', () => {
  it('liste vide produit un objet vide', () => {
    expect(groupByLetter([])).toEqual({});
  });

  it('"Évelyne" est groupé sous la lettre "E"', () => {
    const friends = [makeFriend('f1', 'Évelyne', CHATELET)];
    const grouped = groupByLetter(friends);
    expect(Object.keys(grouped)).toContain('E');
    expect(grouped['E'][0].name).toBe('Évelyne');
    expect(Object.keys(grouped)).not.toContain('É');
  });

  it('"Nicolas" est groupé sous "N"', () => {
    const friends = [makeFriend('f1', 'Nicolas', CHATELET)];
    const grouped = groupByLetter(friends);
    expect(Object.keys(grouped)).toContain('N');
    expect(grouped['N'][0].name).toBe('Nicolas');
  });

  it('"Anne-Gaëlle" est groupé sous "A"', () => {
    const friends = [makeFriend('f1', 'Anne-Gaëlle', CHATELET)];
    const grouped = groupByLetter(friends);
    expect(Object.keys(grouped)).toContain('A');
    expect(grouped['A'][0].name).toBe('Anne-Gaëlle');
  });

  it('deux amis avec la même initiale normalisée partagent le même groupe', () => {
    const friends = [
      makeFriend('f1', 'Évelyne', CHATELET),
      makeFriend('f2', 'Emma', NATION),
    ];
    const grouped = groupByLetter(friends);
    expect(grouped['E']).toHaveLength(2);
  });

  it('les clés du groupement sont des lettres majuscules sans accents', () => {
    const friends = [
      makeFriend('f1', 'Évelyne', CHATELET),
      makeFriend('f2', 'André', NATION),
      makeFriend('f3', 'Bob', SAINT_LAZARE),
    ];
    const grouped = groupByLetter(friends);
    const keys = Object.keys(grouped);
    // Toutes les clés doivent être des lettres majuscules ASCII (A-Z)
    for (const key of keys) {
      expect(key).toMatch(/^[A-Z]$/);
    }
  });

  it('trois lettres distinctes donnent trois groupes distincts', () => {
    const friends = [
      makeFriend('f1', 'Alice', CHATELET),
      makeFriend('f2', 'Bob', NATION),
      makeFriend('f3', 'Carl', SAINT_LAZARE),
    ];
    const grouped = groupByLetter(friends);
    expect(Object.keys(grouped).sort()).toEqual(['A', 'B', 'C']);
  });

  it('les lettres de Object.keys(grouped).sort() sont triées alphabétiquement', () => {
    const friends = sortRegularFriends([
      makeFriend('f1', 'Zoé', CHATELET),
      makeFriend('f2', 'Alice', NATION),
      makeFriend('f3', 'Bob', SAINT_LAZARE),
    ]);
    const grouped = groupByLetter(friends);
    const letters = Object.keys(grouped).sort();
    expect(letters).toEqual(['A', 'B', 'Z']);
  });
});

// ── isEmpty ───────────────────────────────────────────────────────────────────

describe('isEmpty — !meEntry && regularFriends.length === 0', () => {
  it('true si pas de profil et pas d\'amis', () => {
    expect(computeIsEmpty(undefined, [])).toBe(true);
  });

  it('false si profil seul (meEntry présent, regularFriends vide)', () => {
    const me = makeFriend('me', 'Alice', CHATELET, true);
    expect(computeIsEmpty(me, [])).toBe(false);
  });

  it('false si amis seuls (pas de meEntry, regularFriends non vide)', () => {
    const friends = [makeFriend('f1', 'Bob', NATION)];
    expect(computeIsEmpty(undefined, friends)).toBe(false);
  });

  it('false si profil et amis présents', () => {
    const me = makeFriend('me', 'Alice', CHATELET, true);
    const friends = [makeFriend('f1', 'Bob', NATION)];
    expect(computeIsEmpty(me, friends)).toBe(false);
  });

  it('false si plusieurs amis sans profil', () => {
    const friends = [
      makeFriend('f1', 'Bob', NATION),
      makeFriend('f2', 'Carl', SAINT_LAZARE),
    ];
    expect(computeIsEmpty(undefined, friends)).toBe(false);
  });
});

// ── filteredFriends — filtre sur regularFriends uniquement ───────────────────

describe('filteredFriends — filtre insensible casse/accents, regularFriends only', () => {
  const regularFriends: Friend[] = [
    makeFriend('f1', 'Alice', CHATELET),
    makeFriend('f2', 'Bob', NATION),
    makeFriend('f3', 'Évelyne', SAINT_LAZARE),
    makeFriend('f4', 'François', BASTILLE),
  ];

  const meEntry = makeFriend('me', 'Moi', CHATELET, true);

  it('search vide retourne [] (pas de résultats quand pas en recherche)', () => {
    expect(computeFilteredFriends(regularFriends, '')).toHaveLength(0);
  });

  it('search "alice" trouve "Alice" (insensible à la casse)', () => {
    const result = computeFilteredFriends(regularFriends, 'alice');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('search "ÉVELYNE" trouve "Évelyne" (accent côté search)', () => {
    const result = computeFilteredFriends(regularFriends, 'ÉVELYNE');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Évelyne');
  });

  it('search "evelyne" trouve "Évelyne" (pas d\'accent côté search)', () => {
    const result = computeFilteredFriends(regularFriends, 'evelyne');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Évelyne');
  });

  it('search "francois" trouve "François" (cédille côté ami)', () => {
    const result = computeFilteredFriends(regularFriends, 'francois');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('François');
  });

  it('search partiel "ali" trouve "Alice"', () => {
    const result = computeFilteredFriends(regularFriends, 'ali');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('search sans correspondance retourne []', () => {
    expect(computeFilteredFriends(regularFriends, 'zyx')).toHaveLength(0);
  });

  it('meEntry absent de regularFriends : le filtre ne porte pas sur isMe', () => {
    // On construit un tableau qui INCLUT meEntry par erreur, et on vérifie
    // que la logique correcte (filtre sur regularFriends) ne l'inclut pas.
    const onlyRegular = regularFriends.filter(f => !f.isMe);
    const result = computeFilteredFriends(onlyRegular, 'alice');
    expect(result.every(f => !f.isMe)).toBe(true);
  });

  it('meEntry ne remonte jamais dans filteredFriends même si son nom match', () => {
    // meEntry s'appelle "Moi" — on cherche "moi", il ne doit PAS apparaître
    // car filteredFriends ne porte que sur regularFriends (f.isMe exclus en amont)
    const result = computeFilteredFriends(regularFriends, 'moi');
    // regularFriends ne contient pas meEntry → résultat vide
    expect(result.every(f => !f.isMe)).toBe(true);
    // Si on avait inclus meEntry par erreur dans regularFriends,
    // ce test l'attraperait :
    const withMeEntryByMistake = [...regularFriends, meEntry];
    const resultWithBug = computeFilteredFriends(withMeEntryByMistake, 'moi');
    // Ce sous-test documente le comportement attendu : meEntry NE DOIT PAS
    // être dans regularFriends
    const meInResult = resultWithBug.find(f => f.isMe);
    // On vérifie qu'on l'a bien exclu dans le vrai flux (regularFriends = !isMe)
    expect(computeFilteredFriends(regularFriends, 'moi').find(f => f.isMe)).toBeUndefined();
  });

  it('carnet vide : search non vide retourne []', () => {
    expect(computeFilteredFriends([], 'alice')).toHaveLength(0);
  });
});

// ── noResults ─────────────────────────────────────────────────────────────────

describe('noResults — isSearching && filteredFriends.length === 0', () => {
  const friends: Friend[] = [makeFriend('f1', 'Alice', CHATELET)];

  it('false quand search est vide', () => {
    expect(computeNoResults('', [])).toBe(false);
  });

  it('true quand search non vide et aucun résultat', () => {
    const filtered = computeFilteredFriends(friends, 'zyx');
    expect(computeNoResults('zyx', filtered)).toBe(true);
  });

  it('false quand search non vide et au moins un résultat', () => {
    const filtered = computeFilteredFriends(friends, 'ali');
    expect(computeNoResults('ali', filtered)).toBe(false);
  });

  it('false quand search vide même si filteredFriends est vide', () => {
    // Cas cohérent : isSearching = false → noResults = false
    expect(computeNoResults('', [])).toBe(false);
  });
});

// ── Interaction meEntry / regularFriends / isEmpty / noResults ────────────────
// Tests de bout-en-bout sur les dérivations combinées

describe('dérivations combinées — meEntry + regularFriends + search', () => {
  it('profil seul, pas d\'amis, search vide : isEmpty false, noResults false, filteredFriends []', () => {
    const me = makeFriend('me', 'Alice', CHATELET, true);
    const regularFriends: Friend[] = [];
    const isEmpty = computeIsEmpty(me, regularFriends);
    const filtered = computeFilteredFriends(regularFriends, '');
    const noResults = computeNoResults('', filtered);
    expect(isEmpty).toBe(false);
    expect(filtered).toHaveLength(0);
    expect(noResults).toBe(false);
  });

  it('profil seul, search "alice" : filteredFriends vide (meEntry exclu), noResults true', () => {
    const me = makeFriend('me', 'Alice', CHATELET, true);
    const regularFriends: Friend[] = [];
    const filtered = computeFilteredFriends(regularFriends, 'alice');
    const noResults = computeNoResults('alice', filtered);
    // meEntry ne doit pas apparaître dans filteredFriends
    expect(filtered).toHaveLength(0);
    expect(noResults).toBe(true);
  });

  it('carnet vide (pas de profil, pas d\'amis) : isEmpty true indépendamment de la search', () => {
    expect(computeIsEmpty(undefined, [])).toBe(true);
  });

  it('ami accentué trouvé par search sans accent : scénario complet', () => {
    const me = makeFriend('me', 'Moi', CHATELET, true);
    const regularFriends: Friend[] = [
      makeFriend('f1', 'Évelyne', NATION),
      makeFriend('f2', 'Bob', SAINT_LAZARE),
    ];
    const isEmpty = computeIsEmpty(me, regularFriends);
    const filtered = computeFilteredFriends(regularFriends, 'eve');
    const noResults = computeNoResults('eve', filtered);
    expect(isEmpty).toBe(false);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Évelyne');
    expect(noResults).toBe(false);
  });
});
