'use client';

import { createContext, useContext, useReducer } from 'react';
import type { Participant, SessionState } from '@/types/session';
import type { Station } from '@/types/station';

type Action =
  | { type: 'ADD_PARTICIPANT'; payload: Participant }
  | { type: 'REMOVE_PARTICIPANT'; payload: { id: string } }
  | { type: 'UPDATE_PARTICIPANT_STATION'; payload: { id: string; station: Station } }
  | { type: 'SET_TRANSPORT'; payload: { mode: SessionState['transportMode'] } }
  | { type: 'SET_RESULT'; payload: SessionState['result'] }
  | { type: 'RESET' };

const initialState: SessionState = {
  participants: [],
  transportMode: 'metro',
  result: null,
};

export function sessionReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'ADD_PARTICIPANT':
      return { ...state, participants: [...state.participants, action.payload] };
    case 'REMOVE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.filter((p) => p.id !== action.payload.id),
      };
    case 'UPDATE_PARTICIPANT_STATION':
      return {
        ...state,
        participants: state.participants.map(p =>
          p.id === action.payload.id ? { ...p, station: action.payload.station } : p
        ),
      };
    case 'SET_TRANSPORT':
      return { ...state, transportMode: action.payload.mode };
    case 'SET_RESULT':
      return { ...state, result: action.payload };
    case 'RESET':
      return initialState;
  }
}

type SessionContextValue = {
  state: SessionState;
  dispatch: React.Dispatch<Action>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
