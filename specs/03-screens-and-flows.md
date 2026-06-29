# 03 — Écrans & Flux

## Vue d'ensemble du flux

```
[Écran 1 — Accueil]
        ↓  "Créer un groupe"
[Écran 2 — Groupe]          ←──────────────────┐
        ↓  "Continuer · N amis"                 │
[Écran 3 — Paramètres]                          │
        ↓  "Calculer le point"                  │
[Écran 4 — Résultat]  ──── "Modifier" ──────────┘
        ↓  "Partager" → copie URL dans presse-papier

[Logo Bary] → retour Écran 1 depuis n'importe quel écran
[‹]         → retour à l'écran précédent
```

---

## Écran 1 — Accueil

**Rôle** : point d'entrée, présentation de la promesse en une phrase.

### Éléments
- En-tête : logo **Bary** + badge ville **"PARIS"**
- Carte MapLibre en fond (style épuré, monochrome gris)
- Tagline : *"Le point de rdv, calculé pour tout le groupe."*
- CTA principal : **"Créer un point de rencontre"** (bouton orange plein)

### États
| État | Affichage |
|---|---|
| Premier lancement | Accueil standard, carnet vide |
| Retours ultérieurs | Accueil standard (pas de dernière session en MVP) |

---

## Écran 2 — Groupe

**Rôle** : constituer le groupe de participants avec leurs stations de départ.

