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
- Tagline : *"Le point de rencontre le plus équitable pour votre groupe."*
- CTA principal : **"Créer un groupe"** (bouton orange plein)
- Lien secondaire : **"Mes amis"** → accès au carnet d'amis

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
  - Bouton **"+ Nouvelle personne"** (bordure pointillée)
  - CTA : **"Continuer · N amis"** (orange, activé dès 2 participants)

### Comportements
| Action | Résultat |
|---|---|
| Tap **+** sur un ami du carnet | Ajout au groupe + dot sur la carte |
| Tap **×** sur un participant (groupe > 2) | Retrait + disparition du dot |
| Tap **×** avec groupe = 2 | Bouton × désactivé (grisé) |
| Saisie dans le champ recherche | Filtrage temps réel (insensible casse/accents) |
| Tap **"+ Nouvelle personne"** | Ouverture de la modale de création |
| Ajout du 2e participant | CTA "Continuer" s'active |

### Modale "Nouvelle personne"
- Champ **Prénom**
- Champ **Station** (autocomplete sur le dataset IDFM statique)
- Toggle **"Sauvegarder dans mes amis"** (activé par défaut)
- Bouton **Annuler** + bouton **Ajouter**

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
    - À pied — désactivé, badge *"Bientôt"*
    - Vélo — désactivé, badge *"Bientôt"*
    - Voiture — désactivé, badge *"Bientôt"*
  - CTA : **"Calculer le point →"** (orange)

### Note MVP
Le sélecteur de type de lieu (Bar, Restaurant, Café, Parc…) est absent du MVP. Il sera introduit en v3 avec les suggestions de lieux à proximité.

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
- **Badge ligne** (cercle coloré avec numéro/lettre, couleur officielle RATP/IDFM)
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
bary.app/?s=[station-id]&g=[prenom:station-id,prenom:station-id,...]
```
Exemple : `bary.app/?s=bastille&g=Hugo:chatelet,Sofia:pigalle,Karim:denfert,François:nation`

Un destinataire qui ouvre ce lien voit directement l'Écran 4 avec le résultat pré-calculé.

---

## Écran 5 — Carnet d'amis

**Rôle** : gérer la liste persistante d'amis (accessible depuis l'Écran 1 via "Mes amis").

### Éléments
- En-tête : **"Mes amis"** + bouton **‹** (retour Écran 1)
- Champ de recherche : *"Rechercher..."*
- Liste des amis (avatar + nom + station par défaut)
- État vide : *"Aucun ami enregistré"* + CTA **"+ Ajouter un ami"**
- Bouton flottant ou fixe : **"+ Ajouter un ami"**

### Comportements
| Action | Résultat |
|---|---|
| Tap sur un ami | Ouverture modale d'édition (nom + station) |
| Swipe gauche / tap × | Demande de confirmation → suppression |
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
