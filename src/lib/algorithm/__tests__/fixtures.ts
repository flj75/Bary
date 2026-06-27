/**
 * Fixtures réalistes extraites de public/data/stations.json (vérifié le 2026-06-27).
 * Seuls les champs nécessaires aux tests sont renseignés ; les couleurs sont exactes.
 */
import type { Station } from '@/types/station';

// ── Lignes atomiques ──────────────────────────────────────────────────────────
const L1  = { id: 'IDFM:C01371', name: '1',   mode: 'metro' as const, color: '#ffbe00' };
const L2  = { id: 'IDFM:C01372', name: '2',   mode: 'metro' as const, color: '#0055c8' };
const L3  = { id: 'IDFM:C01373', name: '3',   mode: 'metro' as const, color: '#6e6e00' };
const L4  = { id: 'IDFM:C01374', name: '4',   mode: 'metro' as const, color: '#a0006e' };
const L5  = { id: 'IDFM:C01375', name: '5',   mode: 'metro' as const, color: '#ff5a00' };
const L6  = { id: 'IDFM:C01376', name: '6',   mode: 'metro' as const, color: '#82dc73' };
const L7  = { id: 'IDFM:C01377', name: '7',   mode: 'metro' as const, color: '#ff82b4' };
const L8  = { id: 'IDFM:C01378', name: '8',   mode: 'metro' as const, color: '#d282be' };
const L9  = { id: 'IDFM:C01379', name: '9',   mode: 'metro' as const, color: '#d2d200' };
const L11 = { id: 'IDFM:C01381', name: '11',  mode: 'metro' as const, color: '#6e491e' };
const L12 = { id: 'IDFM:C01382', name: '12',  mode: 'metro' as const, color: '#007852' };
const L13 = { id: 'IDFM:C01383', name: '13',  mode: 'metro' as const, color: '#82c8e6' };
const L14 = { id: 'IDFM:C01384', name: '14',  mode: 'metro' as const, color: '#640082' };
const RERA = { id: 'IDFM:C01742', name: 'A',  mode: 'rer'   as const, color: '#eb2132' };
const RERB = { id: 'IDFM:C01743', name: 'B',  mode: 'rer'   as const, color: '#5091cb' };
const RERD = { id: 'IDFM:C01728', name: 'D',  mode: 'rer'   as const, color: '#008b5b' };
const RERE = { id: 'IDFM:C01729', name: 'E',  mode: 'rer'   as const, color: '#c9005f' };

// ── Stations réelles (IDs vérifiés dans stations.json) ───────────────────────

export const CHATELET: Station = {
  id: 'IDFM:463079',
  name: 'Châtelet',
  lat: 48.857689,
  lng: 2.347759,
  lines: [L1, L4, L7, L11, L14],
};

export const CHATELET_LES_HALLES_RER: Station = {
  id: 'IDFM:monomodalStopPlace:45102',
  name: 'Châtelet - Les Halles',
  lat: 48.861745,
  lng: 2.346977,
  lines: [RERA, RERB, RERD],
};

export const LES_HALLES: Station = {
  id: 'IDFM:463208',
  name: 'Les Halles',
  lat: 48.862505,
  lng: 2.346127,
  lines: [L4],
};

export const NATION: Station = {
  id: 'IDFM:monomodalStopPlace:473875',
  name: 'Nation',
  lat: 48.848233,
  lng: 2.395944,
  lines: [L1, L2, L6, L9, RERA],
};

export const BASTILLE: Station = {
  id: 'IDFM:463018',
  name: 'Bastille',
  lat: 48.8533,
  lng: 2.368798,
  lines: [L1, L5, L8],
};

export const GARE_DU_NORD: Station = {
  id: 'IDFM:monomodalStopPlace:462394',
  name: 'Gare du Nord',
  lat: 48.882307,
  lng: 2.356693,
  lines: [L4, L5, RERB, RERD],
};

export const SAINT_LAZARE: Station = {
  id: 'IDFM:462972',
  name: 'Saint-Lazare',
  lat: 48.875661,
  lng: 2.324026,
  lines: [L3, L13, L14],
};

export const SAINT_LAZARE_M12: Station = {
  id: 'IDFM:21964',
  name: 'Saint-Lazare',
  lat: 48.875689,
  lng: 2.327448,
  lines: [L12],
};

export const HAUSSMANN_SL: Station = {
  id: 'IDFM:monomodalStopPlace:58718',
  name: 'Haussmann Saint-Lazare',
  lat: 48.874999,
  lng: 2.328646,
  lines: [RERE],
};

export const MAGENTA: Station = {
  id: 'IDFM:monomodalStopPlace:58572',
  name: 'Magenta',
  lat: 48.88081,
  lng: 2.358696,
  lines: [RERE],
};

export const OPERA: Station = {
  id: 'IDFM:463245',
  name: 'Opéra',
  lat: 48.870326,
  lng: 2.332572,
  lines: [L3, L7, L8],
};

export const CHAUSSEE_DANTIN: Station = {
  id: 'IDFM:463145',
  name: "Chaussée d'Antin - La Fayette",
  lat: 48.873201,
  lng: 2.33367,
  lines: [L7, L9],
};

export const HAVRE_CAUMARTIN: Station = {
  id: 'IDFM:463188',
  name: 'Havre-Caumartin',
  lat: 48.873757,
  lng: 2.327677,
  lines: [L3, L9],
};

export const AUBER: Station = {
  id: 'IDFM:monomodalStopPlace:45873',
  name: 'Auber',
  lat: 48.872349,
  lng: 2.329659,
  lines: [RERA],
};

export const MONTPARNASSE: Station = {
  id: 'IDFM:462954',
  name: 'Montparnasse Bienvenue',
  lat: 48.842143,
  lng: 2.320986,
  lines: [L4, L6, L12, L13],
};

export const CHATEAU_DE_VINCENNES: Station = {
  id: 'IDFM:463149',
  name: 'Château de Vincennes',
  lat: 48.84466,
  lng: 2.438792,
  lines: [L1],
};

export const BALARD: Station = {
  id: 'IDFM:24108',
  name: 'Balard',
  lat: 48.836329,
  lng: 2.277356,
  lines: [L8, { id: 'IDFM:C01391', name: 'T3a', mode: 'tram', color: '#00814f' }],
};

// Station fictive sans lignes (orpheline — edge case US-17)
export const ORPHAN_STATION: Station = {
  id: 'IDFM:FAKE_ORPHAN',
  name: 'Station Orpheline',
  lat: 48.85,
  lng: 2.35,
  lines: [],
};

// Station fictive avec une ligne exclusive (réseau disjoint — edge case fallback)
export const ISOLATED_LINE_STATION: Station = {
  id: 'IDFM:FAKE_ISOLATED',
  name: 'Station Isolée',
  lat: 48.90,
  lng: 2.20,
  lines: [{ id: 'IDFM:FAKE_LINE_X', name: 'X', mode: 'tram', color: '#000000' }],
};
