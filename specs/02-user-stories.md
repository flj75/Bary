# 02 — User Stories

> Format : voir `specs/templates/user-story-template.md`

---

## Flux principal — Trouver un point de rencontre

---

## US-01 — Créer un groupe depuis l'accueil

**Récit**
En tant qu'utilisateur, je veux créer un nouveau groupe depuis l'écran d'accueil, afin de démarrer la recherche d'un point de rencontre.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Lancement nominal**
- **Given** je suis sur l'écran d'accueil
- **When** je tape sur "Créer un groupe"
- **Then** je suis redirigé vers l'écran 2 (Groupe) avec une liste de participants vide

**Scénario 2 — Retour depuis un écran ultérieur**
- **Given** je suis sur l'écran 3 ou 4
- **When** je tape sur le logo Bary
- **Then** je reviens à l'écran d'accueil sans perdre le groupe en cours (état conservé)

---

### Dépendances
- Aucune

### Edge cases identifiés
- Premier lancement : aucun ami dans le carnet, liste vide à l'écran 2

### Notes techniques / Contraintes connues
- Navigation via Next.js App Router (pas de rechargement de page)

### Lien maquette
- Écran 1 — Accueil

---

## US-02 — Ajouter un participant depuis le carnet d'amis

**Récit**
En tant qu'utilisateur, je veux ajouter des participants à mon groupe en les sélectionnant depuis mon carnet d'amis, afin de ne pas ressaisir leurs stations à chaque fois.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Ajout nominal**
- **Given** je suis sur l'écran 2 et mon carnet contient au moins un ami
- **When** je tape sur le bouton **+** à côté d'un ami
- **Then** cet ami apparaît dans la section "Dans le groupe" et un dot orange apparaît sur la carte à sa station

**Scénario 2 — Recherche dans le carnet**
- **Given** le carnet contient plusieurs amis
- **When** je saisis des caractères dans le champ "Rechercher un ami..."
- **Then** la liste est filtrée en temps réel (insensible à la casse et aux accents)

