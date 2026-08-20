// LandingScreen — the entry screen. Vivid warm gradient sky, the Ringo logo, a
// live flight globe, and the two pill CTAs: "Create account" (opens sign-up with
// Apple / Google / email) and "Log in". Fully adaptive.
import { useEffect, useState, useLayoutEffect, useRef } from 'react';
import { SaturnWorld } from '../components/SaturnWorld';
import { RingoButton } from '../components/Button';
import { LOGO_SRC } from '../assets';
import { RC, EASE_OUT } from '../theme';
import { hapticSelection } from '../lib/haptics';
import {
  BILLING, DEFAULT_PERIOD, periodMonthlyPrice, periodDataGB, billingNote, fmtMoney,
  type BillingPeriod,
} from '../data/plans';

export function LandingScreen({
  onExplore, onLogin, onStart,
}: { onExplore: () => void; onLogin?: () => void; onStart?: () => void }) {
  // The price is on the front page so nobody has to sign up to find out what
  // Ringo costs — but the first STEP is an account, then plan, pay, install,
  // which is the order every eSIM platform uses. Twelve months is pre-selected
  // because it carries the bigger allowance and the better margin.
  const [period, setPeriod] = useState<BillingPeriod>(DEFAULT_PERIOD);
  const [globe, setGlobe] = useState(300);
  const [compact, setCompact] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const start = () => {
    if (onStart) onStart();
    else explore();
  };
  // Explore plays a visible launch pop, THEN navigates — a fast tap still
  // gets its moment of feedback.
  const [launching, setLaunching] = useState(false);
  const explore = () => {
    if (launching) return;
    setLaunching(true);
    setTimeout(onExplore, 210);
  };
  // The globe took a fixed share of the screen height, so on a 812pt phone the
  // hero ran 23px over its box and clipped the last line of the subhead. Rather
  // than tune a fraction per device, measure: if the hero overflows, shrink the
  // globe by exactly the overflow. Converges in one or two passes and is
  // correct on every screen size.
  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const FLOOR = 150;
    const fit = () => {
      const over = el.scrollHeight - el.clientHeight;
      if (over <= 1) return;
      setGlobe((g) => {
        const next = Math.max(FLOOR, g - over - 4);
        // Shrinking the globe alone cannot always win — the offer card and the
        // subscription disclosure take real space. Once the globe is at its
        // floor and the hero STILL clips, drop to compact chrome (smaller logo,
        // heading and gaps) rather than cut a sentence in half.
        if (next === FLOOR && g === FLOOR) setCompact(true);
        return next;
      });
    };
    fit();
    // The hero also shrinks when the block BELOW it grows (the offer card, the
    // subscription disclosure). Watching the element catches that too — the
    // earlier version only re-ran when the globe changed, so anything added
    // underneath silently clipped the subhead again.
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [globe, compact]);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // The FULL circle always fits, on every eSIM iPhone: never wider than
      // the screen (with margin), and on short bodies (SE 667pt) it takes a
      // smaller height share so logo + headline + CTAs still fit beneath it.
      // The offer block now lives under the headline and needs roughly 200pt,
      // so the globe takes a smaller share than it did when this screen was
      // just a poster with one button.
      const short = h < 800;
      setCompact(short);
      setGlobe(Math.max(180, Math.min(w * 0.78, h * (short ? 0.28 : 0.34), 380)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        // Poster look, in ringoesim.com's register: the site leads with orange
        // into amber and keeps pink/purple as accents, so this sky is a warm
        // sunset falling into ember rather than the pink→purple it was.
        background: [
          'radial-gradient(120% 70% at 72% 22%, rgba(255,196,110,0.62) 0%, rgba(255,196,110,0) 55%)',
          'radial-gradient(120% 80% at 14% 92%, rgba(183,54,226,0.20) 0%, rgba(183,54,226,0) 62%)',
          // Warm sunset, the way ringoesim.com runs it: orange into pink into
          // purple. The old stops fell away into browns (#8C2E18, #571C10),
          // which is what made the lower half look muddy and dated.
          'linear-gradient(180deg, #FFE3B8 0%, #FFB877 17%, #FF8A5B 35%, #F2585F 55%, #D33C8E 74%, #9B57DC 91%, #7A44C4 100%)',
        ].join(', '),
      }}
    >
      <div
        ref={heroRef}
        style={{
          // minHeight 0 + hidden overflow: if space ever runs short the column
          // clips gracefully — the front page itself NEVER scrolls.
          flex: 1, minHeight: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: compact ? '16px 24px 0' : '24px 24px 0', textAlign: 'center',
        }}
      >
        {/* The REAL Ringo logo (orange→pink gradient asset, same as the site
            header) on the cream sky — exactly the website look. */}
        <div style={{ marginTop: 0, marginBottom: compact ? 2 : 6, filter: 'drop-shadow(0 4px 14px rgba(120,30,10,0.16))' }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: compact ? 58 : 76, width: 'auto', display: 'block' }} />
        </div>

        {/* First impression: the planet springs in once, then floats forever
            over a soft grounding shadow. */}
        <div style={{ marginTop: compact ? 8 : 14, position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', left: '50%', bottom: -14, transform: 'translateX(-50%)',
              width: globe * 0.62, height: 26, borderRadius: '50%',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(88,24,72,0.30) 0%, rgba(88,24,72,0) 70%)',
              animation: 'ringoGlobeFloat 6s ease-in-out infinite reverse',
            }}
          />
          <div style={{ animation: 'ringoGlobeIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div style={{ animation: 'ringoGlobeFloat 6s ease-in-out infinite' }}>
              <SaturnWorld size={globe} />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: compact ? 2 : 6, fontFamily: 'var(--font-display)', fontSize: compact ? 31 : 40, fontWeight: 800,
            letterSpacing: -1.4, lineHeight: 1.02, textWrap: 'balance',
            color: '#FFFFFF', textShadow: '0 3px 20px rgba(120,30,10,0.30)',
          }}
        >
          One plan,<br />every country.
        </div>
        <div
          style={{
            marginTop: compact ? 6 : 12, fontFamily: 'var(--font)', fontSize: compact ? 14 : 15.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.94)', textShadow: '0 1px 8px rgba(120,30,10,0.22)',
            lineHeight: 1.5, maxWidth: 310,
          }}
        >
          One allowance, 180+ countries, no roaming fees.
        </div>
      </div>

      <div style={{ padding: compact ? '10px 24px 18px' : '14px 24px 26px', display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
        {/* The offer, on the front page. One price, two terms, buy. */}
        <div
          style={{
            borderRadius: 20, padding: compact ? '12px 14px' : '14px 16px',
            background: 'rgba(52,24,86,0.34)', border: '1px solid rgba(255,255,255,0.20)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: '#FFFFFF' }}>
            <span style={{ fontFamily: 'var(--font)', fontSize: compact ? 30 : 34, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.12 }}>
              {fmtMoney(periodMonthlyPrice(period))}
            </span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 500, opacity: 0.9 }}>/ month</span>
          </div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 12.5, color: 'rgba(255,255,255,0.82)' }}>
            {periodDataGB(period)} GB a month · {billingNote(period)}
          </div>

          <div
            role="tablist"
            aria-label="Billing term"
            style={{
              marginTop: 11, display: 'flex', position: 'relative',
              background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 999, padding: 4,
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute', top: 4, bottom: 4, left: 4, width: 'calc(50% - 4px)',
                background: '#FFFFFF', borderRadius: 999, boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                transform: period === DEFAULT_PERIOD ? 'translateX(0)' : 'translateX(100%)',
                transition: `transform 0.28s ${EASE_OUT}`,
              }}
            />
            {(Object.keys(BILLING) as BillingPeriod[]).map((k) => {
              const on = k === period;
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={on}
                  onClick={() => { hapticSelection(); setPeriod(k); }}
                  style={{
                    position: 'relative', flex: 1, minHeight: 40, padding: '8px 6px',
                    background: 'transparent', border: 'none', borderRadius: 999, cursor: 'pointer',
                    fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                    color: on ? RC.ink : 'rgba(255,255,255,0.66)', transition: 'color 0.2s ease',
                  }}
                >
                  {BILLING[k].label} · {periodDataGB(k)} GB
                </button>
              );
            })}
          </div>

          {/* The anchor, said out loud. Both terms cost the SAME per month, so
              the twelve-month one is simply twice the data for the same money.
              Leaving a customer to work that out themselves is the difference
              between them picking annual and not — and annual is the 78%-margin
              customer. Never framed as a discount: the price does not move. */}
          <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.80)', textAlign: 'center' }}>
            Same {fmtMoney(periodMonthlyPrice(period))} a month either way · 12 months doubles your data
          </div>
        </div>

        <div style={{ animation: launching ? 'ringoLaunchPop 0.24s cubic-bezier(0.34, 1.56, 0.64, 1) both' : 'none' }}>
          <RingoButton onClick={start}>Get started</RingoButton>
        </div>
        <button
          onClick={explore}
          className="press"
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 0',
            fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600,
            color: 'rgba(255,255,255,0.80)', textShadow: '0 1px 6px rgba(120,30,10,0.22)',
          }}
        >
          Look around first
        </button>
        {/* Returning users need a way back in after sign-out / reinstall. */}
        {onLogin && (
          <button
            onClick={onLogin}
            className="press"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0',
              fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600,
              color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 6px rgba(120,30,10,0.22)',
            }}
          >
            Already have an account? <span style={{ color: '#FFFFFF', fontWeight: 800 }}>Log in</span>
          </button>
        )}
      </div>
    </div>
  );
}
