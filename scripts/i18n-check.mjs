// i18n-check.mjs: every English string the app passes to t(), tn(), tk() or
// plural(), against each src/i18n/<lang>.ts. Prints what a language is
// missing (or no longer uses). `node scripts/i18n-check.mjs --keys` prints the
// English keys as JSON, for translating.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'i18n') walk(p); }
    else if (/\.(ts|tsx)$/.test(f)) files.push(p);
  }
})(root);

// Strings that reach t() from the site's data rather than from a literal.
const DATA_KEYS = ['Global', 'Europe', 'Americas', 'Asia', 'Balkans', 'Europe Power Use', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Aurora'];

const STR = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
const one = new RegExp(String.raw`\b(?:t|tr|tk|tn)\(\s*(?:${STR})`, 'g');
const pl = new RegExp(String.raw`\bplural\([^,]+,\s*(?:${STR})\s*,\s*(?:${STR})`, 'g');
const unq = (s) => s.replace(/\\(.)/g, '$1');

const keys = new Map(); // key -> 'plain' | 'plural' (with its singular)
for (const f of files) {
  if (f.endsWith('lib/i18n.ts')) continue;
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(one)) { const k = unq(m[1] ?? m[2]); if (!keys.has(k)) keys.set(k, { kind: 'plain' }); }
  for (const m of src.matchAll(pl)) keys.set(unq(m[3] ?? m[4]), { kind: 'plural', one: unq(m[1] ?? m[2]) });
}
for (const k of DATA_KEYS) if (!keys.has(k)) keys.set(k, { kind: 'plain' });

if (process.argv.includes('--keys')) {
  console.log(JSON.stringify(Object.fromEntries([...keys].map(([k, v]) => [k, v.kind === 'plural' ? { one: v.one, other: k } : k])), null, 1));
  process.exit(0);
}

let bad = 0;
for (const f of readdirSync(join(root, 'i18n'))) {
  const src = readFileSync(join(root, 'i18n', f), 'utf8');
  const have = new Set([...src.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*:/gm)].map((m) => JSON.parse(m[1])));
  const missing = [...keys.keys()].filter((k) => !have.has(k));
  const unused = [...have].filter((k) => !keys.has(k));
  if (missing.length || unused.length) bad++;
  console.log(`${f}: ${have.size} strings, ${missing.length} missing, ${unused.length} unused`);
  for (const k of missing) console.log(`  missing: ${k}`);
  for (const k of unused) console.log(`  unused: ${k}`);
}
console.log(`${keys.size} English strings`);
process.exit(bad ? 1 : 0);
