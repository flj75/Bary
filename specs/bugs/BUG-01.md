## BUG-01 — Liens partagés non parsables — split(':') coupe mal les stationIds IDFM

**US concernée** : `US-10` Scénario 2
**Sévérité** : Moyenne — le partage par lien est une feature Should, pas Must. L'app reste pleinement utilisable sans cette feature. À corriger avant le lancement public mais non bloquant pour les tests utilisateurs internes.
**Occurrence** : Haute — 100 % des liens partagés touchés
**Statut** : Corrigé

### Comportement observé

`URLSearchParams.get('g')` décode automatiquement les query params avant de retourner la valeur. Le stationId `IDFM:463079` encodé en `IDFM%3A463079` dans l'URL est rendu décodé (`IDFM:463079`) par l'API. Un `split(':')` naïf produit alors 3 parties au lieu de 2 — le stationId est mal reconstruit (`"IDFM"` au lieu de `"IDFM:463079"` → station introuvable).

### Comportement attendu

Le lien partagé doit être décodable côté destinataire (US-10 Scénario 2 : "il voit directement l'écran 4 avec le résultat pré-calculé"). Le nom du participant et le stationId doivent être séparables de façon non ambiguë.

### Étapes de reproduction

1. Ouvrir l'écran 4 avec Alice (Châtelet, `IDFM:463079`) et Bob (Nation)
2. Taper "Partager" → URL copiée contient `g=Alice:IDFM%3A463079,...`
3. Ouvrir le lien dans un autre onglet
4. `URLSearchParams.get('g')` retourne `Alice:IDFM:463079`
5. `entry.split(':')` → `["Alice", "IDFM", "463079"]` (3 parties)
6. Le stationId reconstruit est `"IDFM"` → station introuvable

### Correction recommandée

Utiliser `|` comme séparateur nom/stationId dans le paramètre `g` :

```ts
// buildShareUrl — src/app/result/page.tsx
.map(p => `${encodeURIComponent(p.name)}|${encodeURIComponent(p.station.id)}`)

// parsing côté récepteur
const [name, stationId] = entry.split('|').map(decodeURIComponent);
```

`|` n'apparaît pas dans les stationIds IDFM et n'est pas affecté par le décodage automatique de `URLSearchParams`.

### Notes techniques (QA)

Test documentant le bug : `src/lib/algorithm/__tests__/integration.test.ts`
→ `"BUG-01 : URLSearchParams.get decode %3A → le split naïf sur ':' casse avec stationId IDFM:xxx"`

Le paramètre `s` (stationId résultat) n'est pas affecté — aucun split nécessaire sur ce paramètre.

### Note triage

Corrigé dans US-18 — `buildShareUrl` utilise désormais `|` comme séparateur, et la page `/result` reconstruit le résultat côté client à partir des params URL.

### Validation
- Validé par : François Le Jacques
- Commentaire :