### Éléments
- Barre de progression : **ÉTAPE 01 / 03** (orange) + compteur **N AMIS** (droite)
- Carte en fond avec dots orange positionnés sur les stations de chaque participant (mise à jour en temps réel)
- Card centrale :
  - Titre : *"Qui se retrouve ?"*
  - Tabs : **Rechercher** (actif) | Carte *(futur)* | Lien *(futur)*
  - Section **DANS LE GROUPE · N** : liste des participants (avatar initiale + nom + station + bouton ×)
  - Champ : *"Rechercher un ami..."* (filtre le carnet en temps réel)
  - Liste filtrée du carnet : avatar + nom + station + bouton **+**
  - Lien discret **"Gérer mes amis →"** (accès au carnet d'amis)
  - Bouton **"+ Nouvelle personne"** (bordure pointillée)
  - CTA : **"Continuer · N amis"** (orange, activé dès 2 participants)

### Comportements
| Action | Résultat |
|---|---|
| Tap **+** sur un ami du carnet | Ajout au groupe + dot sur la carte |
| Tap **×** sur un participant | Retrait + disparition du dot |
| Tap **×** avec groupe = 2 | Bouton × toujours actif — CTA "Continuer" se désactive (minimum 2 participants) |
| Saisie dans le champ recherche | Filtrage temps réel (insensible casse/accents) |
| Tap **"+ Nouvelle personne"** | Ouverture de la modale de création |
| Ajout du 2e participant | CTA "Continuer" s'active |

### Modale "Nouvelle personne"
- Champ **Prénom**
- Champ **Station** (autocomplete sur le dataset IDFM statique)
- Toggle **"Sauvegarder dans mes amis"** (activé par défaut)
- Bouton **Annuler** + bouton **Ajouter**

### État de chargement de la carte
MapLibre charge ses tuiles de façon asynchrone. Pendant l'initialisation (particulièrement perceptible sur connexion mobile lente) :
- Un **skeleton gris** recouvre la zone carte (même dimensions, même position en fond)
- Un **spinner discret** est centré sur le skeleton
- Dès que MapLibre émet l'événement `map.on('load')`, le skeleton disparaît avec un fondu (opacity 0 → transition 200 ms)

Ce comportement s'applique à tous les écrans contenant une carte (Écrans 1, 2, 3, 4).

### Zoom carte
La carte ajuste automatiquement son emprise (`fitBounds`) pour englober tous les dots visibles.

---

## Écran 3 — Paramètres

**Rôle** : choisir le mode de transport (réduit au maximum en MVP).

### Éléments
- Barre de progression : **ÉTAPE 02 / 03**
- Card centrale :
  - Titre : *"Comment vous déplacez-vous ?"*
  - Mention : **MÉTRO PAR DÉFAUT** (label discret)
  - Sélecteur transport (pills horizontales) :
    - **Métro / RER / Tram** — actif, présélectionné
    - À pied — désactivé, tooltip *"Disponible bientôt"* au tap
    - Vélo — désactivé, tooltip *"Disponible bientôt"* au tap
    - Voiture — désactivé, tooltip *"Disponible bientôt"* au tap
  - CTA : **"Calculer le point →"** (orange)

### Note MVP
Le sélecteur de type de lieu (Bar, Restaurant, Café, Parc…) est absent du MVP. Il sera introduit en v3 avec les suggestions de lieux à proximité.

### Transition vers l'écran 4 — Animation de calcul
Le calcul minimax prend < 1 ms en réalité, mais une transition perçue de **1 à 2 secondes** renforce la confiance de l'utilisateur dans le résultat (sentiment que "quelque chose a vraiment été calculé").

Comportement au tap sur "Calculer le point" :
1. Le CTA passe en état **chargement** (spinner blanc remplace le texte, bouton non re-cliquable)
2. Le calcul s'exécute immédiatement côté client
3. Un délai artificiel de **1 200 ms** est appliqué après le calcul
4. Pendant ce délai, la carte en fond effectue un **zoom animé** vers le barycentre géographique du groupe (anticipation visuelle)
5. À 1 200 ms : transition vers l'Écran 4 (slide up ou fade, à définir en phase design)

Ce délai est intentionnel et documenté — il ne masque pas une lenteur mais construit la perception de précision.

---

## Écran 4 — Résultat

**Rôle** : afficher la station optimale, les temps individuels, et permettre le partage.

### Éléments — Carte
- Carte centrée sur la station résultat
- **Pin bleu** sur la station résultat
- **Dots orange** sur les stations de départ de chaque participant
- Motif de cercles concentriques en fond (évoque visuellement le concept de barycentre)

### Éléments — Card résultat
- *"Rendez-vous à"* (label discret)
- **Nom de la station** (large, bleu)
- **Badges lignes** : si la station résultat est desservie par plusieurs lignes, tous les badges sont affichés côte à côte, ordonnés par numéro/lettre de ligne (ordre : chiffres croissants d'abord, puis lettres alphabétiques — ex : 1, 5, 14, A, B). Chaque badge garde sa couleur officielle RATP/IDFM.
- Sous-titre : *"Le point le plus équitable pour N amis en Métro."*
- Deux métriques côte à côte :
  - **Trajet moyen** : X min
  - **Le plus loin · Prénom** : Y min
- Liste participants :
  - Avatar (initiale + couleur unique) · Prénom · barre de progression orange · X min
  - Barre normalisée : max = 100%, autres proportionnelles
  - Cas particulier : tous à 0 min → toutes les barres à 100% (égalité parfaite)
- CTA secondaire : **"Modifier"** (outline) → retour Écran 2 avec groupe intact
- CTA principal : **"Partager"** (orange) → voir comportements ci-dessous

### Comportements — Bouton "Partager"
| Condition | Comportement |
|---|---|
| Groupe ≤ 12 participants, presse-papier disponible | Copie l'URL encodée + toast *"Lien copié !"* (2 s) |
| Groupe ≤ 12 participants, presse-papier refusé | Affiche l'URL dans un champ texte sélectionnable |
| Groupe > 12 participants | Bouton désactivé + message *"Le lien de partage est disponible pour les groupes de 12 personnes maximum."* |

### Format de l'URL partageable
```
bary.app/result?s=[station-id]&g=[prenom|station-id,prenom|station-id,...]
```
Exemple : `bary.app/result?s=IDFM%3A463079&g=Hugo|IDFM%3A462972,Sofia|IDFM%3A463029`

Le séparateur `|` (et non `:`) est utilisé entre prénom et stationId pour éviter toute ambiguïté avec les stationIds IDFM de la forme `IDFM:xxx` (BUG-01 corrigé).

Les caractères `, | & = + # ?` sont interdits à la saisie dans le champ Prénom (BUG-03 corrigé).

### Vue destinataire (US-18)

Quand un destinataire ouvre le lien sans session active, la page `/result` :
1. Affiche un spinner immédiatement — pas de flash blanc
2. Reconstruit le résultat côté client : fetch du dataset, parsing des params, re-calcul minimax
3. Affiche l'Écran 4 normalement avec le résultat recalculé
4. Si le lien est malformé ou une station est introuvable → écran *"Lien invalide"* (2 s), puis redirection vers l'Écran 1 avec toast *"Lien invalide"*

### Comportement du lien si le carnet d'amis a changé
Le lien encode un **instantané figé** au moment du partage : station résultat, prénoms des participants et stations de départ. Il est **totalement indépendant du carnet d'amis** du créateur.

Si Hugo déménage à Oberkampf après le partage, le lien affiche toujours son ancienne station (Châtelet). Le résultat reste valide et identique pour tous les destinataires, quelle que soit l'évolution ultérieure du carnet. C'est un choix délibéré : un lien partagé doit toujours afficher le même résultat (comportement déterministe, pas de surprise à la réécriture).

---

## Écran 5 — Carnet d'amis

**Rôle** : gérer la liste persistante d'amis (accessible depuis l'Écran 2 via "Gérer mes amis →").

### Éléments
- En-tête : **"Mes amis"** + bouton **‹** (retour Écran 2 — `router.back()`)
- Champ de recherche : *"Rechercher..."*
- Liste des amis (avatar + nom + station par défaut)
- État vide : *"Aucun ami enregistré"* + CTA **"+ Ajouter un ami"**
- Bouton flottant ou fixe : **"+ Ajouter un ami"**

### Comportements
| Action | Résultat |
|---|---|
| Tap sur un ami | Ouverture modale d'édition (nom + station) |
| Tap **"× Supprimer"** (texte affiché sous la ligne) | Demande de confirmation → suppression (swipe non implémenté en MVP) |
| Tap "+ Ajouter un ami" | Modale de création (même que l'Écran 2) |
| Saisie dans le champ recherche | Filtrage temps réel par nom |
| Aucun résultat de recherche | Message *"Aucun ami trouvé"* + CTA *"Ajouter [prénom]"* |

---

## Navigation globale

| Élément | Comportement |
|---|---|
| Logo **Bary** (haut gauche) | Retour Écran 1 depuis n'importe où |
| Bouton **‹** (haut droite) | Retour à l'écran précédent |
| Pas de barre de navigation permanente | L'app est un flux linéaire, pas un outil multi-sections |

---

## Responsive

L'app est **web responsive** (mobile-first). La carte occupe tout l'arrière-plan sur mobile ; les cards se positionnent en bas de l'écran en drawer. Sur desktop, la card est centrée avec la carte en fond plein écran.
