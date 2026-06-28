import { describe, it, expect } from 'vitest';
import { sessionReducer } from '../SessionContext';
import type { SessionState, Participant } from '@/types/session';
import type { Station } from '@/types/station';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHATELET: Station = {
  id: 'IDFM:463079',
  name: 'Chatelet',
  lat: 48.857689,
  lng: 2.347759,
  lines: [
    { id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' },
    { id: 'IDFM:C01374', name: '4', mode: 'metro', color: '#a0006e' },
  ],
};

const NATION: Station = {
  id: 'IDFM:monomodalStopPlace:473875',
  name: 'Nation',
  lat: 48.848233,
  lng: 2.395944,
  lines: [
    { id: 'IDFM:C01371', name: '1', mode: 'metro', color: '#ffbe00' },
    { id: 'IDFM:C01372', name: '2', mode: 'metro', color: '#0055c8' },
  ],
};

const SAINT_LAZARE: Station = {
  id: 'IDFM:462972',
  name: 'Saint-Lazare',
  lat: 48.875661,
  lng: 2.324026,
  lines: [
    { id: 'IDFM:C01373', name: '3', mode: 'metro', color: '#6e6e00' },
    { id: 'IDFM:C01383', name: '13', mode: 'metro', color: '#82c8e6' },
  ],
};

const ALICE: Participant = { id: 'p1', name: 'Alice', station: CHATELET };
const BOB: Participant   = { id: 'p2', name: 'Bob',   station: NATION };
const CARL: Participant  = { id: 'p3', name: 'Carl',  station: SAINT_LAZARE };

const emptyState: SessionState = { participants: [], transportMode: 'metro', result: null };

function stateWith(...participants: Participant[]): SessionState {
  return { participants, transportMode: 'metro', result: null };
}

// ── ADD_PARTICIPANT ───────────────────────────────────────────────────────────

describe('ADD_PARTICIPANT', () => {
  it('ajoute un participant a une liste vide', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ALICE });
    expect(next.participants).toHaveLength(1);
    expect(next.participants[0]).toEqual(ALICE);
  });

  it('ajoute un participant a une liste existante sans ecraser', () => {
    const state = stateWith(ALICE);
    const next = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    expect(next.participants).toHaveLength(2);
    expect(next.participants[0]).toEqual(ALICE);
    expect(next.participants[1]).toEqual(BOB);
  });

  it('ne modifie pas le transportMode', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ALICE });
    expect(next.transportMode).toBe('metro');
  });

  it('retourne un nouvel objet (immutabilite)', () => {
    const state = stateWith(ALICE);
    const next = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    expect(next).not.toBe(state);
    expect(next.participants).not.toBe(state.participants);
  });

  it('permet d\'ajouter le meme participant deux fois (pas de deduplication dans le reducer)', () => {
    // La deduplication est responsabilite de l'UI (US-02 scenario 3), pas du reducer
    const state = stateWith(ALICE);
    const next = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    expect(next.participants).toHaveLength(2);
  });

  it('preserve l\'ordre d\'insertion', () => {
    let state = emptyState;
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: CARL });
    expect(state.participants.map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('canContinue devient true quand 2 participants sont presents (US-04)', () => {
    let state = emptyState;
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    expect(state.participants.length >= 2).toBe(false);
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    expect(state.participants.length >= 2).toBe(true);
  });

  it('canRemove reste false avec exactement 2 participants (US-04 scenario 2)', () => {
    let state = emptyState;
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    expect(state.participants.length > 2).toBe(false);
  });

  it('canRemove devient true avec 3 participants (US-04 scenario 1)', () => {
    let state = emptyState;
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: CARL });
    expect(state.participants.length > 2).toBe(true);
  });

  it('preserve les donnees completes du participant (nom, station, id)', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ALICE });
    const added = next.participants[0];
    expect(added.id).toBe('p1');
    expect(added.name).toBe('Alice');
    expect(added.station.id).toBe('IDFM:463079');
    expect(added.station.lat).toBe(48.857689);
    expect(added.station.lng).toBe(2.347759);
  });
});

// ── REMOVE_PARTICIPANT ────────────────────────────────────────────────────────

