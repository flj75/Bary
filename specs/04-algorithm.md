# 04 — Algorithme & Logique de calcul

## Vue d'ensemble

L'algorithme de Bary prend en entrée un ensemble de stations de départ (une par participant) et retourne la station du réseau IDFM qui minimise le temps de trajet **maximum** parmi tous les participants — c'est le critère **minimax**, ou encore "minimiser l'iniquité".

```
Entrée  : [station_1, station_2, ..., station_n]
Sortie  : station_optimale, { participant_i: temps_i }
Critère : minimiser max(temps_i)
```

---

## Étape 1 — Dataset des stations

### Source
Données statiques IDFM (Île-de-France Mobilités), embarquées dans l'app au build.
Modes couverts en MVP : **Métro, RER, Tram**.

### Structure d'une station
```typescript
type Station = {
  id: string;           // identifiant unique IDFM (ex: "IDFM:463297")
  name: string;         // nom affiché (ex: "Bastille")
  lat: number;          // latitude WGS84
  lng: number;          // longitude WGS84
  lines: StationLine[]; // lignes passant par cette station
};

type StationLine = {
  id: string;    // ex: "IDFM:C01371"
  name: string;  // ex: "1"
  mode: "metro" | "rer" | "tram";
  color: string; // couleur officielle hexadécimale (ex: "#FFBE00")
};
```

### Volume estimé
- Métro Paris : ~300 stations
- RER Île-de-France : ~250 stations
- Tram Île-de-France : ~400 stations
- **Total MVP : ~950 stations**

Le dataset est un fichier JSON statique (~150 Ko) embarqué dans le bundle Next.js.

---

## Étape 2 — Fonction de distance (MVP)

### Formule haversine

En MVP, le "temps de trajet" entre deux stations est approximé par la **distance à vol d'oiseau** (haversine), convertie en minutes via une vitesse moyenne estimée du métro parisien.

```typescript
function haversineKm(a: Station, b: Station): number {
  const R = 6371; // rayon de la Terre en km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function toMinutes(distanceKm: number): number {
  const AVG_SPEED_KMH = 30; // vitesse commerciale moyenne métro parisien
  const OVERHEAD_MIN = 4;   // temps moyen d'attente + correspondance estimé
  return Math.round((distanceKm / AVG_SPEED_KMH) * 60 + OVERHEAD_MIN);
}
```

### Pourquoi cette approximation est acceptable en MVP
Le réseau de métro parisien est dense et maillé. Sur Paris intra-muros, la corrélation entre distance à vol d'oiseau et temps de trajet réel est forte (coefficient ~0.85). L'approximation produit des résultats cohérents pour l'usage visé.

### Évolution v2 — Matrice GTFS
Remplacement de `haversineKm` par une matrice pré-calculée `travelTime[stationId_A][stationId_B]` issue des données GTFS IDFM. L'interface de la fonction reste identique — seule l'implémentation change.

```typescript
// Interface abstraite (inchangée entre MVP et v2)
interface TravelTimeProvider {
  getMinutes(from: Station, to: Station): number;
}
```

---

## Étape 3 — Algorithme minimax

### Principe
Pour chaque station candidate `s` du réseau, on calcule le temps de trajet de chaque participant vers `s`, puis on retient le maximum. La station optimale est celle dont ce maximum est le plus faible.

### Implémentation
```typescript
function findOptimalStation(
  participants: Station[],
  candidates: Station[],
  travelTime: TravelTimeProvider
): { station: Station; times: Map<Station, number> } {
  let best: Station | null = null;
  let bestMaxTime = Infinity;
  let bestTimes = new Map<Station, number>();

  for (const candidate of candidates) {
    const times = new Map(
      participants.map((p) => [p, travelTime.getMinutes(p, candidate)])
    );
    const maxTime = Math.max(...times.values());

    if (maxTime < bestMaxTime) {
      bestMaxTime = maxTime;
      best = candidate;
      bestTimes = times;
    }
  }

  return { station: best!, times: bestTimes };
}
```

### Complexité
- **O(C × P)** où C = nombre de stations candidates (~950) et P = nombre de participants (typiquement 2–10)
- Soit ~9 500 opérations max pour un groupe de 10 personnes → **< 1 ms** côté client

Pas besoin d'optimisation en MVP. Si le dataset s'élargit (autres villes, GTFS complet), un filtrage géographique préalable (ne garder que les stations dans un rayon de X km du barycentre) peut réduire C.

---

## Étape 4 — Tie-breaker

En cas d'égalité parfaite de `maxTime` entre plusieurs stations candidates, on sélectionne la station **la plus proche du centre géographique de Paris**.

**Point de référence : Châtelet** — `{ lat: 48.8597, lng: 2.3469 }`

Justification : les stations centrales offrent un bassin de lieux (bars, restaurants, parcs) plus large, ce qui anticipe la v3 des suggestions de lieux à proximité.

```typescript
const PARIS_CENTER: { lat: number; lng: number } = { lat: 48.8597, lng: 2.3469 };

function tieBreaker(stations: Station[]): Station {
  return stations.reduce((best, s) =>
    haversineKm(s, PARIS_CENTER) < haversineKm(best, PARIS_CENTER) ? s : best
  );
}
```

---

## Étape 5 — Calcul des métriques d'affichage

À partir du résultat de `findOptimalStation`, on dérive les valeurs affichées à l'écran 4 :

```typescript
function computeDisplayMetrics(times: Map<Station, number>) {
  const values = [...times.values()];
  const maxTime = Math.max(...values);
  const avgTime = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const furthestParticipant = [...times.entries()].find(([, t]) => t === maxTime)![0];

  // Normalisation des barres de progression
  // Cas particulier : si maxTime === 0, toutes les barres sont à 100%
  const progressBars = new Map(
    [...times.entries()].map(([p, t]) => [
      p,
      maxTime === 0 ? 100 : Math.round((t / maxTime) * 100),
    ])
  );

  return { maxTime, avgTime, furthestParticipant, progressBars };
}
```

---

## Évolutions futures de l'algorithme

| Version | Évolution |
|---|---|
| **v2** | Remplacement haversine → matrice GTFS pré-calculée (temps réels) |
| **v3** | Mode hybride : chaque participant a son propre `TravelTimeProvider` selon son moyen de transport |
| **v4** | Critères multiples au choix : minimax (actuel), somme totale, barycentre géographique |
| **v5** | Extension à d'autres villes (Londres, Berlin...) via leurs données GTFS publiques |
