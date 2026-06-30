import type { Station } from './station';
import type { MeetingPointResult } from '@/lib/algorithm';

export type Participant = {
  id: string;
  name: string;
  station: Station;
  isMe?: boolean;
};

export type SessionState = {
  participants: Participant[];
  transportMode: 'metro';
  result: MeetingPointResult | null;
};
