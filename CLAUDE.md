## Workflow de développement

Bary suit un cycle spec-driven avec des agents dédiés à chaque étape. Toujours respecter cet ordre.

### 1. Cadrage — skill `new-feature`
François pitche une idée à l'oral. Le skill `new-feature` la formalise en user story selon le template officiel, dans `specs/user-stories/US-XX.md` (un fichier par US, ID simple incrémental, pas de préfixe module).

### 2. Implémentation
Le code est écrit (par François ou Claude Code) en suivant la US validée.

### 3. Review — subagent `reviewer` (automatique)
Se déclenche juste après une implémentation. Vérifie la cohérence US ↔ code et la qualité générale.
- Corrections sûres : appliquées directement (confirmation demandée avant écriture).
- Points ambigus : jamais corrigés, listés pour décision de François.

→ François tranche les points ambigus avant de passer à l'étape suivante.

### 4. Tests — subagent `qa` (manuel, invoqué par François)
Teste l'US dans l'application : scénarios de la US + cas limites non couverts. Écrit et exécute les tests avec le framework déjà en place dans le projet.
- Échec confirmé comme un vrai bug → ticket créé dans `specs/bugs/BUG-XX.md`, statut `Détecté`.
- Erreur dans le test lui-même → corrigée par qa, pas de ticket.

### 5. Triage — François
François relit chaque ticket `Détecté` et le passe à `Validé` ou `Rejeté` (avec commentaire dans les deux cas, pour garder une trace).

### 6. Correction — subagent `bugfix` (manuel, sur ticket `Validé` uniquement)
Corrige la cause racine, jamais un ticket non validé. Statut → `Corrigé` une fois le correctif appliqué.

### 7. Confirmation
Relancer `qa` pour vérifier que le bug est bien résolu.

### Conventions
- User stories : `specs/user-stories/US-XX.md`, un fichier par US, ID simple (`US-01`, `US-02`...).
- Bugs : `specs/bugs/BUG-XX.md`, même logique d'ID.
- Statuts bug : `Détecté` → `Validé`/`Rejeté` → `En correction` → `Corrigé` → `Vérifié`.
