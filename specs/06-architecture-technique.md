# 06 — Architecture technique

> Ce document traduit les specs fonctionnelles en décisions d'architecture concrètes. Il complète `05-technical-stack.md` (qui explique *pourquoi* chaque techno) en précisant *comment* elles s'articulent dans le code.

---

## 1. Stack et ancrage dans les specs

| Techno | Justification spec |
|--------|-------------------|
| **Next.js 15 — App Router** | 5 écrans distincts (spec 03) → 5 routes fichier système. Static export → "Zéro backend en MVP" (spec 05). |
| **TypeScript strict** | Les types Station, StationLine, CorrespondanceHub (spec 04) deviennent des contrats formels. `strict: true` force la gestion des cas null sur le dataset ~950 stations. |
| **MapLibre GL JS** | Markers (dots participants + pin résultat), `fitBounds` (zoom auto sur le groupe), skeleton sur `map.on('load')` — les trois sont nommés explicitement dans spec 03. Sans clé API ni coût. |
| **Tailwind CSS** | Tokens `brand.orange` (#E07B39) et `brand.blue` (#2563EB) configurés une fois dans `tailwind.config.ts`, cohérents avec la charte spec 05. |
| **localStorage via FriendStore** | Carnet d'amis persistant sans backend (spec 01 : comptes hors scope MVP). Abstraction pour migration future. |
| **Vercel** | CI/CD natif Next.js : push `main` → en ligne en < 1 min. Gratuit pour le volume MVP. |

**Note App Router** : toutes les pages contenant MapLibre ou accédant à localStorage portent la directive `'use client'` (ces APIs n'existent pas côté serveur). Le `layout.tsx` racine reste un Server Component.

---

## 2. Structure de dossiers

```
bary/
├── specs/                              # Documentation produit
├── public/
│   └── data/
│       └── stations.json               # Dataset IDFM statique (~150 Ko, ~950 stations Métro/RER/Tram)
│                                       # Chargé via fetch('/data/stations.json') au premier rendu client
├── src/
│   ├── app/                            # Next.js App Router — 1 dossier = 1 écran
│   │   ├── layout.tsx                  # Layout racine : polices, SessionProvider (Server Component)
│   │   ├── page.tsx                    # Écran 1 — Accueil         (route /)
│   │   ├── group/
│   │   │   └── page.tsx                # Écran 2 — Groupe          (route /group)
│   │   ├── settings/
│   │   │   └── page.tsx                # Écran 3 — Paramètres      (route /settings)
│   │   ├── result/
│   │   │   └── page.tsx                # Écran 4 — Résultat        (route /result)
│   │   │                               # Lit ?s=station-id&g=prenom:id,... pour le lien partagé (spec 03)
│   │   └── friends/
│   │       └── page.tsx                # Écran 5 — Carnet d'amis   (route /friends)
│   │
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx             # Composant MapLibre : gère le lifecycle, skeleton sur 'load'
│   │   │   └── MapMarker.tsx           # Dot orange (participant) ou pin bleu (résultat)
│   │   ├── station/
│   │   │   └── StationAutocomplete.tsx # Champ texte + liste filtrée sur le dataset IDFM
│   │   ├── friend/
│   │   │   ├── FriendCard.tsx          # Ligne carnet : avatar + prénom + station + actions
│   │   │   └── FriendModal.tsx         # Modale création/édition (partagée Écrans 2 et 5)
│   │   ├── participant/
│   │   │   ├── ParticipantList.tsx     # Liste participants dans l'Écran 2
│   │   │   └── ParticipantRow.tsx      # Ligne individuelle : avatar + nom + station + bouton × ou +
│   │   ├── result/
│   │   │   ├── ResultCard.tsx          # Card Écran 4 : station + métriques + liste participants
│   │   │   ├── LineBadge.tsx           # Badge ligne RATP avec couleur officielle (spec 03 : badges ordonnés)
│   │   │   └── ProgressBar.tsx         # Barre trajet normalisée (100% = le plus loin)
│   │   └── ui/                         # Atomes sans logique métier
│   │       ├── Button.tsx
│   │       ├── Toast.tsx               # Toast 2 s pour "Lien copié !" (spec 03)
│   │       └── Tooltip.tsx             # Tooltip desktop + toast mobile sur × désactivé (spec 03)
│   │
│   ├── context/
│   │   └── SessionContext.tsx          # État de session React : participants + transportMode
│   │                                   # Non persisté (hors scope MVP : "pas de dernière session")
│   │
│   ├── lib/
│   │   ├── algorithm/                  # 1 fichier = 1 étape de la spec 04
│   │   │   ├── haversine.ts            # Étape 2  : haversineKm, toMinutes, estimateTransfers
│   │   │   ├── hubs.ts                 # Étape 2c : PARIS_HUBS, getHubForStation, effectiveTravelTime
│   │   │   ├── candidates.ts           # Étape 2b : getReachableStations, buildCandidates
│   │   │   ├── minimax.ts              # Étape 3  : findOptimalStation + Étape 4 tieBreaker
│   │   │   ├── metrics.ts              # Étape 5  : computeDisplayMetrics
│   │   │   └── index.ts                # Point d'entrée unique : findMeetingPoint(participants, allStations)
│   │   │                               # Crée le provider hub-aware via makeProvider(allStations) — closure
│   │   │                               # qui encapsule allStations sans polluer TravelTimeProvider.getMinutes()
│   │   ├── store/
│   │   │   └── friendStore.ts          # Interface FriendStore + class LocalFriendStore (localStorage)
│   │   └── shareUrl.ts                 # encode(participants, result) → URL / decode(url) → état
│   │
│   └── types/
│       ├── station.ts                  # Station, StationLine
│       ├── algorithm.ts                # TravelTimeProvider, CorrespondanceHub
│       ├── friend.ts                   # Friend
│       ├── session.ts                  # Participant, SessionState
│       └── index.ts                    # Re-export centralisé (import depuis "@/types")
│
└── tailwind.config.ts
```

### Règles de navigation entre dossiers

- Les pages (`app/`) **ne contiennent pas de logique** : elles assemblent des composants et lisent le contexte.
- Les composants (`components/`) **ne savent pas** où sont stockées les données — ils reçoivent tout en props.
- La logique métier vit uniquement dans `lib/` : testable en isolation, sans React.
- Les types (`types/`) sont importés depuis `@/types` partout — jamais redéfinis localement.

---

## 3. Organisation des types TypeScript

Traduction directe des types de la spec 04.

### `src/types/station.ts`
```typescript
export type StationLine = {
  id: string;       // ex: "IDFM:C01371"
  name: string;     // ex: "1"
  mode: "metro" | "rer" | "tram";
  color: string;    // couleur officielle hex, ex: "#FFBE00"
};

export type Station = {
  id: string;       // ex: "IDFM:71264"
  name: string;     // ex: "Bastille"
  lat: number;
  lng: number;
  lines: StationLine[];
};
```

### `src/types/algorithm.ts`
```typescript
import type { Station } from "./station";

export interface TravelTimeProvider {
  getMinutes(from: Station, to: Station): number;
}

export type CorrespondanceHub = {
  name: string;
  stationIds: string[];
  walkingTimeMinutes: number;
};
```

### `src/types/friend.ts`
```typescript
export type Friend = {
  id: string;        // UUID généré côté client (crypto.randomUUID())
  name: string;      // Prénom
  stationId: string; // Référence à Station.id
};
```

### `src/types/session.ts`
```typescript
import type { Station } from "./station";

export type Participant = {
  id: string;      // UUID local pour la session
  name: string;
  station: Station;
};

export type SessionState = {
  participants: Participant[];
  transportMode: "metro"; // MVP : valeur unique, prépare l'enum v2
};
```

---

## 4. Gestion d'état

| Donnée | Où | Durée de vie |
|--------|-----|--------------|
| Groupe courant (participants + stations) | `SessionContext` — mémoire React | Session navigateur (onglet) |
| Mode de transport sélectionné | `SessionContext` — mémoire React | Session navigateur |
| Carnet d'amis | `localStorage` via `LocalFriendStore` | Permanent (survit aux rechargements) |
| Station résultat + groupe figé | URL params `?s=...&g=...` | Partageable, déterministe |

### Flux de données entre écrans

```
Écran 2 (Groupe)
  → écrit SessionContext.participants
  → lit FriendStore pour la liste du carnet

Écran 3 (Paramètres)
  → écrit SessionContext.transportMode

Calcul (lib/algorithm)
  → lit SessionContext → retourne { station, times }

Écran 4 (Résultat)
  → route /result?s=[id]&g=[prenom:id,...]
  → décode les params OU lit SessionContext si navigation directe
  → bouton "Partager" → shareUrl.encode() → clipboard
```

Le résultat est encodé dans l'URL dès l'affichage de l'Écran 4 : un destinataire qui ouvre le lien voit le même résultat, indépendamment de son carnet d'amis (spec 03 : "instantané figé").

---

## 5. Dépendances npm principales

| Package | Version cible | Rôle |
|---------|--------------|------|
| `next` | 15.x | Framework App Router |
| `react` / `react-dom` | 19.x | UI |
| `typescript` | 5.x | Langage |
| `tailwindcss` | 4.x | Styles utilitaires |
| `maplibre-gl` | 4.x | Moteur cartographique |
| `react-map-gl` | 8.x | Wrapper React pour MapLibre (gère mount/unmount, SSR guard) |

**Aucune dépendance supplémentaire prévue en MVP** : pas de state manager externe (Zustand, Redux), pas de lib de requêtes (fetch natif suffit pour stations.json), pas de composant UI tiers (tout est écrit from scratch avec Tailwind pour maîtriser la charte).

### Dépendances de développement

| Package | Rôle |
|---------|------|
| `eslint` + `eslint-config-next` | Lint standard Next.js |
| `prettier` | Formatage automatique |
| `vitest` | Tests unitaires (prêt pour le subagent `qa`) |
| `@testing-library/react` | Tests composants |

---

## 6. Décisions reportées

| Décision | Déclencheur |
|----------|-------------|
| State management externe (Zustand) | Si SessionContext devient trop complexe (v2 multi-transport) |
| Matrice GTFS à la place de haversine | Quand la précision devient un pain point utilisateur (spec 04 étape 2 évolution v2) |
| Backend + BDD | Quand comptes utilisateurs ou partage temps réel sont ajoutés au scope |
| Migration `LocalFriendStore` → `RemoteFriendStore` | En même temps que le backend (interface `FriendStore` inchangée) |
| Suggestions de lieux API | v3 (spec 01 roadmap) |
