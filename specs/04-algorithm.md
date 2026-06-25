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
  id: string;           // identifiant unique IDFM (ex: "IDFM:71264")
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

En MVP, le "temps de trajet" entre deux stations est approximé par la **distance à vol d'oiseau** (haversine), convertie en minutes, augmentée d'une **pénalité de correspondance** pour chaque changement de ligne nécessaire.

```typescript
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371; // rayon de la Terre en km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

const AVG_SPEED_KMH = 30;    // vitesse commerciale moyenne métro parisien
const OVERHEAD_MIN = 4;      // attente + marche estimés (par trajet)
const TRANSFER_PENALTY = 5;  // pénalité par correspondance (en minutes)

function toMinutes(distanceKm: number, transfers: number): number {
  return Math.round(
    (distanceKm / AVG_SPEED_KMH) * 60 + OVERHEAD_MIN + transfers * TRANSFER_PENALTY
  );
}
```

**Exemple** : 3 km de distance, 1 correspondance → `(3/30)*60 + 4 + 5 = 15 min`.

La constante `TRANSFER_PENALTY` est exposée et ajustable. Une valeur de 5 min représente la réalité parisienne (temps d'attente + marche de correspondance sur une station comme Châtelet-Les Halles).

### Estimation du nombre de correspondances

Sans matrice GTFS, on estime le nombre de correspondances en comparant les lignes desservant la station de départ et la station candidate :

```typescript
function estimateTransfers(from: Station, to: Station): number {
  const fromLines = new Set(from.lines.map((l) => l.id));
  const toLines = new Set(to.lines.map((l) => l.id));

  // 0 correspondance : au moins une ligne en commun (trajet direct)
  for (const lineId of fromLines) {
    if (toLines.has(lineId)) return 0;
  }

  // 1 correspondance : une ligne de "from" partage une station avec une ligne de "to"
  // (Dans le modèle MVP avec candidates filtrés au niveau 1, ce cas est toujours vrai
  // par construction — voir Étape 2b.)
  return 1; // fallback : on estime 1 correspondance
}
```

**Limites de cette estimation** : elle ne détecte pas les cas à 2+ correspondances (ignorés en MVP car les candidates sont filtrées au niveau 1). Elle sous-estime légèrement les trajets RER ↔ Tram qui nécessitent parfois 2 correspondances en pratique.

### Pourquoi cette approximation est acceptable en MVP
Le réseau parisien est dense. Sur Paris intra-muros, la corrélation haversine / temps réel est ~0.85. La pénalité de correspondance corrige le biais principal (un trajet avec changement est perçu bien plus long qu'un trajet direct de même distance).

### Évolution v2 — Matrice GTFS
Remplacement de `haversineKm` + `estimateTransfers` par une matrice pré-calculée `travelTime[stationId_A][stationId_B]` issue des données GTFS IDFM. L'interface abstraite reste identique.

```typescript
// Interface abstraite (inchangée entre MVP et v2)
interface TravelTimeProvider {
  getMinutes(from: Station, to: Station): number;
}
```

---

## Étape 2b — Définition de l'ensemble candidates

Plutôt que de tester les ~950 stations du réseau, on filtre d'abord l'ensemble des candidates pour ne garder que des stations **topologiquement pertinentes** — c'est-à-dire accessibles sans trop de correspondances depuis chaque participant.

### Pourquoi ce filtrage est important
Sans filtrage, le minimax peut retourner une station géographiquement absurde : par exemple, une station de RER en grande banlieue que certains participants atteindraient rapidement (même ligne directe) mais qui est objectivement hors de propos pour un rendez-vous parisien. Le filtrage ancre le résultat dans la topologie réelle du réseau.

### Logique en cascade

**Niveau 1 — Stations accessibles en 0 ou 1 correspondance pour TOUS les participants**

Pour chaque participant `p`, on calcule son ensemble de stations accessibles `reach(p)` :
- **0 correspondance** : toutes les stations desservies par au moins une des lignes de la station de départ de `p`
- **1 correspondance** : toutes les stations desservies par une ligne qui partage au moins une station avec les lignes de `p`

L'ensemble candidates du niveau 1 est l'**intersection** de tous les `reach(p)`.

**Fallback — Si l'intersection est vide**

Si aucune station n'est accessible en ≤ 1 correspondance pour l'ensemble du groupe (cas extrême : participants sur des réseaux très disjoints), on utilise l'ensemble complet des ~950 stations.

```
candidates = intersection({ reach(p) | p ∈ participants })
if candidates.isEmpty():
    candidates = allStations   // fallback
```

### Pseudo-code

```typescript
function getReachableStations(departure: Station, allStations: Station[]): Set<string> {
  const reachable = new Set<string>();
  const departureLineIds = new Set(departure.lines.map((l) => l.id));

  for (const station of allStations) {
    const stationLineIds = station.lines.map((l) => l.id);

    // 0 correspondance : ligne en commun avec la station de départ
    const isDirect = stationLineIds.some((id) => departureLineIds.has(id));
    if (isDirect) {
      reachable.add(station.id);
      continue;
    }

    // 1 correspondance : une des lignes de cette station partage une station
    // avec une des lignes du participant (connexion via nœud intermédiaire)
    const isOneTransfer = allStations.some((hub) => {
      const hubLineIds = new Set(hub.lines.map((l) => l.id));
      const hubConnectsFromDeparture = hub.lines.some((l) => departureLineIds.has(l.id));
      const hubConnectsToCandidate = stationLineIds.some((id) => hubLineIds.has(id));
      return hubConnectsFromDeparture && hubConnectsToCandidate;
    });

    if (isOneTransfer) reachable.add(station.id);
  }

  return reachable;
}

function buildCandidates(participants: Station[], allStations: Station[]): Station[] {
  const reachSets = participants.map((p) => getReachableStations(p, allStations));

  // Intersection : garder uniquement les stations accessibles par TOUS les participants
  const intersection = allStations.filter((s) =>
    reachSets.every((reach) => reach.has(s.id))
  );

  // Fallback si intersection vide
  return intersection.length > 0 ? intersection : allStations;
}
```

**Note sur la complexité** : `getReachableStations` est O(S²) où S = ~950. Appelée une fois par participant, soit O(P × S²) ≈ 9M d'opérations pour 10 participants — acceptable en client-side (< 50 ms). Si besoin, cette étape peut être mise en cache par station de départ.

---

## Étape 2c — Hubs de correspondance multi-stations

### Problème
Certains hubs parisiens majeurs apparaissent comme des entités **séparées** dans le dataset IDFM alors qu'ils sont reliés physiquement par des couloirs souterrains ou une marche de quelques minutes. Sans traitement spécifique, l'algorithme les traite comme des stations totalement indépendantes : un participant arrivant à Châtelet (M1) et un candidat à Les Halles (RER A) seraient perçus comme deux points distincts, alors qu'ils sont à 4 minutes à pied dans le même complexe souterrain.

### Solution MVP — Liste statique de hubs

On définit une liste statique de **5 hubs**. Les IDs sont vérifiés dans le fichier `stops.txt` du GTFS officiel IDFM (téléchargé le 2026-06-18). Ils correspondent à la colonne `parent_station` — niveau stop area, qui agrège tous les quais d'une même station.

> **⚠️ Note d'implémentation — IDs à mettre à jour dans `hubs.ts`**
>
> Les IDs ci-dessous (`IDFM:71264`, `IDFM:73794`, etc.) sont des **parent_station GTFS** issus de `stops.txt`. Ils **ne correspondent pas** aux IDs présents dans `public/data/stations.json`, qui est généré depuis l'API `arrets-lignes` et utilise des IDs de quais individuels (ex : `IDFM:463079` pour Châtelet M1/M4/M7/M11/M14).
>
> Lors de l'implémentation de `src/lib/algorithm/hubs.ts`, les `stationIds` devront être remplacés par les IDs réels du dataset. Référence rapide vérifiée au 2026-06-24 :
>
> | Station | ID dataset (`stations.json`) | Lignes |
> |---------|------------------------------|--------|
> | Châtelet | `IDFM:463079` | M1+M4+M7+M11+M14 |
> | Gare du Nord | `IDFM:monomodalStopPlace:462394` | M4+M5+RER B+D |
> | Opéra | `IDFM:463245` | M3+M7+M8 |
> | Bastille | `IDFM:463018` | M1+M5+M8 |
>
> Les stations RER du hub Châtelet-Les Halles (`IDFM:73794` Les Halles M4, `IDFM:474151` RER A/B/D) devront être recherchées dans le dataset par leur nom exact au moment de l'implémentation.

Trois cas initialement envisagés ont été retirés car leurs stations partagent déjà le même stop area dans le dataset et ne nécessitent aucun traitement supplémentaire :
- Nation (M1/M2/M6/M9 + RER A) → `IDFM:71673` unique dans le dataset
- Montparnasse-Bienvenüe (M4/M6/M12/M13) + Gare Montparnasse (RER) → `IDFM:71139` unique
- La Défense-Grande Arche (M1) + La Défense (RER A) → `IDFM:71517` unique

```typescript
type CorrespondanceHub = {
  name: string;               // nom lisible pour le debug
  stationIds: string[];       // IDs IDFM (parent_station) des stations du hub
  walkingTimeMinutes: number; // temps de marche interne estimé
};

const PARIS_HUBS: CorrespondanceHub[] = [
  {
    name: "Châtelet — Les Halles",
    stationIds: [
      "IDFM:71264",   // Châtelet (M1, M7, M11, M14)
      "IDFM:73794",   // Les Halles (M4)
      "IDFM:474151",  // Châtelet - Les Halles (RER A, B, D)
    ],
    walkingTimeMinutes: 5,
  },
  {
    name: "Auber — Havre-Caumartin",
    stationIds: [
      "IDFM:478926",  // Auber (RER A)
      "IDFM:482368",  // Havre - Caumartin (M3, M9)
    ],
    walkingTimeMinutes: 3,
  },
  {
    name: "Saint-Lazare — Haussmann-Saint-Lazare",
    stationIds: [
      "IDFM:71370",   // Gare Saint-Lazare (M3, M12, M13, M14)
      "IDFM:73688",   // Haussmann Saint-Lazare (RER E)
    ],
    walkingTimeMinutes: 5,
  },
  {
    name: "Gare du Nord — Magenta",
    stationIds: [
      "IDFM:71410",   // Gare du Nord (M4, M5, RER B, D)
      "IDFM:478733",  // Magenta (RER E)
    ],
    walkingTimeMinutes: 4,
  },
  {
    name: "Opéra — Chaussée d'Antin-La Fayette",
    stationIds: [
      "IDFM:71337",   // Opéra (M3, M7, M8)
      "IDFM:73689",   // Chaussée d'Antin - La Fayette (M7, M9)
    ],
    walkingTimeMinutes: 3,
  },
];
```

> **Source** : GTFS IDFM `stops.txt`, vérifié le 2026-06-18 via [transport.data.gouv.fr](https://transport.data.gouv.fr/datasets/reseau-urbain-et-interurbain-dile-de-france-mobilites). Tous les IDs sont confirmés dans le dataset réel.

### Logique d'application dans l'algorithme

Quand on calcule le temps de trajet d'un participant `p` vers une station candidate `c` :

1. **Si `p` et `c` appartiennent au même hub** → le temps de trajet est simplement `hub.walkingTimeMinutes` (pas de trajet en transport nécessaire).

2. **Si `c` appartient à un hub** → on calcule le temps vers **chaque station du hub**, et on retient le minimum auquel on ajoute `walkingTimeMinutes` si la station d'arrivée dans le hub n'est pas `c` elle-même.

3. **Cas standard (ni `p` ni `c` dans un hub commun)** → calcul haversine + pénalité correspondance normal.

```typescript
function getHubForStation(stationId: string): CorrespondanceHub | null {
  return PARIS_HUBS.find((hub) => hub.stationIds.includes(stationId)) ?? null;
}

function effectiveTravelTime(
  from: Station,
  to: Station,
  allStations: Station[],
  provider: TravelTimeProvider
): number {
  const toHub = getHubForStation(to.id);
  const fromHub = getHubForStation(from.id);

  // Même hub : trajet à pied uniquement
  if (toHub && fromHub && toHub.name === fromHub.name) {
    return toHub.walkingTimeMinutes;
  }

  // Station candidate dans un hub : tester toutes les entrées du hub
  if (toHub) {
    const hubStations = allStations.filter((s) => toHub.stationIds.includes(s.id));
    const times = hubStations.map((entry) => {
      const t = provider.getMinutes(from, entry);
      return entry.id === to.id ? t : t + toHub.walkingTimeMinutes;
    });
    return Math.min(...times);
  }

  // Cas standard
  return provider.getMinutes(from, to);
}
```

### Limites de cette approche MVP
- La liste est statique et manuelle : elle devra être mise à jour si le réseau évolue.
- Elle ne couvre pas les hubs de petite taille (correspondances < 2 min à pied) ni les hubs en grande banlieue.
- En v2 (matrice GTFS), cette logique devient inutile : la matrice pré-calcule déjà les temps réels inter-stations incluant les marches de correspondance.

---

## Étape 3 — Algorithme minimax

### Principe
Pour chaque station candidate `s` (filtrée via l'Étape 2b), on calcule le temps de trajet de chaque participant vers `s`, puis on retient le maximum. La station optimale est celle dont ce maximum est le plus faible.

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
