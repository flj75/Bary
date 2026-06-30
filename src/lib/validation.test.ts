/**
 * Tests FORBIDDEN_NAME_CHARS — src/lib/validation.ts
 * US-19 edge case : caractères interdits dans le prénom profil
 * (même règle que US-18 / BUG-03 / BUG-04 côté ajout d'ami)
 *
 * On importe directement l'export de validation.ts pour s'assurer
 * que la regex est bien la source de vérité partagée entre pages.
 */

import { describe, it, expect } from 'vitest';
import { FORBIDDEN_NAME_CHARS } from './validation';

// ── Caractères interdits ──────────────────────────────────────────────────────

describe('FORBIDDEN_NAME_CHARS — caractères interdits (US-19 / BUG-03)', () => {
  const forbidden = [',', '|', '&', '=', '+', '#', '?', '%'];

  for (const char of forbidden) {
    it(`détecte le caractère interdit "${char}"`, () => {
      expect(FORBIDDEN_NAME_CHARS.test(char)).toBe(true);
    });

    it(`détecte "${char}" en milieu de prénom "A${char}B"`, () => {
      expect(FORBIDDEN_NAME_CHARS.test(`A${char}B`)).toBe(true);
    });
  }
});

// ── Caractères autorisés ──────────────────────────────────────────────────────

describe('FORBIDDEN_NAME_CHARS — caractères autorisés (US-19)', () => {
  const validNames = [
    'Alice',
    'François',
    'Jean-Pierre',
    "O'Brien",
    'Marie Claire',
    'Élodie',
    'Björk',
    'Ñoño',
    'a',
    'Anne-Sophie',
    "N'Dour",
    'Αλέξης',
  ];

  for (const name of validNames) {
    it(`"${name}" ne contient pas de caractère interdit`, () => {
      expect(FORBIDDEN_NAME_CHARS.test(name)).toBe(false);
    });
  }
});

// ── Regex ne consomme pas d'état (lastIndex) ──────────────────────────────────

describe('FORBIDDEN_NAME_CHARS — absence de flag /g (pas de stateful lastIndex)', () => {
  it('deux appels consécutifs sur le même input donnent le même résultat', () => {
    const input = 'Alice,Bob';
    expect(FORBIDDEN_NAME_CHARS.test(input)).toBe(true);
    expect(FORBIDDEN_NAME_CHARS.test(input)).toBe(true);
  });

  it('deux appels consécutifs sur un input valide donnent false les deux fois', () => {
    const input = 'Alice';
    expect(FORBIDDEN_NAME_CHARS.test(input)).toBe(false);
    expect(FORBIDDEN_NAME_CHARS.test(input)).toBe(false);
  });
});