describe('REMOVE_PARTICIPANT', () => {
  it('retire un participant existant par son id', () => {
    const state = stateWith(ALICE, BOB, CARL);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p2' } });
    expect(next.participants).toHaveLength(2);
    expect(next.participants.find(p => p.id === 'p2')).toBeUndefined();
  });

  it('laisse les autres participants intacts', () => {
    const state = stateWith(ALICE, BOB, CARL);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p2' } });
    expect(next.participants.find(p => p.id === 'p1')).toEqual(ALICE);
    expect(next.participants.find(p => p.id === 'p3')).toEqual(CARL);
  });

  it('est sans effet si l\'id n\'existe pas (liste inchangee)', () => {
    const state = stateWith(ALICE, BOB);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'inexistant' } });
    expect(next.participants).toHaveLength(2);
  });

  it('retourne un nouvel objet (immutabilite)', () => {
    const state = stateWith(ALICE, BOB, CARL);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p1' } });
    expect(next).not.toBe(state);
    expect(next.participants).not.toBe(state.participants);
  });

  it('le reducer seul peut passer sous 2 participants (la garde minimum est dans l\'UI)', () => {
    // C'est handleRemove dans GroupPage qui verifie canRemove avant de dispatcher
    const state = stateWith(ALICE, BOB);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p1' } });
    expect(next.participants).toHaveLength(1);
  });

  it('retire correctement le premier participant de la liste', () => {
    const state = stateWith(ALICE, BOB, CARL);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p1' } });
    expect(next.participants[0]).toEqual(BOB);
    expect(next.participants[1]).toEqual(CARL);
  });

  it('retire correctement le dernier participant de la liste', () => {
    const state = stateWith(ALICE, BOB, CARL);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p3' } });
    expect(next.participants[0]).toEqual(ALICE);
    expect(next.participants[1]).toEqual(BOB);
  });

  it('ne modifie pas le transportMode', () => {
    const state = stateWith(ALICE, BOB, CARL);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p2' } });
    expect(next.transportMode).toBe('metro');
  });
});

// ── SET_TRANSPORT ─────────────────────────────────────────────────────────────

describe('SET_TRANSPORT', () => {
  it('definit le mode de transport a "metro"', () => {
    const next = sessionReducer(emptyState, { type: 'SET_TRANSPORT', payload: { mode: 'metro' } });
    expect(next.transportMode).toBe('metro');
  });

  it('ne modifie pas la liste des participants', () => {
    const state = stateWith(ALICE, BOB);
    const next = sessionReducer(state, { type: 'SET_TRANSPORT', payload: { mode: 'metro' } });
    expect(next.participants).toHaveLength(2);
    expect(next.participants[0]).toEqual(ALICE);
    expect(next.participants[1]).toEqual(BOB);
  });

  it('retourne un nouvel objet (immutabilite)', () => {
    const next = sessionReducer(emptyState, { type: 'SET_TRANSPORT', payload: { mode: 'metro' } });
    expect(next).not.toBe(emptyState);
  });
});

// ── RESET ─────────────────────────────────────────────────────────────────────

describe('RESET', () => {
  it('vide la liste des participants', () => {
    const state = stateWith(ALICE, BOB, CARL);
    const next = sessionReducer(state, { type: 'RESET' });
    expect(next.participants).toHaveLength(0);
  });

  it('remet le transportMode a "metro"', () => {
    const state = stateWith(ALICE);
    const next = sessionReducer(state, { type: 'RESET' });
    expect(next.transportMode).toBe('metro');
  });

  it('fonctionne sur un etat deja vide (idempotent)', () => {
    const next = sessionReducer(emptyState, { type: 'RESET' });
    expect(next.participants).toHaveLength(0);
    expect(next.transportMode).toBe('metro');
  });

  it('retourne un nouvel objet (immutabilite)', () => {
    const state = stateWith(ALICE);
    const next = sessionReducer(state, { type: 'RESET' });
    expect(next).not.toBe(state);
  });
});

// ── Invariants metier (canRemove / canContinue) ───────────────────────────────
// Ces invariants sont calcules dans GroupPage a partir de state.participants.length.
// On verifie ici que les transitions du reducer produisent les etats corrects.

