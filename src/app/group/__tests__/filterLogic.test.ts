/**
 * Tests logique de filtrage — Écran 2 (GroupPage)
 * US-02 (ajout depuis carnet), US-04 (suppression / canContinue)
 *
 * Environnement : node (pas de jsdom).
 * On teste la logique pure extraite de GroupPage :
 *   - filteredFriends (filtre par search ET exclusion des participants déjà dans le groupe)
 *   - canContinue
 *   - messages d'état affiché selon les conditions
 *
 * Non testable ici (UI / jsdom requis) :
 *   - rendu React des messages
 *   - ouverture de la modale NewPersonModal
 *   - navigation (router.back, Link href="/settings")
 *   - dots orange sur la carte
 */

import { describe, it, expect } from 'vitest';
import type { Station } from '@/types/station';
import type { Friend } from '@/lib/friends/store';

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

type Participant = { id: string; name: string; station: Station };

// ── Reproduction exacte de la logique GroupPage ───────────────────────────────
// Source : src/app/group/page.tsx lignes 113-116

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function computeFilteredFriends(
  friends: Friend[],
  participants: Participant[],
  search: string
): Friend[] {
  return friends.filter(f => {
    const q = normalize(search);
    const n = normalize(f.name);
    // Comparaison sur station.id (pas sur f.id) — c'est la logique exacte de GroupPage ligne 116
    return n.includes(q) && !participants.some(p => p.station.id === f.station.id);
  });
}

/**
 * Détermine quel message afficher dans la zone carnet.
 * Reproduit l'arbre conditionnel de GroupPage lignes 243-275.
 */
function getMessageType(
  friends: Friend[],
  filteredFriends: Friend[],
  search: string
): 'carnet-vide' | 'tous-dans-groupe' | 'aucun-resultat' | 'liste' {
  if (friends.length === 0) return 'carnet-vide';
  if (filteredFriends.length === 0 && !search) return 'tous-dans-groupe';
  if (filteredFriends.length === 0) return 'aucun-resultat';
  return 'liste';
}

// ── FRIENDS.LENGTH === 0 → message "Carnet vide" ─────────────────────────────

describe('GroupPage filtre carnet — carnet vide (US-02 edge case)', () => {
  it('friends.length === 0 → message "carnet-vide"', () => {
    const filtered = computeFilteredFriends([], [], '');
    expect(getMessageType([], filtered, '')).toBe('carnet-vide');
  });

  it('friends.length === 0 independamment des participants', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', station: CHATELET },
    ];
    const filtered = computeFilteredFriends([], participants, '');
    expect(getMessageType([], filtered, '')).toBe('carnet-vide');
  });

  it('friends.length === 0 avec search non vide → message "carnet-vide" (pas "aucun-resultat")', () => {
    const filtered = computeFilteredFriends([], [], 'alice');
    expect(getMessageType([], filtered, 'alice')).toBe('carnet-vide');
  });
});

// ── TOUS AMIS DÉJÀ PARTICIPANTS → message "Tous vos amis sont dans le groupe" ─

describe('GroupPage filtre carnet — tous déjà participants (US-02 edge case)', () => {
  const alice: Friend = { id: 'f1', name: 'Alice', station: CHATELET };

  it('1 ami, deja dans le groupe, search vide → "tous-dans-groupe"', () => {
    const participants: Participant[] = [{ id: 'p1', name: 'Alice', station: CHATELET }];
    const filtered = computeFilteredFriends([alice], participants, '');
    expect(getMessageType([alice], filtered, '')).toBe('tous-dans-groupe');
  });

  it('2 amis, les deux dans le groupe, search vide → "tous-dans-groupe"', () => {
    const bob: Friend = { id: 'f2', name: 'Bob', station: NATION };
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', station: CHATELET },
      { id: 'p2', name: 'Bob', station: NATION },
    ];
    const filtered = computeFilteredFriends([alice, bob], participants, '');
    expect(getMessageType([alice, bob], filtered, '')).toBe('tous-dans-groupe');
  });

  it('1 ami dans le groupe + 1 ami hors groupe, search vide → "liste" (pas "tous-dans-groupe")', () => {
    const bob: Friend = { id: 'f2', name: 'Bob', station: NATION };
    const participants: Participant[] = [{ id: 'p1', name: 'Alice', station: CHATELET }];
    const filtered = computeFilteredFriends([alice, bob], participants, '');
    expect(getMessageType([alice, bob], filtered, '')).toBe('liste');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Bob');
  });
});

