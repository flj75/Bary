# 07 — Design Tokens Bary

> Référence unique pour toutes les décisions visuelles validées. Lire ce fichier avant d'écrire le moindre composant UI. En cas de doute entre gris et beige/warm : **toujours choisir le ton chaud**.

---

## Palette de couleurs

| Rôle | Valeur | Usage |
|---|---|---|
| Primaire | `#E07B39` (`brand-orange`) | CTA, labels, dots participants, accents |
| Secondaire chaud | `bg-amber-50` / `bg-stone-100` | Boutons secondaires, fonds interactifs chauds |
| Texte principal | `text-zinc-900` | Titres, corps de texte |
| Texte secondaire | `text-stone-600` | Sous-titres, labels descriptifs |
| Texte tertiaire | `text-zinc-400` | Placeholders, métadonnées, états vides |
| Fond général | `#ffffff` (blanc) | Corps de page, cards |

### Règle absolue

**Jamais** `zinc-100`, `gray-*`, `slate-*` pour des éléments interactifs (boutons, hover, fonds de card, inputs, toggles).  
Toujours `stone-*` ou `amber-*` pour les tons neutres chauds.

Les couleurs `zinc-*` sont tolérées **uniquement** pour le texte non-interactif (`text-zinc-400`, `text-zinc-900`).

---

## Carte MapLibre

| Paramètre | Valeur |
|---|---|
| Style | CartoDB Positron — `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json` |
| Filtre CSS | `sepia(10%) brightness(1.02)` |
| Rendu | Tons beige/warm — jamais gris neutre |
| Dots participants | Cercles `bg-brand-orange`, `w-4 h-4`, `ring-2 ring-white shadow-md` |
| Pin résultat | Bleu `brand-blue` (#2563EB), à définir en Écran 4 |
| Skeleton chargement | `bg-stone-100` + spinner `border-stone-300 border-t-stone-500` |

---

## Typographie

| Élément | Classes |
|---|---|
| Police principale | Hanken Grotesk (variable `--font-hanken`) |
| Police mono | JetBrains Mono (données géo uniquement) |
| Titres de page | `text-xl font-bold text-zinc-900` (cards) / `text-4xl font-bold` (hero) |
| Labels uppercase | `text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-400` |
| Labels accent | `text-[10px] font-semibold tracking-[0.14em] uppercase text-brand-orange` |
| Corps | `text-sm text-zinc-400 leading-relaxed` |

---

## Boutons

| Type | Classes |
|---|---|
| **Primaire** | `bg-brand-orange text-white font-semibold rounded-xl py-4 text-[15px] hover:opacity-90 active:scale-[0.98] transition-all` |
| **Secondaire chaud** | `bg-amber-50 text-stone-600 font-normal rounded-xl py-4 text-[15px] hover:bg-amber-100 active:scale-[0.98] transition-all` |
| **Ghost** | `border border-dashed border-stone-300 text-stone-500 rounded-xl hover:border-stone-400 hover:text-stone-700 transition-colors` |
| **Désactivé** | `bg-stone-100 text-stone-400 font-semibold rounded-xl py-4 cursor-not-allowed` (pas d'`opacity-50` — contraste lisible) |
| Icônes action (×, +) | `bg-stone-100 hover:bg-brand-orange hover:text-white text-stone-500` |

---

## Inputs

| État | Classes |
|---|---|
| Défaut | `border border-stone-200 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-400` |
| Focus | `focus:outline-none focus:ring-2 focus:ring-brand-orange/30` |
| Dropdown | `bg-white border border-stone-100 rounded-xl shadow-lg` · items `hover:bg-stone-50` |

---

## Cards

| Propriété | Valeur |
|---|---|
| Fond | `bg-white` (jamais de teinte gris/stone sur la card elle-même) |
| Coins | `rounded-2xl` |
| Ombre | `shadow-md` |
| Padding | `px-6 py-7` (cards hero) / `px-5 pt-5 pb-3` (cards compactes) |
| Séparateurs internes | `border-t border-stone-50` |
| Hover rows | `hover:bg-stone-50` |

---

## Progression & navigation

| Élément | Classes |
|---|---|
| Étiquette étape | `text-[11px] font-bold tracking-[0.2em] text-brand-orange` |
| Compteur (N AMIS) | `text-[11px] font-medium text-zinc-500 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full` |
| Bouton retour ‹ | `w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full text-zinc-600 hover:bg-white` |
| Badge ville | `text-[9px] font-medium tracking-[0.18em] text-zinc-400 border border-zinc-200 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded` |

---

## Toggles

| État | Classes |
|---|---|
| Container on | `bg-brand-orange` |
| Container off | `bg-stone-200` |
| Thumb | `bg-white rounded-full shadow` + `translate-x-[18px]` (on) / `translate-x-0.5` (off) |

---

## Conventions UX

### Features non disponibles en MVP

- Tabs et boutons grisés via `opacity-40` — **jamais** de badge "BIENTÔT" écrit en dur sur l'élément (encombrant, vieillit mal).
- Au tap sur un élément désactivé : afficher un **tooltip sombre** "Disponible bientôt" qui apparaît 1,5 s puis disparaît automatiquement.
- Le tooltip est révélé à l'interaction, pas visible au repos.

```
Tooltip style : bg-zinc-800 text-white text-[11px] rounded-md px-2.5 py-1.5
Position : absolute, bottom-full, centré sur l'élément, mb-1.5
Animation : opacity transition 150 ms
Durée : 1 500 ms
```

### Tooltip × désactivé (groupe à 2 personnes)

Même convention : pas de `title` HTML natif (non stylisable). Afficher un tooltip Tailwind identique au tap/survol avec le message "Minimum 2 personnes pour calculer un point de rencontre".
