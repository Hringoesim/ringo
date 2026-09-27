// Ringo status: the tier the account holds, how far to the next one, and the
// whole ladder in one row. It counts paid months and gives recognition and
// access only, never a discount, credit or free data (owner rulings 2026-08).
// The card wears the plum night sky of the welcome screen so it reads as the
// one hero surface on the page.
import { RC, RADIUS, BRAND, SHADOW_HERO, EASE_OUT, hexA } from '../../theme';
import type { Profile } from '../../api/light';
import { plural, tintFor } from './format';

type Loyalty = Profile['loyalty'];

export function StatusCard({ loyalty }: { loyalty: Loyalty }) {
  const { tier, paid_months: months } = loyalty;
  const tiers = loyalty.tiers && loyalty.tiers.length ? loyalty.tiers : [tier];
  const next = tier.next;
  const tint = tintFor(tier.id);
  const span = next ? next.min - tier.min : 1;
  const pct = next ? Math.max(0, Math.min(100, ((months - tier.min) / span) * 100)) : 100;
  const nextPerk = next ? tiers.find((x) => x.id === next.id)?.perk : null;
  const star = BRAND.starlight;
  const soft = hexA(star, 0.72);
  return (
    <section aria-label="Ringo status" style={{
      position: 'relative', overflow: 'hidden', borderRadius: RADIUS.card, padding: '18px 18px 16px', color: star, boxShadow: SHADOW_HERO,
      background: `radial-gradient(120% 90% at 100% 0%, ${hexA(tint, 0.42)} 0%, ${hexA(tint, 0)} 60%), radial-gradient(90% 80% at 0% 100%, ${hexA(BRAND.violet, 0.35)} 0%, ${hexA(BRAND.violet, 0)} 65%), ${BRAND.plum}`,
      border: `1px solid ${hexA(star, 0.08)}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: soft }}>Your status</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: soft }}>{plural(months, 'paid month', 'paid months')}</div>
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden style={{ width: 14, height: 14, borderRadius: RADIUS.pill, background: tint, boxShadow: `0 0 0 4px ${hexA(tint, 0.25)}, 0 0 18px ${hexA(tint, 0.8)}` }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.05 }}>{tier.name}</div>
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 14, lineHeight: 1.45, color: star }}>{tier.perk}</div>

      <div style={{ marginTop: 16 }}>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={next ? `Progress to ${next.name}` : 'Top of the ladder'}
          style={{ height: 8, borderRadius: RADIUS.pill, background: hexA(star, 0.14), overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(pct, next ? 3 : 100)}%`, height: '100%', borderRadius: RADIUS.pill, background: next ? `linear-gradient(90deg, ${tint}, ${tintFor(next.id)})` : RC.grad, transition: `width .8s ${EASE_OUT}` }} />
        </div>
        <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.45, color: soft }}>
          {next
            ? <><span style={{ color: star, fontWeight: 700 }}>{plural(next.to_go, 'more paid month', 'more paid months')}</span> to {next.name}{nextPerk ? `, which adds ${lowerFirst(nextPerk)}.` : '.'}</>
            : <span style={{ color: star, fontWeight: 700 }}>Top of the ladder. Thank you for travelling with us.</span>}
        </div>
      </div>

      <Ladder tiers={tiers} currentId={tier.id} months={months} />
    </section>
  );
}

function lowerFirst(s: string): string {
  // "Priority support: you go..." reads as one sentence after "which adds".
  const head = s.split(':')[0];
  return head.charAt(0).toLowerCase() + head.slice(1);
}

// The four rungs on one line: reached ones filled in their colour, the
// current one ringed, the rest hollow.
function Ladder({ tiers, currentId, months }: { tiers: Loyalty['tiers']; currentId: string; months: number }) {
  const star = BRAND.starlight;
  return (
    <ol aria-label="The status ladder" style={{ listStyle: 'none', margin: '18px 0 0', padding: '14px 0 0', borderTop: `1px solid ${hexA(star, 0.12)}`, display: 'grid', gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, position: 'relative' }}>
      {tiers.map((t, i) => {
        const reached = months >= t.min;
        const current = t.id === currentId;
        const tint = tintFor(t.id);
        return (
          <li key={t.id} aria-current={current ? 'step' : undefined} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {i > 0 && <span aria-hidden style={{ position: 'absolute', top: 7, right: '50%', width: '100%', height: 2, background: reached ? hexA(tint, 0.7) : hexA(star, 0.16) }} />}
            <span aria-hidden style={{ position: 'relative', zIndex: 1, width: 16, height: 16, borderRadius: RADIUS.pill, boxSizing: 'border-box', background: reached ? tint : BRAND.plum, border: reached ? 'none' : `2px solid ${hexA(star, 0.3)}`, boxShadow: current ? `0 0 0 4px ${hexA(tint, 0.3)}` : 'none' }} />
            <span style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: current ? 800 : 600, color: reached ? star : hexA(star, 0.6) }}>{t.name}</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 11, color: hexA(star, 0.55) }}>{t.min === 0 ? 'Start' : `${t.min} months`}</span>
          </li>
        );
      })}
    </ol>
  );
}
