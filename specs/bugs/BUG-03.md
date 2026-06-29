## BUG-03 — Nom de participant contenant "," casse le parsing du lien partagé

**US concernée** : `US-18`
**Sévérité** : Mineur — ne touche que les noms contenant une virgule, cas rare en pratique. Le lien invalide déclenche l'écran d'erreur et la redirection vers la home (comportement de fallback correct).
**Statut** : Corrigé

### Comportement observé

`buildShareUrl` encode la virgule dans un nom via `encodeURIComponent` → `%2C`.
Mais `URLSearchParams.get('g')` décode automatiquement `%2C` → `,` avant de retourner la valeur.
Le parsing (côté récepteur) fait ensuite `g.split(',')` pour séparer les entrées participants.
Ce split interprète alors le `,` décodé du nom comme un séparateur d'entrées, produisant deux fragments au lieu d'un.
Le premier fragment (`"Alice"`) n'a pas de `|` → `indexOf('|')` retourne `-1` → l'erreur `no_separator` est levée → l'utilisateur est renvoyé vers `/?error=invalid_link`.

### Comportement attendu

Un nom contenant `,` ne doit pas pouvoir être saisi — les caractères problématiques pour l'encodage URL sont interdits à la saisie.

### Étapes de reproduction

1. Ajouter un participant avec le nom `"Alice,Bob"` (ou tout prénom avec virgule)
2. Accéder à l'écran résultat et taper "Partager" — l'URL générée contient `g=Alice%2CBob|IDFM%3A463079`
3. Ouvrir le lien dans un autre onglet
4. `URLSearchParams.get('g')` retourne `Alice,Bob|IDFM:463079`
5. `g.split(',')` → `["Alice", "Bob|IDFM:463079"]`
6. Première entrée `"Alice"` : `indexOf('|')` → `-1` → exception → redirection `/?error=invalid_link`

### Correction retenue

**Validation à la saisie dans la modale "+ Nouvelle personne"** — whitelist de caractères autorisés dans le champ Prénom.

- **Autorisé** : lettres (y compris accents et caractères internationaux), espaces, tirets (`-`), apostrophes (`'`)
- **Refusé** : `, | & = + # ? %` et tout autre caractère spécial problématique pour l'encodage URL
- **Regex** : `/[,|&=+#?%]/` — si cette regex matche, le prénom est invalide (BUG-04 a étendu la liste initiale avec `%`)
- **Message d'erreur inline** sous le champ : *"Les caractères spéciaux (, | & = + # ?) ne sont pas autorisés"*
- **Bouton "Ajouter"** reste désactivé tant que le prénom contient un caractère interdit

Cette approche est préférable au double-encodage : elle bloque le problème à la source (saisie utilisateur) plutôt que de complexifier `buildShareUrl` et le parsing côté récepteur.

### Notes techniques (QA)

Test documentant le bug : `src/app/result/__tests__/shareUrl.test.ts`
→ `"BUG-03 : nom contenant ',' casse le parsing (virgule non protégée)"`

### Validation
- Validé par : François Le Jacques
- Commentaire : Correction retenue — validation à la saisie (whitelist) plutôt que double-encodage
