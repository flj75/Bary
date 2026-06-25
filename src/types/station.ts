export type StationLine = {
  id: string;
  name: string;
  mode: 'metro' | 'rer' | 'tram';
  color: string;
};

export type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: StationLine[];
};
