// langReturn.ts — the sessionStorage key that remembers which screen asked
// for a language change, so a reload lands back on it. Lives apart from
// HelpScreen so App.tsx can read it without loading the Help chunk.
export const LANG_RETURN_KEY = 'ringo_lang_return';
