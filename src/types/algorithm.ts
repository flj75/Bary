import type { Station } from './station';

export interface TravelTimeProvider {
  getMinutes(from: Station, to: Station): number;
}

export type CorrespondanceHub = {
  name: string;
  stationIds: string[];
  walkingTimeMinutes: number;
};
