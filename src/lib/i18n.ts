// i18n.ts: the app's languages (owner 2026-10-28: "support the most common
// languages on the next update").
//
// Strings are keyed by their English copy, as on ringoesim.com
// (src/lib/ui/<lang>.js there): t('Buy now') returns the phone's language when
// src/i18n/<lang>.ts has it, the English otherwise, so a string nobody has
// translated yet still reads. {name} placeholders are filled from `vars`.
//
// The language is the one iOS picked for the app (navigator.languages in the
// WKWebView follows the app's localizations and the per-app language in
// Settings), unless the buyer chose one in the app (Help > Language).
// Arabic and Hebrew turn the whole document right to left.
import { createElement, Fragment, useSyncExternalStore, type ReactNode } from 'react';
import es from '../i18n/es';
import fr from '../i18n/fr';
import de from '../i18n/de';
import it from '../i18n/it';
import pt from '../i18n/pt';
import nl from '../i18n/nl';
import ar from '../i18n/ar';
import he from '../i18n/he';
import ja from '../i18n/ja';
import ko from '../i18n/ko';
import zh from '../i18n/zh';
import tr from '../i18n/tr';
import ru from '../i18n/ru';

/** One translated string, or its plural forms (Intl.PluralRules categories). */
export type Entry = string | Partial<Record<Intl.LDMLPluralRule, string>>;
export type Catalog = Record<string, Entry>;

export const LANGS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'he', name: 'עברית' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '简体中文' },
] as const;
export type Lang = (typeof LANGS)[number]['code'];

const CATALOGS: Record<Lang, Catalog> = { en: {}, es, fr, de, it, pt, nl, ar, he, ja, ko, zh, tr, ru };
const RTL = new Set<Lang>(['ar', 'he']);
// Intl locale per language: zh is Simplified Chinese, pt follows the phone's
// region (Brazil or Portugal) for dates and money, as does every other one.
const STORE_KEY = 'ringo_lang';

function supported(tag: string | undefined | null): Lang | null {
  if (!tag) return null;
  const base = tag.toLowerCase().split(/[-_]/)[0];
  // iw is the old code for Hebrew, still sent by some systems.
  const code = base === 'iw' ? 'he' : base;
  return (LANGS.some((l) => l.code === code) ? code : null) as Lang | null;
}

function chosen(): Lang | null {
  try { return supported(localStorage.getItem(STORE_KEY)); } catch { return null; }
}

function deviceTags(): string[] {
  if (typeof navigator === 'undefined') return [];
  return [...(navigator.languages || []), navigator.language].filter(Boolean);
}

function detect(): Lang {
  // ?lang=ar (or VITE_LANG at build time) forces a language, for screenshots.
  const forced = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lang') : null;
  const env = import.meta.env.VITE_LANG as string | undefined;
  const fromDevice = deviceTags().map(supported).find(Boolean) ?? null;
  return supported(forced) ?? supported(env) ?? chosen() ?? fromDevice ?? 'en';
}

let lang: Lang = detect();
let locale = localeFor(lang);
const listeners = new Set<() => void>();

// The Intl locale: the phone's own tag when it is this language (es-MX keeps
// Mexican dates), else the bare code.
// Arabic keeps Latin digits, so prices, GB and counts read the same as the
// "eSIM" and "GB" around them.
function localeFor(l: Lang): string {
  if (l === 'zh') return 'zh-Hans';
  const tag = deviceTags().find((t) => supported(t) === l) || l;
  return l === 'ar' && !/-u-/.test(tag) ? `${tag}-u-nu-latn` : tag;
}

function apply() {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.lang = lang === 'zh' ? 'zh-Hans' : lang;
  el.dir = RTL.has(lang) ? 'rtl' : 'ltr';
}
apply();

export const i18n = {
  get: (): Lang => lang,
  /** The buyer's own pick, or null when the app follows the phone. */
  chosen,
  /** 'auto' goes back to following the phone's language. */
  set(next: Lang | 'auto') {
    try {
      if (next === 'auto') localStorage.removeItem(STORE_KEY);
      else localStorage.setItem(STORE_KEY, next);
    } catch { /* ignore */ }
    lang = next === 'auto' ? (deviceTags().map(supported).find(Boolean) ?? 'en') : next;
    locale = localeFor(lang);
    apply();
    listeners.forEach((f) => f());
  },
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; },
};

