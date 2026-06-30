import { describe, it, expect } from 'vitest';
import { sessionReducer } from '../SessionContext';
import type { SessionState, Participant } from '@/types/session';
import type { Station } from '@/types/station';
import type { MeetingPointResult } from '@/lib/algorithm';

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

// Fixture MeetingPointResult minimal pour tester SET_RESULT
const FAKE_RESULT: MeetingPointResult = {
  optimal: {
    station: CHATELET,
    times: new Map([
      [CHATELET, 4],
      [NATION, 12],
    ]),
  },
  metrics: {
    maxTime: 12,
    avgTime: 8,
    furthestParticipants: [NATION],
    progressBars: new Map([
      [CHATELET, 33],
      [NATION, 100],
    ]),
  },
};

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

  // ── Tests QA US-06 (nouveaux) ──────────────────────────────────────────────

  it('US-06 : conserve le result existant apres SET_TRANSPORT (US-11 coherence)', () => {
    // SET_TRANSPORT ne doit pas effacer le result deja calcule
    const state: SessionState = { ...stateWith(ALICE, BOB), result: FAKE_RESULT };
    const next = sessionReducer(state, { type: 'SET_TRANSPORT', payload: { mode: 'metro' } });
    expect(next.result).toBe(FAKE_RESULT);
  });

  it('US-06 : le transportMode est "metro" dans l\'etat initial (valeur par defaut)', () => {
    expect(emptyState.transportMode).toBe('metro');
  });
});

// ── SET_RESULT ────────────────────────────────────────────────────────────────

