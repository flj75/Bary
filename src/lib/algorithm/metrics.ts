import type { Station } from '@/types/station';

export type DisplayMetrics = {
  maxTime: number;
  avgTime: number;
  // Tableau pour couvrir le cas d'égalité (US-09 : "Sofia & Hugo · 36 min").
  // Longueur 1 dans le cas nominal.
  furthestParticipants: Station[];
  progressBars: Map<Station, number>;
};

export function computeDisplayMetrics(
  times: Map<Station, number>
): DisplayMetrics {
  const entries = [...times.entries()];
  const values = entries.map(([, t]) => t);

  const maxTime = Math.max(...values);
  const avgTime = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  const furthestParticipants = entries
    .filter(([, t]) => t === maxTime)
    .map(([p]) => p);

  // Normalisation : max → 100%, autres proportionnels.
  // Si maxTime === 0 (tous déjà sur la station résultat) → 100% pour tous (US-08).
  const progressBars = new Map(
    entries.map(([p, t]) => [
      p,
      maxTime === 0 ? 100 : Math.round((t / maxTime) * 100),
    ])
  );

  return { maxTime, avgTime, furthestParticipants, progressBars };
}