describe('Invariants metier (US-04)', () => {
  it('canContinue est false avec 0 participant', () => {
    expect(emptyState.participants.length >= 2).toBe(false);
  });

  it('canContinue est false avec 1 participant', () => {
    const state = stateWith(ALICE);
    expect(state.participants.length >= 2).toBe(false);
  });

  it('canContinue est true avec 2 participants', () => {
    const state = stateWith(ALICE, BOB);
    expect(state.participants.length >= 2).toBe(true);
  });

  it('canContinue est true avec 3 participants', () => {
    const state = stateWith(ALICE, BOB, CARL);
    expect(state.participants.length >= 2).toBe(true);
  });

  it('canRemove est false avec 0 participant', () => {
    expect(emptyState.participants.length > 2).toBe(false);
  });

  it('canRemove est false avec 1 participant', () => {
    const state = stateWith(ALICE);
    expect(state.participants.length > 2).toBe(false);
  });

  it('canRemove est false avec exactement 2 participants (minimum - US-04 scenario 2)', () => {
    const state = stateWith(ALICE, BOB);
    expect(state.participants.length > 2).toBe(false);
  });

  it('canRemove est true avec 3 participants (US-04 scenario 1)', () => {
    const state = stateWith(ALICE, BOB, CARL);
    expect(state.participants.length > 2).toBe(true);
  });
});

// ── Logique de filtrage des amis (US-02 scenario 2) ──────────────────────────
// La fonction normalize n'est pas exportee depuis StationAutocomplete.tsx.
// On reproduit la meme logique ici pour tester le filtrage insensible casse/accents.

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

