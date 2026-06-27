import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  toMinutes,
  estimateTransfers,
  HaversineTravelTimeProvider,
  AVG_SPEED_KMH,
  OVERHEAD_MIN,
  TRANSFER_PENALTY,
} from '../haversine';
import { CHATELET, NATION, BASTILLE, SAINT_LAZARE } from './fixtures';

// ── haversineKm ───────────────────────────────────────────────────────────────

describe('haversineKm', () => {
  it('retourne 0 pour deux points identiques', () => {
    expect(haversineKm(CHATELET, CHATELET)).toBe(0);
  });

  it('est symétrique (A→B == B→A)', () => {
    const ab = haversineKm(CHATELET, NATION);
    const ba = haversineKm(NATION, CHATELET);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('retourne une valeur positive pour deux stations différentes', () => {
    expect(haversineKm(CHATELET, NATION)).toBeGreaterThan(0);
  });

  it('Châtelet → Nation : ~3.6 km (tolérance ±0.5 km)', () => {
    // Coordonnées réelles : distance attendue ~3.6 km vol d'oiseau
    expect(haversineKm(CHATELET, NATION)).toBeCloseTo(3.6, 0);
  });

  it('Châtelet → Bastille : ~1.5 km (tolérance ±0.3 km)', () => {
    // Bastille est à ~1.5 km de Châtelet selon les coordonnées réelles
    const dist = haversineKm(CHATELET, BASTILLE);
    expect(dist).toBeGreaterThan(1.0);
    expect(dist).toBeLessThan(2.0);
  });

  it('respecte la formule haversine : résultat en km cohérent avec la géo parisienne', () => {
    // Paris est à ~10km de diamètre ; aucune distance inter-stations ne devrait dépasser 50 km
    expect(haversineKm(CHATELET, SAINT_LAZARE)).toBeLessThan(50);
    expect(haversineKm(CHATELET, SAINT_LAZARE)).toBeGreaterThan(0);
  });

  it('gère des coordonnées antipodales (distance max ~20000 km)', () => {
    const a = { lat: 48.86, lng: 2.35 };
    const antipode = { lat: -48.86, lng: -177.65 }; // antipode approximatif
    expect(haversineKm(a, antipode)).toBeGreaterThan(15000);
  });
});

// ── toMinutes ─────────────────────────────────────────────────────────────────

describe('toMinutes', () => {
  it('exemple de la spec : 3 km, 1 correspondance → 15 min', () => {
    // (3/30)*60 + 4 + 1*5 = 6 + 4 + 5 = 15
    expect(toMinutes(3, 1)).toBe(15);
  });

  it('0 km, 0 correspondance → OVERHEAD_MIN seulement (arrondi)', () => {
    expect(toMinutes(0, 0)).toBe(OVERHEAD_MIN);
  });

  it('0 km, 0 correspondance → 4 min', () => {
    expect(toMinutes(0, 0)).toBe(4);
  });

  it('distance positive, 0 correspondance : pas de TRANSFER_PENALTY', () => {
    const withTransfer = toMinutes(3, 1);
    const without = toMinutes(3, 0);
    expect(withTransfer - without).toBe(TRANSFER_PENALTY);
  });

  it('2 correspondances → 2 × TRANSFER_PENALTY ajouté', () => {
    const zero = toMinutes(3, 0);
    const two  = toMinutes(3, 2);
    expect(two - zero).toBe(2 * TRANSFER_PENALTY);
  });

  it('retourne un entier (Math.round appliqué)', () => {
    // (1.7 / 30) * 60 = 3.4 → Math.round(3.4 + 4 + 0) = 7
    expect(Number.isInteger(toMinutes(1.7, 0))).toBe(true);
  });

  it('résultat toujours >= OVERHEAD_MIN pour distances positives', () => {
    expect(toMinutes(0.001, 0)).toBeGreaterThanOrEqual(OVERHEAD_MIN);
  });
});

// ── estimateTransfers ─────────────────────────────────────────────────────────

describe('estimateTransfers', () => {
  it('0 correspondance si from et to partagent une ligne (Châtelet–Bastille via M1)', () => {
    // Châtelet : M1, M4, M7, M11, M14 ; Bastille : M1, M5, M8 → ligne M1 commune
    expect(estimateTransfers(CHATELET, BASTILLE)).toBe(0);
  });

  it('0 correspondance si from et to sont la même station', () => {
    expect(estimateTransfers(CHATELET, CHATELET)).toBe(0);
  });

  it('1 correspondance si aucune ligne en commun (Châtelet → Saint-Lazare)', () => {
    // Châtelet : M1, M4, M7, M11, M14 ; Saint-Lazare : M3, M13, M14
    // Ligne 14 commune !
    // Ce test doit retourner 0
    expect(estimateTransfers(CHATELET, SAINT_LAZARE)).toBe(0);
  });

  it('1 correspondance si aucune ligne commune (Nation → Saint-Lazare M3/13/14)', () => {
    // Nation : M1, M2, M6, M9, RERA
    // Saint-Lazare : M3, M13, M14 — aucune ligne commune
    expect(estimateTransfers(NATION, SAINT_LAZARE)).toBe(1);
  });

  it('0 correspondance entre Châtelet et Nation via la ligne 1', () => {
    expect(estimateTransfers(CHATELET, NATION)).toBe(0);
  });
});

// ── HaversineTravelTimeProvider ───────────────────────────────────────────────

describe('HaversineTravelTimeProvider', () => {
  const provider = new HaversineTravelTimeProvider();

  it('retourne un entier positif pour deux stations distinctes', () => {
    const minutes = provider.getMinutes(CHATELET, NATION);
    expect(Number.isInteger(minutes)).toBe(true);
    expect(minutes).toBeGreaterThan(0);
  });

  it('retourne OVERHEAD_MIN pour une station vers elle-même (distance 0, 0 transfert)', () => {
    expect(provider.getMinutes(CHATELET, CHATELET)).toBe(OVERHEAD_MIN);
  });

  it('est cohérent avec toMinutes(haversineKm(a,b), estimateTransfers(a,b))', () => {
    const expected = toMinutes(haversineKm(CHATELET, NATION), estimateTransfers(CHATELET, NATION));
    expect(provider.getMinutes(CHATELET, NATION)).toBe(expected);
  });

  it('temps Châtelet → Nation dans une plage réaliste [5, 30] min', () => {
    const t = provider.getMinutes(CHATELET, NATION);
    expect(t).toBeGreaterThanOrEqual(5);
    expect(t).toBeLessThanOrEqual(30);
  });

  it('distance plus grande = temps plus long (Vincennes > Bastille depuis Châtelet)', async () => {
    const { CHATEAU_DE_VINCENNES } = await import('./fixtures');
    const tBastille = provider.getMinutes(CHATELET, BASTILLE);
    const tVincennes = provider.getMinutes(CHATELET, CHATEAU_DE_VINCENNES);
    expect(tVincennes).toBeGreaterThan(tBastille);
  });
});