describe('SET_RESULT (US-07)', () => {
  it('stocke le resultat dans state.result', () => {
    const next = sessionReducer(emptyState, { type: 'SET_RESULT', payload: FAKE_RESULT });
    expect(next.result).toBe(FAKE_RESULT);
  });

  it('conserve les participants existants apres SET_RESULT', () => {
    const state = stateWith(ALICE, BOB);
    const next = sessionReducer(state, { type: 'SET_RESULT', payload: FAKE_RESULT });
    expect(next.participants).toHaveLength(2);
    expect(next.participants[0]).toEqual(ALICE);
    expect(next.participants[1]).toEqual(BOB);
  });

  it('conserve le transportMode apres SET_RESULT', () => {
    const state = stateWith(ALICE, BOB);
    const next = sessionReducer(state, { type: 'SET_RESULT', payload: FAKE_RESULT });
    expect(next.transportMode).toBe('metro');
  });

  it('retourne un nouvel objet (immutabilite)', () => {
    const state = stateWith(ALICE, BOB);
    const next = sessionReducer(state, { type: 'SET_RESULT', payload: FAKE_RESULT });
    expect(next).not.toBe(state);
  });

  it('peut etre appele avec null pour effacer le result', () => {
    const state: SessionState = { ...stateWith(ALICE), result: FAKE_RESULT };
    const next = sessionReducer(state, { type: 'SET_RESULT', payload: null });
    expect(next.result).toBeNull();
  });

  it('ecrase un resultat precedent', () => {
    const state: SessionState = { ...stateWith(ALICE), result: FAKE_RESULT };
    const newResult: MeetingPointResult = {
      ...FAKE_RESULT,
      optimal: { ...FAKE_RESULT.optimal, station: NATION },
    };
    const next = sessionReducer(state, { type: 'SET_RESULT', payload: newResult });
    expect(next.result?.optimal.station.id).toBe(NATION.id);
  });

  it('result est null dans l\'etat initial', () => {
    expect(emptyState.result).toBeNull();
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

  // ── Tests QA US-11 (nouveaux) ──────────────────────────────────────────────

  it('US-11 : RESET efface le result (result revient a null)', () => {
    // Si un resultat etait stocke, RESET doit le vider
    const state: SessionState = { ...stateWith(ALICE, BOB), result: FAKE_RESULT };
    const next = sessionReducer(state, { type: 'RESET' });
    expect(next.result).toBeNull();
  });

  it('US-11 : RESET sur etat avec result null reste null (idempotent)', () => {
    const next = sessionReducer(emptyState, { type: 'RESET' });
    expect(next.result).toBeNull();
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

  it('SessionState possede un champ result (null par defaut)', () => {
    const s: SessionState = emptyState;
    expect('result' in s).toBe(true);
    expect(s.result).toBeNull();
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

  it('US-11 : SET_RESULT puis RESET -> result null, participants vides', () => {
    // Simule le flux complet ecran 3→4→modifier
    let state = stateWith(ALICE, BOB);
    state = sessionReducer(state, { type: 'SET_RESULT', payload: FAKE_RESULT });
    expect(state.result).not.toBeNull();
    state = sessionReducer(state, { type: 'RESET' });
    expect(state.result).toBeNull();
    expect(state.participants).toHaveLength(0);
  });

  it('US-07 : SET_RESULT puis SET_TRANSPORT conserve le result', () => {
    // Changer le mode de transport ne doit pas perdre le resultat en cours
    let state = stateWith(ALICE, BOB);
    state = sessionReducer(state, { type: 'SET_RESULT', payload: FAKE_RESULT });
    state = sessionReducer(state, { type: 'SET_TRANSPORT', payload: { mode: 'metro' } });
    expect(state.result).toBe(FAKE_RESULT);
    expect(state.transportMode).toBe('metro');
  });

  it('US-11 : ADD_PARTICIPANT apres SET_RESULT conserve le result', () => {
    // Ajouter un participant (ex. depuis ecran 2 apres "Modifier") ne doit pas
    // effacer le result du contexte tant que RESET n'est pas dispatch
    let state = stateWith(ALICE, BOB);
    state = sessionReducer(state, { type: 'SET_RESULT', payload: FAKE_RESULT });
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: CARL });
    expect(state.result).toBe(FAKE_RESULT);
    expect(state.participants).toHaveLength(3);
  });
});

// ── US-20 : pré-ajout du participant "Moi" via sessionReducer ─────────────────
//
// Le pré-ajout lui-même est dans un useEffect côté GroupPage (non testable
// sans jsdom). On teste ici ce que le reducer garantit :
//   - ADD_PARTICIPANT avec isMe: true produit un participant correctement marqué
//   - REMOVE_PARTICIPANT retire bien l'entrée isMe
//   - Un second ADD_PARTICIPANT avec isMe n'est pas bloqué (la protection
//     "pas de doublon au montage" est côté useEffect, pas côté reducer)

describe('US-20 — ADD_PARTICIPANT avec isMe: true (pré-ajout "Moi")', () => {
  const ME: Participant = { id: 'me-1', name: 'Alice', station: CHATELET, isMe: true };

  it('ADD_PARTICIPANT avec isMe: true insere le participant en premier', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ME });
    expect(next.participants).toHaveLength(1);
    expect(next.participants[0].isMe).toBe(true);
    expect(next.participants[0].name).toBe('Alice');
    expect(next.participants[0].station.id).toBe(CHATELET.id);
  });

  it('le flag isMe est conserve tel quel dans le state apres dispatch', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ME });
    expect(next.participants[0].isMe).toBe(true);
  });

  it('un participant sans isMe na pas le flag (undefined)', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ALICE });
    expect(next.participants[0].isMe).toBeUndefined();
  });

  it('REMOVE_PARTICIPANT retire l\'entree isMe par son id (scenario 2 US-20)', () => {
    // L'utilisateur tape le bouton de retrait sur sa propre entrée
    const state = stateWith(ME, BOB);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'me-1' } });
    expect(next.participants).toHaveLength(1);
    expect(next.participants.find(p => p.isMe)).toBeUndefined();
    expect(next.participants[0]).toEqual(BOB);
  });

  it('REMOVE_PARTICIPANT de isMe ne supprime pas les autres participants', () => {
    const state = stateWith(ME, BOB, CARL);
    const next = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'me-1' } });
    expect(next.participants).toHaveLength(2);
    expect(next.participants[0]).toEqual(BOB);
    expect(next.participants[1]).toEqual(CARL);
  });

  it('un second ADD_PARTICIPANT avec isMe est accepte par le reducer (pas de garde dans reducer)', () => {
    // La protection "pas de doublon" est dans le useEffect (participants.length > 0 => return)
    // Le reducer lui-meme ne bloque pas un second pré-ajout
    const state = stateWith(ME);
    const ME2: Participant = { id: 'me-2', name: 'Alice', station: CHATELET, isMe: true };
    const next = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ME2 });
    expect(next.participants).toHaveLength(2);
  });

  it('ADD_PARTICIPANT isMe conserve immutabilite (nouvel objet retourne)', () => {
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ME });
    expect(next).not.toBe(emptyState);
    expect(next.participants).not.toBe(emptyState.participants);
  });

  it('US-20 scenario 1 : etat apres pre-ajout — 1 participant isMe en position 0', () => {
    // Simule le state produit par le useEffect de GroupPage au montage
    const state = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ME });
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0].isMe).toBe(true);
    expect(state.participants[0].name).toBe('Alice');
  });

  it('US-20 scenario 2 : retrait de soi puis re-ajout via carnet — sequentiel reducer', () => {
    // Pré-ajout au montage
    let state = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: ME });
    // L'utilisateur ajoute un ami
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: BOB });
    // L'utilisateur se retire lui-même
    state = sessionReducer(state, { type: 'REMOVE_PARTICIPANT', payload: { id: 'me-1' } });
    expect(state.participants).toHaveLength(1);
    expect(state.participants[0]).toEqual(BOB);
    // Re-ajout depuis le carnet (handleAddFriend propage isMe)
    const ME_READD: Participant = { id: 'me-1', name: 'Alice', station: CHATELET, isMe: true };
    state = sessionReducer(state, { type: 'ADD_PARTICIPANT', payload: ME_READD });
    expect(state.participants).toHaveLength(2);
    expect(state.participants.find(p => p.isMe)).toBeDefined();
  });

  it('US-20 scenario 3 (sans profil) : state vide reste vide (aucun dispatch sans profil)', () => {
    // Sans profil, le useEffect ne dispatche rien. On verifie que l'etat vide est l'etat initial.
    expect(emptyState.participants).toHaveLength(0);
  });

  it('handleAddFriend propage isMe : ADD_PARTICIPANT avec isMe: true produit le bon state', () => {
    // Simule handleAddFriend(friendIsMe) dans GroupPage :
    //   dispatch({ type: 'ADD_PARTICIPANT', payload: { ...friend, isMe: friend.isMe } })
    const friendIsMe: Participant = { id: 'f-me', name: 'Alice', station: CHATELET, isMe: true };
    const next = sessionReducer(emptyState, { type: 'ADD_PARTICIPANT', payload: friendIsMe });
    expect(next.participants[0].isMe).toBe(true);
  });
});
