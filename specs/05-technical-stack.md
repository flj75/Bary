# 05 — Choix techniques

## Principes directeurs

1. **Zéro backend en MVP** — tout s'exécute côté client (navigateur). Pas de serveur à maintenir, pas de coût d'infrastructure.
2. **Stack mainstream** — chaque techno choisie est un standard de l'industrie en 2026, avec une large communauté et une bonne documentation.
3. **Architecture portable** — les abstractions clés (stockage, routing, calcul) sont conçues pour évoluer sans réécriture.

---

## Stack

### Framework — Next.js (App Router)

**Pourquoi :** Next.js est le framework React le plus utilisé en production. Il expose deux concepts fondamentaux à comprendre en tant que développeur :
- **Composants** : les briques de l'UI (un bouton, une card, une carte)
- **Routing** : comment l'URL change quand on navigue entre écrans

En MVP, l'app est entièrement **statique** (pas de base de données, pas d'API serveur). Next.js permet de démarrer simple et d'ajouter un backend (API Routes) plus tard sans changer de framework.

**Version :** Next.js 15+ (App Router)

---

### Langage — TypeScript (strict)

**Pourquoi :** TypeScript est JavaScript avec un système de types. Il t'oblige à nommer explicitement la forme de tes données, ce qui a deux effets :
- Il détecte les erreurs **avant** l'exécution (au moment où tu codes)
- Il documente le code de façon vivante — une `Station` TypeScript dit tout de suite ce qu'elle contient

```typescript
// Exemple : sans TypeScript, on ne sait pas ce que contient `station`
// Avec TypeScript :
type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: StationLine[];
};
```

**Config :** `"strict": true` dans `tsconfig.json` — le mode le plus exigeant, le plus formateur.

---

### Carte — MapLibre GL JS

**Pourquoi :** MapLibre est le fork open source de Mapbox GL JS. Il offre le même niveau de qualité visuelle (cartes vectorielles, zoom fluide, rotation 3D possible) sans aucune clé API ni coût.

**Tuiles cartographiques :** OpenStreetMap via un provider de tuiles gratuit (ex: [OpenFreeMap](https://openfreemap.org/) ou [Protomaps](https://protomaps.com/)). Les tuiles sont les "images" de la carte — MapLibre les assemble et les affiche.

**Concepts clés exposés :**
- **Markers** : les pins et dots sur la carte (positions des participants, station résultat)
- **fitBounds** : ajustement automatique du zoom pour englober tous les points
- **Style** : le "thème" visuel de la carte (couleurs, labels, routes)

**Intégration React :** via `react-map-gl` (wrapper MapLibre pour React) ou intégration directe.

---

### Styling — Tailwind CSS

**Pourquoi :** Tailwind est un système de classes utilitaires CSS. Au lieu d'écrire des fichiers `.css` séparés, tu appliques des classes directement dans ton HTML/JSX :

```tsx
// Sans Tailwind (CSS séparé)
<button className="my-button">Continuer</button>
// .my-button { background: orange; padding: 12px 24px; border-radius: 8px; }

// Avec Tailwind (tout dans le JSX)
<button className="bg-orange-500 px-6 py-3 rounded-lg text-white font-medium">
  Continuer
</button>
```

C'est plus verbeux dans le code mais élimine la gestion de fichiers CSS et les conflits de nommage. Standard dans l'industrie React.

**Tokens de design Bary :**
```css
/* dans tailwind.config.ts */
colors: {
  brand: {
    orange: '#E07B39',   /* UI principale */
    blue:   '#2563EB',   /* Résultat */
  }
}
```

---

### Stockage — localStorage (abstrait)

**Pourquoi localStorage :** C'est la couche de persistence la plus simple du navigateur — une sorte de dictionnaire clé/valeur qui survit aux rechargements de page. Zéro backend requis.

**Pourquoi l'abstraire :** On enveloppe l'accès dans une interface `FriendStore` pour que le reste du code ne sache pas "où" les données sont stockées. Quand on migrera vers une vraie base de données, seul `FriendStore` changera.

```typescript
// L'interface (contrat) — ne changera jamais
interface FriendStore {
  getAll(): Friend[];
  save(friend: Friend): void;
  update(id: string, data: Partial<Friend>): void;
  delete(id: string): void;
}

// Implémentation MVP (localStorage)
class LocalFriendStore implements FriendStore { ... }

// Implémentation future (Supabase, Prisma...)
class RemoteFriendStore implements FriendStore { ... }
```

---

### Déploiement — Vercel

**Pourquoi :** Vercel est la plateforme de déploiement créée par les auteurs de Next.js. Le workflow est :
1. `git push` sur la branche `main`
2. Vercel détecte le push, build l'app automatiquement
3. L'app est en ligne en ~30 secondes

C'est ce qu'on appelle **CI/CD** (Continuous Integration / Continuous Deployment) — le code déployé est toujours ce qui est sur `main`, automatiquement.

**Coût :** gratuit jusqu'à un volume confortable pour un MVP (100 GB de bande passante/mois).

---

## Structure de fichiers (cible)

```
bary/
├── specs/                    # Ce dossier — documentation produit
├── public/
│   └── data/
│       └── stations.json     # Dataset IDFM statique (~150 Ko)
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Écran 1 — Accueil
│   │   ├── group/
│   │   │   └── page.tsx      # Écran 2 — Groupe
│   │   ├── settings/
│   │   │   └── page.tsx      # Écran 3 — Paramètres
│   │   ├── result/
│   │   │   └── page.tsx      # Écran 4 — Résultat
│   │   └── friends/
│   │       └── page.tsx      # Écran 5 — Carnet d'amis
│   ├── components/           # Composants UI réutilisables
│   │   ├── Map.tsx
│   │   ├── ParticipantCard.tsx
│   │   ├── StationAutocomplete.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── algorithm.ts      # Minimax + tie-breaker
│   │   ├── haversine.ts      # Fonction de distance MVP
│   │   ├── friendStore.ts    # Abstraction localStorage
│   │   └── shareUrl.ts       # Encodage/décodage URL partageable
│   └── types/
│       └── index.ts          # Station, Friend, Participant...
└── tailwind.config.ts
```

---

## Décisions reportées (hors MVP)

| Décision | Déclencheur |
|---|---|
| Remplacer haversine par matrice GTFS | Quand la précision devient un pain point utilisateur |
| Ajouter un backend (API Routes Next.js + BDD) | Quand on veut des comptes utilisateurs ou le partage en temps réel |
| Migrer `FriendStore` vers Supabase | En même temps que le backend |
| Intégrer une API de lieux (Google Places, Foursquare) | En v3 pour les suggestions "À proximité" |
| Support multi-villes | Quand le dataset GTFS d'une autre ville est intégré |