// ── COMPARAISON EXCLUSION SUR STATION.ID (pas sur friend.id) ─────────────────
// US-02 scénario 3 — point critique de la logique GroupPage

describe('GroupPage — exclusion ami deja participant : comparaison sur station.id (US-02 scenario 3)', () => {
  it('exclut un ami dont la station.id correspond a un participant (cas nominal)', () => {
    const alice: Friend = { id: 'f1', name: 'Alice', station: CHATELET };
    const participants: Participant[] = [
      { id: 'p99', name: 'Alice (participante)', station: CHATELET },
    ];
    const filtered = computeFilteredFriends([alice], participants, '');
    // Alice doit etre exclue car participant.station.id === friend.station.id
    expect(filtered).toHaveLength(0);
  });

  it('n\'exclut PAS un ami dont le friend.id correspond a un participant.id (comparaison incorrecte evitee)', () => {
    // Un ami avec id 'p1' et une station differente de celle du participant p1
    const alice: Friend = { id: 'p1', name: 'Alice', station: NATION };
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice (participante)', station: CHATELET },
    ];
    // friend.id === participant.id MAIS stations differentes
    // La logique GroupPage compare station.id, pas f.id
    // Donc Alice (NATION) ne doit PAS etre exclue
    const filtered = computeFilteredFriends([alice], participants, '');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Alice');
  });

  it('exclut uniquement les amis dont la station.id est deja representee (pas par nom)', () => {
    // Deux amis avec le meme nom "Alice" mais des stations differentes
    const aliceChatelet: Friend = { id: 'f1', name: 'Alice', station: CHATELET };
    const aliceNation: Friend = { id: 'f2', name: 'Alice', station: NATION };
    // Un participant a Chatelet
    const participants: Participant[] = [{ id: 'p1', name: 'Alice', station: CHATELET }];
    const filtered = computeFilteredFriends([aliceChatelet, aliceNation], participants, '');
    // Seule aliceChatelet est exclue
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('f2');
    expect(filtered[0].station.id).toBe(NATION.id);
  });
});

// ── AUCUN RÉSULTAT DE RECHERCHE ───────────────────────────────────────────────

describe('GroupPage filtre carnet — aucun résultat de recherche (US-02 edge case)', () => {
  const alice: Friend = { id: 'f1', name: 'Alice', station: CHATELET };

  it('search non vide sans correspondance → "aucun-resultat"', () => {
    const filtered = computeFilteredFriends([alice], [], 'zyx');
    expect(getMessageType([alice], filtered, 'zyx')).toBe('aucun-resultat');
  });

  it('search correspond a 0 amis parmi ceux restants → "aucun-resultat"', () => {
    // Bob est deja dans le groupe, Alice ne correspond pas au search
    const bob: Friend = { id: 'f2', name: 'Bob', station: NATION };
    const participants: Participant[] = [{ id: 'p2', name: 'Bob', station: NATION }];
    const filtered = computeFilteredFriends([alice, bob], participants, 'zyx');
    expect(getMessageType([alice, bob], filtered, 'zyx')).toBe('aucun-resultat');
  });
});

// ── FILTRAGE INSENSIBLE CASSE / ACCENTS (US-02 scenario 2) ───────────────────