describe('Logique normalize et filtrage amis (US-02 scenario 2)', () => {
  it('convertit en minuscules', () => {
    expect(normalize('Alice')).toBe('alice');
    expect(normalize('BOB')).toBe('bob');
  });

  it('supprime les accents (NFD + strip combining chars)', () => {
    expect(normalize('Elodie')).toBe('elodie');
    expect(normalize('Lea')).toBe('lea');
    expect(normalize('Francois')).toBe('francois');
    expect(normalize('Noel')).toBe('noel');
  });

  it('supprime les accents sur des noms accentues', () => {
    // On teste avec les vrais caracteres accentues que la normalisation fonctionne
    const withAccent = 'Élodie'; // Elodie avec E accent aigu
    expect(normalize(withAccent)).toBe('elodie');
  });

  it('est insensible a la casse', () => {
    expect(normalize('ALICE')).toBe('alice');
    expect(normalize('alice')).toBe('alice');
    expect(normalize('Alice')).toBe('alice');
  });

  it('gere les caracteres sans accent (inchanges sauf casse)', () => {
    expect(normalize('alex')).toBe('alex');
    expect(normalize('ALEX')).toBe('alex');
  });

  it('gere une chaine vide', () => {
    expect(normalize('')).toBe('');
  });

  it('filtrage includes - "ali" trouve "Alice"', () => {
    const query = normalize('ali');
    expect(normalize('Alice').includes(query)).toBe(true);
  });

  it('filtrage includes - "elo" trouve "Elodie" (insensible aux accents)', () => {
    const query = normalize('elo');
    const elodie = 'Élodie'; // Elodie avec accent
    expect(normalize(elodie).includes(query)).toBe(true);
  });

  it('filtrage includes - "zyx" ne trouve pas "Alice"', () => {
    const query = normalize('zyx');
    expect(normalize('Alice').includes(query)).toBe(false);
  });

  it('filtrage insensible aux accents du cote du nom de l\'ami (US-02 scenario 2)', () => {
    // search = "francois", ami.name = "Francois" avec cedille
    const q = normalize('francois');
    const francoisAccente = 'François'; // Francois avec cedille
    const n = normalize(francoisAccente);
    expect(n.includes(q)).toBe(true);
  });

  it('query vide retourne tous les amis (includes(""))', () => {
    const q = normalize('');
    const names = ['Alice', 'Bob', 'Elodie'];
    names.forEach(name => {
      expect(normalize(name).includes(q)).toBe(true);
    });
  });

  it('filtrage exclut les participants deja dans le groupe (US-02 scenario 3)', () => {
    // Simule la logique de GroupPage : filteredFriends exclut ceux dont l'id est deja dans participants
    const friends = [
      { id: 'f1', name: 'Alice', stationId: 's1', stationName: 'Chatelet' },
      { id: 'f2', name: 'Bob',   stationId: 's2', stationName: 'Nation' },
    ];
    const participants: Array<{ id: string }> = [{ id: 'f1' }]; // Alice deja dans le groupe
    const search = '';
    const filtered = friends.filter(f => {
      const q = normalize(search);
      const n = normalize(f.name);
      return n.includes(q) && !participants.some(p => p.id === f.id);
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('f2');
  });

  it('recherche vide avec tous les amis deja dans le groupe retourne une liste vide (US-02 edge case)', () => {
    const friends = [
      { id: 'f1', name: 'Alice', stationId: 's1', stationName: 'Chatelet' },
    ];
    const participants: Array<{ id: string }> = [{ id: 'f1' }];
    const filtered = friends.filter(f => !participants.some(p => p.id === f.id));
    expect(filtered).toHaveLength(0);
  });
});

// ── Coherence des types Participant / SessionState ────────────────────────────

describe('Coherence des types (contrats de donnees)', () => {
  it('un Participant contient id, name et station', () => {
    const p: Participant = { id: 'x', name: 'Test', station: CHATELET };
    expect(p.id).toBeDefined();
    expect(p.name).toBeDefined();
    expect(p.station).toBeDefined();
  });

  it('une Station contient id, name, lat, lng et lines', () => {
    const s: Station = CHATELET;
    expect(s.id).toBeDefined();
    expect(s.name).toBeDefined();
    expect(typeof s.lat).toBe('number');
    expect(typeof s.lng).toBe('number');
    expect(Array.isArray(s.lines)).toBe(true);
  });

  it('SessionState contient participants (tableau) et transportMode', () => {
    const s: SessionState = emptyState;
    expect(Array.isArray(s.participants)).toBe(true);
    expect(s.transportMode).toBe('metro');
  });

  it('le transportMode est "metro" dans l\'etat initial', () => {
    expect(emptyState.transportMode).toBe('metro');
  });

  it('ADD_PARTICIPANT conserve la structure complete de la station (lat/lng presents)', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ALICE });
    const station = next.participants[0].station;
    expect(typeof station.lat).toBe('number');
    expect(typeof station.lng).toBe('number');
    expect(station.lines).toHaveLength(2);
  });
});

// ── Sequences de transitions enchainees ──────────────────────────────────────

describe('Sequences de transitions (scenarios integres)', () => {
  it('ajout de 3 participants puis retrait du 2e -> 2 restants dans l\'ordre', () => {
    let state = emptyState;
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: CARL });
    state = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p2' } });
    expect(state.participants).toHaveLength(2);
    expect(state.participants[0]).toEqual(ALICE);
    expect(state.participants[1]).toEqual(CARL);
  });

  it('ajout puis RESET repart de zero', () => {
    let state = emptyState;
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    state = sessionReducer(state, { type: 'RESET' });
    expect(state.participants).toHaveLength(0);
    expect(state.participants.length >= 2).toBe(false);
    expect(state.participants.length > 2).toBe(false);
  });

  it('SET_TRANSPORT puis ADD_PARTICIPANT conservent les deux champs', () => {
    let state = emptyState;
    state = sessionReducer(state, { type: 'SET_TRANSPORT', payload: { mode: 'metro' } });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ALICE });
    expect(state.transportMode).toBe('metro');
    expect(state.participants).toHaveLength(1);
  });

  it('double suppression du meme id est idempotente (2e appel sans effet)', () => {
    let state = stateWith(ALICE, BOB, CARL);
    state = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p2' } });
    state = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'p2' } });
    expect(state.participants).toHaveLength(2);
  });

  it('ajouter apres un RESET fonctionne correctement', () => {
    let state = stateWith(ALICE, BOB);
    state = sessionReducer(state, { type: 'RESET' });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: CARL });
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0]).toEqual(CARL);
  });
});