**Scénario 3 — Ami déjà dans le groupe**
- **Given** un ami est déjà dans le groupe
- **When** je le vois dans la liste du carnet
- **Then** son bouton **+** est désactivé ou absent (impossible de l'ajouter deux fois)

---

### Dépendances
- `US-12` — l'ami doit exister dans le carnet

### Edge cases identifiés
- Carnet vide : afficher un état vide avec CTA "Ajouter un ami"
- Tous les amis du carnet sont déjà dans le groupe : liste vide, seul "+ Nouvelle personne" est disponible

### Notes techniques / Contraintes connues
- Lecture du carnet depuis localStorage
- Filtrage côté client uniquement (pas d'appel réseau)

### Lien maquette
- Écran 2 — Groupe

---

## US-03 — Ajouter une nouvelle personne hors carnet

**Récit**
En tant qu'utilisateur, je veux ajouter une nouvelle personne avec son nom et sa station, afin d'inclure quelqu'un que je n'ai pas encore enregistré.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Ajout sans sauvegarde**
- **Given** je tape sur "+ Nouvelle personne"
- **When** je remplis le nom et la station puis valide sans cocher "Sauvegarder dans mes amis"
- **Then** la personne est ajoutée au groupe uniquement pour cette session

**Scénario 2 — Ajout avec sauvegarde dans le carnet**
- **Given** je tape sur "+ Nouvelle personne"
- **When** je remplis le nom et la station et valide avec "Sauvegarder dans mes amis" coché
- **Then** la personne est ajoutée au groupe ET sauvegardée dans le carnet (localStorage)

**Scénario 3 — Validation du champ station**
- **Given** la modale de nouvelle personne est ouverte
- **When** je saisis des caractères dans le champ station
- **Then** une liste autocomplete des stations IDFM s'affiche ; je dois sélectionner une station existante (saisie libre non acceptée)

---

### Dépendances
- Aucune (peut être utilisée sans carnet existant)

### Edge cases identifiés
- Nom identique à un ami existant dans le carnet : autoriser (deux personnes peuvent avoir le même prénom)
- Fermeture de la modale sans valider : aucun ajout, aucune sauvegarde

### Notes techniques / Contraintes connues
- Autocomplete station : filtrage sur le dataset IDFM statique embarqué
- "Sauvegarder dans mes amis" coché par défaut

### Lien maquette
- Écran 2 — Groupe (modale "+ Nouvelle personne")

---

## US-04 — Retirer un participant du groupe

**Récit**
En tant qu'utilisateur, je veux retirer un participant du groupe avant de lancer le calcul, afin de corriger ma sélection.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Suppression nominale**
- **Given** le groupe contient au moins 3 participants
- **When** je tape sur le **×** à côté d'un participant
- **Then** il disparaît immédiatement de la liste et son dot orange disparaît de la carte

**Scénario 2 — Tentative de descente sous 2 participants**
- **Given** le groupe contient exactement 2 participants
- **When** je regarde la liste
- **Then** les deux boutons × sont désactivés (grisés) — il est impossible de retirer un participant quand le groupe est au minimum

---

### Dépendances
- `US-02` ou `US-03`

### Edge cases identifiés
- Le bouton × est désactivé dès que le groupe atteint 2 participants ; on ne peut jamais passer sous ce seuil

### Notes techniques / Contraintes connues
- Aucune persistance de l'état du groupe entre sessions (session en mémoire uniquement)

### Lien maquette
- Écran 2 — Groupe

---

## US-05 — Visualiser les participants sur la carte en temps réel

**Récit**
En tant qu'utilisateur, je veux voir mes participants s'afficher sous forme de points sur la carte en temps réel, afin d'avoir une représentation visuelle du groupe.

**Priorité** : Should
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Ajout d'un participant**
- **Given** je suis sur l'écran 2
- **When** j'ajoute un participant
- **Then** un dot orange apparaît immédiatement sur sa station dans la carte en fond

**Scénario 2 — Retrait d'un participant**
- **Given** un participant est dans le groupe
- **When** je le retire
- **Then** son dot disparaît immédiatement de la carte

**Scénario 3 — Zoom automatique**
- **Given** le groupe contient au moins 2 participants
- **When** je les ajoute
- **Then** la carte ajuste son zoom pour que tous les dots soient visibles simultanément

---

### Dépendances
- `US-02`, `US-03`

### Edge cases identifiés
- Deux participants à la même station : un seul dot, pas de superposition problématique

### Notes techniques / Contraintes connues
- MapLibre GL JS : ajout de markers dynamiques sur les coordonnées des stations
- `fitBounds()` pour l'ajustement automatique du zoom

### Lien maquette
- Écran 2 — Groupe (carte en fond)

---

## US-06 — Choisir le mode de transport

**Récit**
En tant qu'utilisateur, je veux choisir le mode de transport de mon groupe, afin que le calcul soit adapté à comment chacun va se déplacer.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Sélection du mode par défaut**
- **Given** je suis sur l'écran 3
- **When** l'écran s'affiche
- **Then** "Métro / RER / Tram" est présélectionné

**Scénario 2 — Modes non disponibles en MVP**
- **Given** je suis sur l'écran 3
- **When** je vois les options À pied, Vélo, Voiture
- **Then** ces options sont visuellement désactivées avec un badge "Bientôt"

**Scénario 3 — Validation et passage au calcul**
- **Given** le mode Métro est sélectionné
- **When** je tape "Calculer le point"
- **Then** le calcul est lancé et je suis redirigé vers l'écran 4

---

### Dépendances
- `US-01`, `US-02` ou `US-03` (le groupe doit exister)

### Edge cases identifiés
- Retour en arrière depuis l'écran 3 : le mode sélectionné est conservé

### Notes techniques / Contraintes connues
- MVP : seul le mode RATP est fonctionnel
- Architecture du sélecteur pensée pour accueillir les autres modes en v2

### Lien maquette
- Écran 3 — Paramètres

---

## US-07 — Afficher la station de rencontre optimale

**Récit**
En tant qu'utilisateur, je veux voir la station de rencontre optimale s'afficher sur la carte avec son nom et sa ligne, afin de savoir immédiatement où aller.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Affichage du résultat**
- **Given** le calcul est terminé
- **When** l'écran 4 s'affiche
- **Then** la carte est centrée sur la station résultat, un pin bleu la marque, son nom apparaît en grand (bleu) et le badge de ligne est affiché avec la couleur officielle RATP

**Scénario 2 — Résultat unique**
- **Given** le calcul retourne une station optimale
- **When** l'écran 4 s'affiche
- **Then** une seule station est mise en avant (pas de liste de suggestions)

---

### Dépendances
- `US-06`

### Edge cases identifiés
- Égalité parfaite entre deux stations (même minimax) : sélectionner la station la plus proche du centre géographique de Paris — point de référence : Châtelet (48.8597° N, 2.3469° E). Justification : anticipe la v3 (suggestions de lieux), où les stations centrales offrent un bassin de lieux plus large
- Groupe de 2 personnes : la station médiane est souvent une station intermédiaire sur leur ligne commune

### Notes techniques / Contraintes connues
- Algorithme minimax sur dataset haversine (voir `specs/04-algorithm.md`)
- Badge ligne : couleur officielle RATP stockée dans le dataset stations

### Lien maquette
- Écran 4 — Résultat

---

## US-08 — Voir les temps de trajet individuels

**Récit**
En tant qu'utilisateur, je veux voir le temps de trajet estimé de chaque participant vers la station résultat, afin de pouvoir montrer au groupe que le choix est équitable.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Liste des temps**
- **Given** l'écran 4 est affiché
- **When** je regarde le panneau résultat
- **Then** chaque participant apparaît avec son avatar (initiale + couleur), son prénom, une progress bar orange et son temps en minutes

**Scénario 2 — Normalisation des barres**
- **Given** plusieurs participants avec des temps différents
- **When** les progress bars s'affichent
- **Then** la barre la plus longue est à 100% et les autres sont proportionnelles

---

### Dépendances
- `US-07`

### Edge cases identifiés
- Tous les participants à la même station que le résultat : toutes les barres affichent 100% (égalité visuelle — la normalisation s'applique sur le max, qui est 0 min, donc toutes les barres sont pleines pour marquer l'équité parfaite)
- Participant déjà à la station résultat mais pas les autres : sa barre est vide (0 min), les autres sont proportionnelles au max

### Notes techniques / Contraintes connues
- Temps calculé via haversine → conversion en minutes avec vitesse moyenne métro estimée (≈ 30 km/h)

### Lien maquette
- Écran 4 — Résultat

---

## US-09 — Mettre en évidence le trajet le plus long

**Récit**
En tant qu'utilisateur, je veux voir le trajet le plus long mis en évidence, afin de comprendre qui est le plus contraint et valider l'équité.

**Priorité** : Should
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Affichage de la métrique "Le plus loin"**
- **Given** l'écran 4 est affiché
- **When** je regarde les deux métriques en haut du panneau
- **Then** la métrique "LE PLUS LOIN · Prénom" affiche le temps max et le prénom du participant concerné

**Scénario 2 — Cohérence avec la liste**
- **Given** la métrique "Le plus loin" indique Sofia à 36 min
- **When** je regarde la liste des participants
- **Then** la barre de Sofia est la plus longue (100%) et son temps est 36 min

---

### Dépendances
- `US-08`

### Edge cases identifiés
- Égalité entre deux participants sur le temps max : afficher les deux prénoms ("Sofia & Hugo · 36 min")

### Notes techniques / Contraintes connues
- Aucune — dérivé directement du résultat du minimax

### Lien maquette
- Écran 4 — Résultat

---

## US-10 — Partager le résultat via un lien

**Récit**
En tant qu'utilisateur, je veux partager le résultat via un lien copié dans mon presse-papier, afin de communiquer le lieu de rendez-vous à mon groupe.

**Priorité** : Should
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Copie du lien**
- **Given** je suis sur l'écran 4
- **When** je tape "Partager"
- **Then** l'URL encodée est copiée dans mon presse-papier et un toast "Lien copié !" s'affiche 2 secondes

**Scénario 2 — Ouverture du lien partagé**
- **Given** un destinataire reçoit le lien et l'ouvre dans son navigateur
- **When** la page se charge
- **Then** il voit directement l'écran 4 avec le résultat pré-calculé (station + participants + temps)

**Scénario 3 — Presse-papier non disponible (desktop sans permission)**
- **Given** le navigateur refuse l'accès au presse-papier
- **When** je tape "Partager"
- **Then** l'URL s'affiche dans un champ texte sélectionnable pour copie manuelle

**Scénario 4 — Groupe trop grand pour le lien (> 12 participants)**
- **Given** le groupe contient plus de 12 participants
- **When** je regarde le bouton "Partager" sur l'écran résultat
- **Then** le bouton est désactivé et affiche le message : "Le lien de partage est disponible pour les groupes de 12 personnes maximum."

---

### Dépendances
- `US-07`

### Edge cases identifiés
- Maximum 12 participants pour le partage par lien (limite URL) ; au-delà, le bouton "Partager" est désactivé avec un message explicite

### Notes techniques / Contraintes connues
- Format URL : `bary.app/?s=[station-id]&g=[nom:station-id,...]`
- API `navigator.clipboard.writeText()` avec fallback sur `document.execCommand('copy')`
- Pas de backend requis : tout est encodé dans les query params

### Lien maquette
- Écran 4 — Résultat (bouton "Partager")

---

## US-11 — Modifier le groupe depuis l'écran résultat

**Récit**
En tant qu'utilisateur, je veux pouvoir modifier le groupe depuis l'écran de résultat, afin d'ajuster sans tout recommencer.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Retour à l'écran groupe**
- **Given** je suis sur l'écran 4
- **When** je tape "Modifier"
- **Then** je reviens à l'écran 2 avec le groupe actuel intact (tous les participants toujours présents)

**Scénario 2 — Recalcul après modification**
- **Given** je reviens sur l'écran 2 via "Modifier" et je change le groupe
- **When** je retape "Continuer" puis "Calculer le point"
- **Then** un nouveau résultat est calculé avec le groupe mis à jour

---

### Dépendances
- `US-07`

### Edge cases identifiés
- Retour via "Modifier" puis abandon (fermeture de l'onglet) : état non persisté, normal

### Notes techniques / Contraintes connues
- L'état du groupe est conservé en mémoire (state React) pendant la session

### Lien maquette
- Écran 4 — Résultat (bouton "Modifier")

---

## Carnet d'amis

---

## US-12 — Enregistrer un ami dans le carnet

**Récit**
En tant qu'utilisateur, je veux enregistrer une nouvelle personne dans mon carnet avec son nom et sa station par défaut, afin de la retrouver rapidement lors d'une prochaine session.

**Priorité** : Must
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Ajout via "+ Nouvelle personne"**
- **Given** je suis sur l'écran 2 et j'ajoute une nouvelle personne
- **When** je valide avec "Sauvegarder dans mes amis" coché
- **Then** l'ami apparaît dans le carnet lors de la prochaine ouverture de l'écran 2

**Scénario 2 — Ajout direct depuis le carnet**
- **Given** je suis sur l'écran Carnet d'amis
- **When** je tape "+ Ajouter un ami" et remplis nom + station
- **Then** l'ami est sauvegardé et visible immédiatement dans la liste

**Scénario 3 — Persistance entre sessions**
- **Given** j'ai sauvegardé un ami
- **When** je ferme et rouvre l'app
- **Then** l'ami est toujours présent dans le carnet

---

### Dépendances
- Aucune

### Edge cases identifiés
- Stockage localStorage plein (rare mais possible) : afficher un message d'erreur explicite

### Notes techniques / Contraintes connues
- Stockage : localStorage via une interface abstraite `FriendStore` (prête pour migration BDD)
- Structure de données : `{ id: uuid, name: string, stationId: string, color: string }`

### Lien maquette
- Écran 2 — modale "+ Nouvelle personne" / Écran Carnet d'amis

---

## US-13 — Modifier la station par défaut d'un ami

**Récit**
En tant qu'utilisateur, je veux modifier la station par défaut d'un ami dans le carnet, afin de la mettre à jour s'il a déménagé.

**Priorité** : Should
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Modification nominale**
- **Given** je suis sur l'écran Carnet d'amis
- **When** je tape sur un ami et modifie sa station dans la modale d'édition
- **Then** la nouvelle station est sauvegardée et visible immédiatement dans la liste

**Scénario 2 — Modification du nom**
- **Given** je suis en mode édition d'un ami
- **When** je modifie son nom
- **Then** le nouveau nom est sauvegardé et son avatar (initiale) se met à jour

---

### Dépendances
- `US-12`

### Edge cases identifiés
- L'ami est en cours d'utilisation dans un groupe actif : la modification s'applique au carnet mais pas à la session en cours

### Notes techniques / Contraintes connues
- Mise à jour par `id` dans localStorage

### Lien maquette
- Écran Carnet d'amis (modale d'édition)

---

## US-14 — Supprimer un ami du carnet

**Récit**
En tant qu'utilisateur, je veux supprimer un ami du carnet, afin de le tenir à jour.

**Priorité** : Should
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Suppression avec confirmation**
- **Given** je suis sur l'écran Carnet d'amis
- **When** je swipe ou tape × sur un ami
- **Then** une confirmation est demandée ("Supprimer Hugo ?") avant suppression définitive

**Scénario 2 — Suppression confirmée**
- **Given** j'ai confirmé la suppression
- **When** je reviens à la liste
- **Then** l'ami n'apparaît plus dans le carnet ni dans les suggestions de l'écran 2

---

### Dépendances
- `US-12`

### Edge cases identifiés
- Suppression du dernier ami du carnet : le carnet affiche un état vide

### Notes techniques / Contraintes connues
- Suppression par `id` dans localStorage

### Lien maquette
- Écran Carnet d'amis

---

## US-15 — Rechercher un ami dans le carnet

**Récit**
En tant qu'utilisateur, je veux rechercher un ami dans le carnet par son nom, afin de le retrouver rapidement quand le carnet est grand.

**Priorité** : Could
**Statut** : Draft

---

### Critères d'acceptation

**Scénario 1 — Recherche nominale**
- **Given** le carnet contient plusieurs amis
- **When** je saisis un prénom dans le champ de recherche
- **Then** la liste est filtrée en temps réel et n'affiche que les correspondances (insensible à la casse et aux accents)

**Scénario 2 — Aucun résultat**
- **Given** je recherche un prénom inexistant dans le carnet
- **When** la liste se met à jour
- **Then** un message "Aucun ami trouvé" s'affiche avec un CTA "Ajouter [prénom]"

---

### Dépendances
- `US-12`

### Edge cases identifiés
- Recherche sur la station (pas seulement le nom) : à décider (hors scope MVP)

### Notes techniques / Contraintes connues
- Filtrage côté client uniquement

### Lien maquette
- Écran Carnet d'amis / Écran 2 — champ "Rechercher un ami..."
