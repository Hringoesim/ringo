// LandingScreen: the welcome screen, shown until the person signs in or
// chooses to browse first. The Ringo logo, the flight globe, and the ways
// in: Sign in with Apple, Google, or an email code (owner 2026-09-18: the
// sign-in options must be the first thing seen). Signing in and signing up
// are the same tap: the first sign-in creates the account. Browsing without
// an account stays one tap away.
//
// The hero (owner 2026-09-26: "the UI does not morph well enough around the
// logo", so the white pill is gone). The gradient wordmark is only readable
// on a deep ground: its pink end reaches about 3:1 even on pure white, so no
// light surface can carry it at 4.5:1. Three builds, one shipped:
//   a  the sky inverted: deep plum where the logo sits, warming to the sunset
//      behind the globe and the sign-in block (shipped)
//   b  a dark plum band over the top third, a warm glow under the logo, the
//      globe sitting across the band's lower edge
//   c  the logo, globe and headline on a cream panel framed by the sunset
// `?hero=a|b|c` picks one so the owner can compare. The sky's colour stops
// are anchored to the measured logo and globe, so the dark sits behind the
// logo on every screen height, compact included.
import { useEffect, useState, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { SaturnWorld } from '../components/SaturnWorld';
import { AuthButtons } from '../components/AuthButtons';
import { TextLink } from '../components/ui';
import { LOGO_SRC } from '../assets';
import { COLUMN_MAX } from '../theme';

type Hero = 'a' | 'b' | 'c';
const SHIPPED: Hero = 'a';

function heroVariant(): Hero {
  try {
    const v = new URLSearchParams(window.location.search).get('hero');
    return v === 'a' || v === 'b' || v === 'c' ? v : SHIPPED;
  } catch {
    return SHIPPED;
  }
}

// Brand plum, the site's --ink, and the steps from it into the sunset.
const PLUM = '#1A0F2E';
const SUNSET = 'linear-gradient(180deg, #FFE3B8 0%, #FFB877 17%, #FF8A5B 35%, #F2585F 55%, #D33C8E 74%, #9B57DC 91%, #7A44C4 100%)';

interface Anchors { logo: number; globe: number; height: number }

// Colour stops must never run backwards, whatever the measured anchors.
function stops(list: Array<[string, number]>): string {
  let last = 0;
  return list.map(([c, y]) => { last = Math.max(last, Math.round(y)); return `${c} ${last}px`; }).join(', ');
}

function background(hero: Hero, a: Anchors, globe: number): string {
  if (hero === 'c') {
    return SUNSET;
  }
  if (hero === 'b') {
    // Below the band: the sunset from its warm middle down to violet.
    return [
      'radial-gradient(120% 80% at 14% 92%, rgba(183,54,226,0.20) 0%, rgba(183,54,226,0) 62%)',
      `linear-gradient(180deg, ${stops([
        ['#FF7A55', a.globe - 40], ['#F2585F', a.globe + globe * 0.55], ['#D33C8E', a.globe + globe * 0.55 + (a.height - a.globe) * 0.35],
        ['#9B57DC', a.height * 0.94], ['#7A44C4', a.height],
      ])})`,
    ].join(', ');
  }
  // a: night at the top, dawn behind the globe, sunset under the sign-in block.
  const g = a.globe;
  return [
    `radial-gradient(${Math.round(globe * 1.2)}px ${Math.round(globe * 0.62)}px at 50% ${Math.round(g + globe * 0.18)}px, rgba(255,128,92,0.34) 0%, rgba(255,128,92,0) 100%)`,
    `linear-gradient(180deg, ${stops([
      [PLUM, 0], ['#211236', a.logo * 0.7], ['#2B1545', a.logo + 10],
      ['#4E1E66', g - globe * 0.25], ['#8E2C80', g + globe * 0.3], ['#D23F7C', g + globe * 0.5 + 70],
      ['#F2585F', g + globe * 0.5 + 150], ['#FF7A52', a.height * 0.86], ['#FF8756', a.height],
    ])})`,
  ].join(', ');
}

export function LandingScreen({
  onExplore, onSignedIn, onEmail,
}: { onExplore: () => void; onSignedIn: () => void; onEmail: () => void }) {
  const [hero] = useState<Hero>(heroVariant);
  const [globe, setGlobe] = useState(220);
  const [compact, setCompact] = useState(false);
  const [anchors, setAnchors] = useState<Anchors>({ logo: 160, globe: 300, height: 932 });
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);

  // If the hero overflows its box, shrink the globe by the overflow; once
  // the globe is at its floor, drop to compact chrome rather than clip text.
  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const FLOOR = 120;
    const fit = () => {
      // The hero hugs its bottom edge, so an overflow runs off the top, where
      // scrollHeight does not count it: measure the logo against the padding too.
      const logo = logoRef.current?.getBoundingClientRect().top;
      const floor = el.getBoundingClientRect().top + parseFloat(getComputedStyle(el).paddingTop || '0');
      const over = Math.max(el.scrollHeight - el.clientHeight, logo === undefined ? 0 : Math.ceil(floor - logo));
      if (over <= 1) return;
      setGlobe((g) => {
        const next = Math.max(FLOOR, g - over - 4);
        if (next === FLOOR && g === FLOOR) setCompact(true);
        return next;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [globe, compact]);

  // Where the logo and the globe landed, so the sky bends around them.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const top = root.getBoundingClientRect().top;
      const logo = logoRef.current?.getBoundingClientRect();
      const g = globeRef.current?.getBoundingClientRect();
      if (!logo || !g) return;
      const next = { logo: logo.bottom - top, globe: g.top + g.height / 2 - top, height: root.clientHeight };
      setAnchors((p) => (Math.abs(p.logo - next.logo) < 1 && Math.abs(p.globe - next.globe) < 1 && p.height === next.height ? p : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [globe, compact]);

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const short = h < 800;
      setCompact(short);
      // Owner 2026-09-26: a bigger globe. About 350pt on a 430x932 phone and
      // 300pt on 375x812, leaving room for the native sign-in block (three
      // 52pt buttons plus "Browse plans first"); the overflow check above
      // trims it further if the text still does not fit.
      setGlobe(Math.max(140, Math.min(w * 0.82, h * (short ? 0.25 : 0.378), 360)));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  const onCream = hero === 'c';
  const shade = onCream ? 'none' : '0 1px 8px rgba(40,10,50,0.28)';
  const heroText: CSSProperties = onCream
    ? { color: PLUM }
    : { color: '#FFFFFF', textShadow: '0 3px 20px rgba(40,10,50,0.34)' };

  return (
    <div
      ref={rootRef}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        background: background(hero, anchors, globe),
      }}
    >
      {hero === 'b' && (
        <>
          {/* The plum band: solid under the logo, fading out across the globe's middle. */}
          <div
            aria-hidden
            style={{
              position: 'absolute', left: 0, right: 0, top: 0, height: Math.round(anchors.globe + 24),
              background: `linear-gradient(180deg, ${PLUM} 0%, #231236 calc(100% - 96px), rgba(35,18,54,0) 100%)`,
            }}
          />
          {/* A soft warm glow beneath the wordmark. */}
          <div
            aria-hidden
            style={{
              position: 'absolute', left: '50%', top: Math.round(anchors.logo - 6), transform: 'translateX(-50%)',
              width: 280, height: 90, borderRadius: '50%',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,122,82,0.42) 0%, rgba(255,66,161,0.16) 45%, rgba(255,66,161,0) 100%)',
            }}
          />
        </>
      )}

      <div
        ref={heroRef}
        style={{
          // Sized by its content first; only the spare height is shared with
          // the spacer under the sign-in block, so the globe never shrinks to
          // make room for empty sky.
          flex: '1 1 auto', minHeight: 0, overflow: 'hidden', position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          // Hug the sign-in block: the hero's spare room goes to the sky above
          // it, not to a gap between the tagline and the buttons. Short
          // (compact) screens keep the original centring.
          justifyContent: compact ? 'center' : 'flex-end', padding: compact ? '12px 24px 0' : 'max(20px, calc(env(safe-area-inset-top, 0px) + 6px)) 24px 16px', textAlign: 'center',
          ...(onCream ? {
            margin: 'max(12px, calc(env(safe-area-inset-top, 0px) + 4px)) 12px 0', borderRadius: 28,
            background: 'linear-gradient(180deg, #FFFAF7 0%, #FEF3EE 100%)',
            boxShadow: '0 18px 40px -22px rgba(88,24,72,0.45)',
            padding: compact ? '12px 20px 14px' : '20px 20px 22px',
          } : null),
        }}
      >
        {/* The logo file exactly as it is, straight on the ground behind it. */}
        <img
          ref={logoRef}
          src={LOGO_SRC}
          alt="Ringo"
          style={{ height: compact ? 50 : 64, width: 'auto', display: 'block', marginBottom: compact ? 0 : 2, position: 'relative' }}
        />

        <div ref={globeRef} style={{ marginTop: compact ? 4 : 8, position: 'relative' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
              width: globe * 0.62, height: 22, borderRadius: '50%',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(88,24,72,0.30) 0%, rgba(88,24,72,0) 70%)',
              animation: 'ringoGlobeFloat 6s ease-in-out infinite reverse',
            }}
          />
          <div style={{ animation: 'ringoGlobeIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div style={{ animation: 'ringoGlobeFloat 6s ease-in-out infinite' }}>
              <SaturnWorld size={globe} satellite />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: compact ? 2 : 8, fontFamily: 'var(--font-display)', fontSize: compact ? 28 : 34, fontWeight: 800,
            letterSpacing: -1.2, lineHeight: 1.04, textWrap: 'balance', position: 'relative',
            ...heroText,
          }}
        >
          Data for every trip.
        </div>
        <div
          style={{
            marginTop: compact ? 4 : 8, fontFamily: 'var(--font)', fontSize: compact ? 13.5 : 15, fontWeight: 600,
            color: onCream ? '#4A3F60' : 'rgba(255,255,255,0.94)', textShadow: shade,
            lineHeight: 1.45, maxWidth: 300, position: 'relative',
          }}
        >
          eSIMs for 196 countries and every region. Install in a tap, connected when you land.
        </div>
      </div>

      <div style={{ padding: compact ? '8px 20px 16px' : '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: COLUMN_MAX, alignSelf: 'center', position: 'relative' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(40,10,50,0.3)' }}>
          Sign in or create an account
        </div>
        <AuthButtons onSignedIn={onSignedIn} onEmail={onEmail} onDark />
        <TextLink
          onClick={onExplore}
          color="#FFFFFF"
          style={{ margin: '-4px 0 -10px', fontWeight: 700, textShadow: '0 1px 6px rgba(40,10,50,0.3)' }}
        >
          Browse plans first
        </TextLink>
      </div>
      {/* On tall screens a share of the height sits under the buttons, so the
          sign-in block starts near 60% of the screen instead of the bottom.
          Short (compact) screens give it all back to the hero. */}
      <div aria-hidden style={{ flex: compact ? '0 0 0px' : '0.5 1 0px', minHeight: 0 }} />
    </div>
  );
}
