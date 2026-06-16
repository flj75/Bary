# Template — User Story

## Mode d'emploi

Ce template est conçu pour rédiger des user stories structurées, exploitables à grande échelle en équipe produit. Il est adapté aussi bien au cadre d'un sprint Agile qu'à une roadmap produit long terme.

**Quand l'utiliser :**
- Lors de la rédaction ou du raffinement d'une fonctionnalité (backlog grooming, sprint planning)
- Avant toute estimation de complexité par l'équipe tech
- Dès qu'une US sort du statut "idée" pour entrer en phase de définition

**Comment l'utiliser :**
- Copier le bloc ci-dessous pour chaque nouvelle US
- Remplir au minimum : ID, Titre, Récit, Priorité, et les Critères d'acceptation
- Les champs *Dépendances*, *Edge cases*, *Notes techniques* et *Lien maquette* peuvent être laissés vides si non applicables
- Le Statut doit être mis à jour tout au long du cycle de vie de l'US
- Les Critères d'acceptation (Given/When/Then) sont la clé : ils définissent contractuellement ce que "terminé" veut dire

**Convention de nommage des IDs :**
- `US-XX` pour les user stories générales
- `US-[MODULE]-XX` pour les projets multi-modules (ex: `US-AUTH-01`, `US-CART-03`)

---

## Bloc US — À copier/coller

```markdown
---

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

---

### Dépendances
- `US-XX` — [raison]

### Edge cases identifiés
- [Description du cas limite 1]
- [Description du cas limite 2]

### Notes techniques / Contraintes connues
- [Contrainte ou choix technique à prendre en compte]

### Lien maquette
- [Nom de l'écran ou lien Figma/design]

---
```
