## BUG-02 — FriendStore.write() ne catch pas QuotaExceededError

**US concernée** : `US-12`
**Sévérité** : Mineure — non bloquant MVP, l'app reste utilisable
**Occurrence** : Faible — localStorage plein, rare en pratique
**Statut** : Corrigé

### Comportement observé

`FriendStore.write()` appelle `localStorage.setItem()` sans `try/catch`. Si le stockage localStorage est plein, `setItem()` lève une `QuotaExceededError` qui se propage non catchée jusqu'à l'appelant. L'utilisateur ne voit aucun message d'erreur — l'opération échoue silencieusement et la donnée n'est pas persistée.

### Comportement attendu

US-12 spécifie explicitement : *"Stockage localStorage plein (rare mais possible) : afficher un message d'erreur explicite."* L'application doit intercepter l'erreur et afficher un retour à l'utilisateur.

### Étapes de reproduction

1. Saturer le localStorage manuellement (DevTools → Application → Local Storage)
2. Aller sur l'Écran 5 ou utiliser "+ Nouvelle personne" avec "Sauvegarder dans mes amis" coché
3. Valider la modale : `FriendStore.add()` → `write()` → `localStorage.setItem()` lève `QuotaExceededError`
4. Aucun message d'erreur affiché — la donnée n'est pas sauvegardée

### Correction recommandée

Entourer `localStorage.setItem()` d'un `try/catch` dans `FriendStore.write()`, et afficher un toast *"Impossible de sauvegarder — stockage plein"* via un mécanisme à définir (event bus, callback ou state remonté par le composant appelant).

```ts
function write(friends: Friend[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(friends));
  } catch {
    throw new Error('storage_full');
  }
}
```

### Notes techniques (QA)

Test documentant le bug : `src/lib/friends/__tests__/store.test.ts`
→ `"BUG-02 : FriendStore.add propage une erreur non catchée si localStorage est plein (QuotaExceededError)"`

Code concerné : `src/lib/friends/store.ts`, fonction `write()` — aucun `try/catch` sur `setItem()`.

### Validation
- Validé par : François Le Jacques
- Commentaire :

### Correctif appliqué

**Cause racine** : `FriendStore.write()` appelait `localStorage.setItem()` sans aucune protection. En cas de quota dépassé, la `DOMException` remontait brute jusqu'à l'appelant, sans être transformée ni affichée.

**Correctif en trois couches** :

1. `src/lib/friends/store.ts` — `write()` entoure `setItem()` d'un `try/catch` et relance une `Error('storage_full')` typée. Les appelants (`add`, `update`, `remove`) laissent cette erreur se propager naturellement — c'est le comportement attendu par les composants.

2. `src/app/friends/page.tsx` — `handleAdd`, `handleEdit`, `handleDelete` ont chacun un `try/catch` local. En cas d'erreur, la modale reste ouverte (l'opération a échoué) et un toast s'affiche 2 secondes via un state `toastMsg`.

3. `src/app/group/page.tsx` — `handleAddPerson` attrape l'erreur de `FriendStore.add` dans le branch `if (save)`. La personne est tout de même ajoutée au groupe en session (le `dispatch` s'exécute toujours) — seule la persistance dans le carnet a échoué. Le toast informe l'utilisateur.

**Style du toast** : copie exacte du toast "Lien copié !" de `result/page.tsx` (`bg-zinc-900 text-white rounded-full` etc.), positionné en `fixed bottom-32` pour rester visible sur des pages scrollables.

**Tests** : le test BUG-02 existant (`expect(() => FriendStore.add(...)).toThrow()`) passe toujours — `write()` lève bien une erreur lorsque `setItem` échoue.
