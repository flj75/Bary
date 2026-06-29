## BUG-04 — Le caractère `%` dans un prénom casse le parsing du lien partagé

**US concernée** : `US-18`
**Sévérité** : Majeur
**Statut** : Corrigé

### Comportement observé

Un prénom contenant le caractère `%` suivi d'un caractère non-hexadécimal (ex : `"Alice%Bob"`, `"50%"`) passait la validation `FORBIDDEN_NAME_CHARS` (`/[,|&=+#?]/`) sans déclencher d'erreur.

Côté récepteur (`result/page.tsx`), le double `decodeURIComponent` sur la partie nom lève une `URIError: URI malformed` → redirection `/?error=invalid_link`.

Cas `%` suivi de 2 hex valides (ex : `%20`) : pas d'exception mais corruption silencieuse du nom après double `decodeURIComponent`.

### Comportement attendu

Le caractère `%` doit être interdit à la saisie dans la modale, au même titre que `, | & = + # ?`.

### Étapes de reproduction

1. Saisir le prénom `Alice%Bob` dans la modale — aucune erreur n'est affichée
2. Valider, calculer, partager → URL avec `g=Alice%25Bob|...`
3. Ouvrir le lien → `decodeURIComponent("Alice%Bob")` → `URIError` → "Lien invalide"

### Correction appliquée

Ajout de `%` dans la regex `FORBIDDEN_NAME_CHARS` dans `src/app/group/page.tsx` :

```ts
const FORBIDDEN_NAME_CHARS = /[,|&=+#?%]/;
```

### Validation
- Validé par : François Le Jacques
- Commentaire : Correction appliquée dans la foulée de BUG-03