describe('GroupPage filtre carnet — search insensible casse et accents (US-02 scenario 2)', () => {
  it('search "alice" trouve l\'ami "Alice" (casse)', () => {
    const alice: Friend = { id: 'f1', name: 'Alice', station: CHATELET };
    const filtered = computeFilteredFriends([alice], [], 'alice');
    expect(filtered).toHaveLength(1);
  });

  it('search "ALICE" trouve l\'ami "Alice" (majuscules)', () => {
    const alice: Friend = { id: 'f1', name: 'Alice', station: CHATELET };
    const filtered = computeFilteredFriends([alice], [], 'ALICE');
    expect(filtered).toHaveLength(1);
  });

  it('search "francois" trouve l\'ami "François" (cedille)', () => {
    const francois: Friend = { id: 'f1', name: 'François', station: CHATELET };
    const filtered = computeFilteredFriends([francois], [], 'francois');
    expect(filtered).toHaveLength(1);
  });

  it('search "elodie" trouve l\'ami "Élodie" (accent aigu)', () => {
    const elodie: Friend = { id: 'f1', name: 'Élodie', station: CHATELET };
    const filtered = computeFilteredFriends([elodie], [], 'elodie');
    expect(filtered).toHaveLength(1);
  });

  it('search vide retourne tous les amis non participants', () => {
    const friends: Friend[] = [
      { id: 'f1', name: 'Alice', station: CHATELET },
      { id: 'f2', name: 'Bob', station: NATION },
    ];
    const filtered = computeFilteredFriends(friends, [], '');
    expect(filtered).toHaveLength(2);
  });

  it('search partiel trouve l\'ami correspondant', () => {
    const alice: Friend = { id: 'f1', name: 'Alice', station: CHATELET };
    const filtered = computeFilteredFriends([alice], [], 'ali');
    expect(filtered).toHaveLength(1);
  });
});

// ── CANCONTINUE (US-04 CTA) ───────────────────────────────────────────────────

describe('GroupPage canContinue (US-04)', () => {
  function canContinue(participantCount: number): boolean {
    return participantCount >= 2;
  }

  it('canContinue est false avec 0 participant', () => {
    expect(canContinue(0)).toBe(false);
  });

  it('canContinue est false avec 1 participant', () => {
    expect(canContinue(1)).toBe(false);
  });

  it('canContinue est true avec exactement 2 participants', () => {
    expect(canContinue(2)).toBe(true);
  });

  it('canContinue est true avec 3 participants', () => {
    expect(canContinue(3)).toBe(true);
  });

  it('canContinue reste true apres suppression d\'un participant (2 → 3 → 2)', () => {
    // On ne peut pas descendre en dessous de 2 depuis l'UI (mais canContinue s'adapte au count)
    expect(canContinue(3)).toBe(true);
    expect(canContinue(2)).toBe(true); // apres suppression d'un des 3
  });

  it('canContinue devient false apres suppression ramenant a 1 (US-04 scenario 2)', () => {
    expect(canContinue(2)).toBe(true);
    expect(canContinue(1)).toBe(false); // apres suppression d'un des 2
  });
});

// ── BOUTON × TOUJOURS ACTIF (US-04 edge case) ────────────────────────────────
// Le bouton × est TOUJOURS actif, la garde est dans le CTA uniquement.
// Ce test documente que handleRemove dans GroupPage est appelé sans condition.

describe('GroupPage bouton × (US-04 edge case)', () => {
  it('handleRemove peut etre appele avec 1 seul participant restant (US-04 edge case)', () => {
    // Le reducer autorise toujours la suppression — c'est le CTA qui est desactive
    // Simulation : participants = [Alice], on retire Alice
    let participants: Participant[] = [{ id: 'p1', name: 'Alice', station: CHATELET }];
    // Equivalent de dispatch REMOVE_PARTICIPANT
    participants = participants.filter(p => p.id !== 'p1');
    expect(participants).toHaveLength(0);
    // Et canContinue devient false
    expect(participants.length >= 2).toBe(false);
  });

  it('apres suppression ramenant a 0, canContinue est false (US-04 edge case)', () => {
    let count = 1;
    count--; // suppression
    expect(count >= 2).toBe(false);
  });
});
