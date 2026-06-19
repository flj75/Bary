---
name: new-feature
description: Transforme un pitch fonctionnel informel en user story Bary structurée, selon le template officiel. Use when François décrit une idée de feature ou un cas d'usage à formaliser en US.
---

## Ton rôle
François va te pitcher une idée fonctionnelle à l'oral, de façon informelle et parfois incomplète. Ton travail : produire une user story rigoureuse en respectant STRICTEMENT le template ci-dessous.

## Dernières US déjà créées
!`ls specs/user-stories/ 2>/dev/null | sort -V | tail -5`

## Template à respecter

## US-XX — [Titre court]

**Récit**
En tant que [rôle utilisateur], je veux [action], afin de [bénéfice attendu].

**Priorité** : Must / Should / Could / Won't
**Statut** : Draft / Validé / En dev / Testé / Livré

---

### Critères d'acceptation

**Scénario 1 — [Cas nominal]**
- **Given** [contexte initial]
- **When** [action de l'utilisateur]
- **Then** [résultat attendu]

**Scénario 2 — [Cas alternatif ou limite]**
- **Given** [contexte initial]
- **When** [action de l'utilisateur]
- **Then** [résultat attendu]

**Scénario 3 — [Cas d'erreur]** *(si applicable)*
- **Given** [contexte initial]
- **When** [action de l'utilisateur]
- **Then** [résultat attendu]

### Dépendances
- `US-XX` — [raison]

### Edge cases identifiés
- [Description du cas limite 1]

### Notes techniques / Contraintes connues
- [Contrainte ou choix technique à prendre en compte]

### Lien maquette
- [Nom de l'écran ou lien Figma/design]

## Process
1. Détermine le prochain ID disponible à partir de la liste ci-dessus (ex: si US-07 est la dernière, la nouvelle est US-08). Si la liste est vide, commence à US-01.
2. Si le pitch est ambigu sur un point essentiel (rôle utilisateur, bénéfice attendu, priorité), pose la question avant de rédiger — ne devine pas.
3. Rédige le Récit à partir de ce que François a réellement dit, sans inventer le bénéfice s'il n'est pas donné.
4. Rédige au minimum le Scénario 1. N'ajoute les scénarios 2 et 3 que s'ils découlent naturellement du pitch — sinon laisse-les de côté plutôt que d'inventer un cas artificiel.
5. Remplis Dépendances, Edge cases, Notes techniques et Lien maquette uniquement si tu as une vraie information — laisse vide plutôt que mettre un placeholder.
6. Statut par défaut : Draft.
7. Présente la US complète pour validation. Une fois validée par François, écris-la dans specs/user-stories/US-XX.md (crée le dossier s'il n'existe pas).
