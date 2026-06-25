import type { Station } from './station';

export type Participant = {
  id: string;
  name: string;
  station: Station;
};

export type SessionState = {
  participants: Participant[];
  transportMode: 'metro';
};