/** Re-renders on a language change; the root keys the app on it. */
export function useLang(): Lang { return useSyncExternalStore(i18n.subscribe, i18n.get, i18n.get); }

export const isRtl = (): boolean => RTL.has(lang);
/** The Intl locale for dates, numbers and money in the current language. */
export const currentLocale = (): string => locale;

type Vars = Record<string, string | number | null | undefined>;

function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] == null ? m : typeof vars[k] === 'number' ? fmtNumber(vars[k] as number) : String(vars[k])));
}

/** The current language's copy of an English string. */
export function t(en: string, vars?: Vars): string {
  const e = CATALOGS[lang][en];
  const s = typeof e === 'string' ? e : e ? (e.other ?? en) : en;
  return fill(s, vars);
}

/**
 * A counted string. The catalog keys it by the English plural (`other`) and
 * may give every form the language needs (one, few, many, other).
 * plural(3, '{n} country', '{n} countries')
 */
export function plural(n: number, one: string, other: string, vars?: Vars): string {
  const all = { n, ...vars };
  if (lang === 'en') return fill(n === 1 ? one : other, all);
  const e = CATALOGS[lang][other];
  if (!e) return fill(n === 1 ? one : other, all);
  if (typeof e === 'string') return fill(e, all);
  const cat = new Intl.PluralRules(locale).select(n);
  return fill(e[cat] ?? e.other ?? other, all);
}

export function fmtNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  try { return new Intl.NumberFormat(locale, opts).format(n); } catch { return String(n); }
}

export function fmtMoney(n: number, currency: string, opts?: Intl.NumberFormatOptions): string {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency, ...opts }).format(n); } catch { return `${currency} ${n.toFixed(2)}`; }
}

export function fmtDate(d: Date | string | number, opts: Intl.DateTimeFormatOptions): string {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  try { return date.toLocaleString(locale, opts); } catch { return date.toISOString().slice(0, 10); }
}

/** A list joined the language's way: "France, Italy and Spain". */
export function fmtList(items: string[], type: 'conjunction' | 'disjunction' = 'conjunction'): string {
  try {
    const LF = (Intl as unknown as { ListFormat: new (l: string, o: object) => { format(x: string[]): string } }).ListFormat;
    return new LF(locale, { style: 'long', type }).format(items);
  } catch { return items.join(', '); }
}

/** A country or region name in the current language, from its ISO code. */
export function regionName(iso2: string, fallback: string): string {
  if (lang === 'en' || !iso2 || iso2.length !== 2) return fallback;
  try { return new Intl.DisplayNames([locale], { type: 'region' }).of(iso2.toUpperCase()) || fallback; } catch { return fallback; }
}

/** Marks an English string kept in a module-level table for the catalogs;
 * the screen translates it with t() when it renders. */
export const tk = (en: string): string => en;

/**
 * t() for a sentence with a styled part: the {placeholders} are filled with
 * nodes, so the translation can move them where its grammar wants them.
 * tn('We sent a code to {email}.', { email: <b>{email}</b> })
 */
export function tn(en: string, nodes: Record<string, ReactNode>): ReactNode {
  const e = CATALOGS[lang][en];
  const s = typeof e === 'string' ? e : e ? (e.other ?? en) : en;
  return s.split(/(\{\w+\})/).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    return createElement(Fragment, { key: i }, m && m[1] in nodes ? nodes[m[1]] : part);
  });
}

/**
 * A destination's name in the current language. The catalogue sends English
 * labels and a flag emoji: a country's name comes from Intl by the flag's ISO
 * code, a region's ("Europe", "Global") from the catalogs.
 */
export function placeName(label: string, flag?: string | null): string {
  if (lang === 'en' || !label) return label;
  const cps = [...String(flag || '')].map((c) => (c.codePointAt(0) ?? 0) - 0x1f1e6);
  if (cps.length === 2 && cps.every((n) => n >= 0 && n < 26)) return regionName(String.fromCharCode(65 + cps[0], 65 + cps[1]), label);
  return t(label);
}
