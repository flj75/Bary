// Caractères interdits dans les prénoms — doivent survivre à l'encodage URL (BUG-03, BUG-04)
export const FORBIDDEN_NAME_CHARS = /[,|&=+#?%]/;
