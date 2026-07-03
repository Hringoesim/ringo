// HomeScreen — dashboard with membership tiers, metric strip, action rail,
// wallet-style number card, KYC status and a discovery rail.
import type { MouseEvent, ReactNode } from 'react';
import { RC } from '../theme';
import { useRingoState } from '../store/store';
import { COUNTRIES } from '../data/countries';
import { tierFor, nextTier } from '../data/tiers';
import type { PhoneNumber, Tier } from '../data/types';
import type { OnNav } from '../navigation';
import { LOGO_SRC } from '../assets';

/** Time-of-day greeting from the device clock. */
function greetingNow(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({ onNav }: { onNav: OnNav }) {
  const { state } = useRingoState();
  const tier = tierFor(state.score);
  const next = nextTier(state.score);
  const toNext = next ? next.min - state.score : 0;
  const kycDone = state.kycStatus === 'verified';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingTop: 54 }}>
        {/* ── App bar: logo · search · avatar ─────────────────── */}
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: 22, width: 'auto' }} />
          <div
            onClick={() => onNav('browse')}
            style={{
              flex: 1, height: 40, padding: '0 14px', borderRadius: 999,
              background: RC.paper, border: `1px solid ${RC.line}`,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke={RC.inkMute} strokeWidth="2" />
              <path d="M20 20l-3-3" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, fontWeight: 500 }}>Search countries</span>
          </div>
          {/* avatar with tier ring */}
          <div
            onClick={() => onNav('settings')}
            style={{
              width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
              background: `linear-gradient(135deg, ${tier.c1}, ${tier.c2})`,
              padding: 2, display: 'flex',
            }}
          >
            <div
              style={{
                flex: 1, borderRadius: '50%', background: RC.paper,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: RC.inkStrong, fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13,
              }}
            >
              {state.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* ── Greeting — follows the device clock ─────────────── */}
        <div style={{ padding: '20px 20px 14px' }}>
          <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, fontWeight: 500, letterSpacing: 0.2 }}>{greetingNow()}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.05 }}>
            {state.name}{' '}
            <span style={{ background: `linear-gradient(135deg, ${tier.c1}, ${tier.c2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>·</span>{' '}
            {tier.name}
          </div>
        </div>

        {/* ── HERO: membership tier card ──────────────────────── */}
        <div style={{ padding: '0 20px' }}>
          <TierCard tier={tier} next={next} toNext={toNext} score={state.score} onClick={() => onNav('tiers')} />
        </div>

        {/* ── Metric strip ────────────────────────────────────── */}
        <div style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <MetricTile value={`${Math.round(state.dataPct * 100)}%`} label="Data used" onClick={() => onNav('plan')} />
          <MetricTile value={state.countries} label="Countries" onClick={() => onNav('browse')} />
          <MetricTile value={state.numbers.length} label="Numbers" onClick={() => onNav('numbers')} />
        </div>

        {/* ── Action rail ─────────────────────────────────────── */}
        <div style={{ margin: '22px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          <ActionChip label="Add country" icon="globe" onClick={() => onNav('browse')} />
          <ActionChip label="Port number" icon="port" onClick={() => onNav('port')} />
          <ActionChip label="Top up" icon="plan" onClick={() => onNav('plan')} />
          <ActionChip label="Install" icon="qr" onClick={() => onNav('install')} />
        </div>

        {/* ── Active number (compact) ─────────────────────────── */}
        <div style={{ padding: '28px 20px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink, letterSpacing: -0.3 }}>Your numbers</div>
          <button
            onClick={() => onNav('numbers')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkStrong }}
          >
            Manage
          </button>
        </div>
        <div style={{ padding: '0 20px' }}>
          <NumberBuckets numbers={state.numbers} onMore={() => onNav('numbers')} />
        </div>

        {/* ── KYC verification status ─────────────────────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <div
            onClick={kycDone ? undefined : () => onNav('kyc')}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: 16,
              borderRadius: 20, background: RC.paper, border: `1px solid ${RC.line}`,
              cursor: kycDone ? 'default' : 'pointer',
            }}
          >
            <div
              style={{
                width: 42, height: 42, borderRadius: 13,
                background: kycDone ? 'rgba(31,138,91,0.16)' : RC.gradSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" stroke={kycDone ? '#37C285' : RC.inkStrong} strokeWidth="2" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke={kycDone ? '#37C285' : RC.inkStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>
                {kycDone ? 'Identity verified' : state.kycStatus === 'in_review' ? 'Verification in review' : 'Finish identity check'}
              </div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, fontWeight: 500 }}>
                {kycDone
                  ? 'You’re cleared to port & activate'
                  : state.kycStatus === 'in_review'
                    ? 'Usually done in under 5 minutes'
                    : '1 step left — unlocks number porting'}
              </div>
            </div>
            {kycDone ? (
              <div
                style={{
                  padding: '6px 12px', borderRadius: 999, background: 'rgba(31,138,91,0.18)', color: '#37C285',
                  fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#37C285" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Done
              </div>
            ) : (
              <div
                style={{
                  padding: '6px 12px', borderRadius: 999,
                  background: state.kycStatus === 'in_review' ? RC.cream : RC.grad,
                  color: state.kycStatus === 'in_review' ? RC.inkStrong : '#FFFDFB',
                  fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}
              >
                {state.kycStatus === 'in_review' ? 'Review' : 'Verify'}
              </div>
            )}
          </div>
        </div>

        {/* ── Discovery: trips ────────────────────────────────── */}
        <div style={{ padding: '28px 20px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink, letterSpacing: -0.3 }}>Where to next</div>
          <button
            onClick={() => onNav('browse')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkStrong }}
          >
            See all
          </button>
        </div>
        <div className="no-bar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 14px' }}>
          {COUNTRIES.filter((c) => c.popular).slice(0, 6).map((c) => (
            <div
              key={c.code}
              onClick={() => onNav('country', c.code)}
              style={{
                flex: '0 0 124px', borderRadius: 20, padding: 14,
                background: RC.paper, border: `1px solid ${RC.line}`, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ fontSize: 28, lineHeight: 1 }}>{c.flag}</div>
              <div style={{ marginTop: 6 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{c.name}</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute, fontWeight: 500 }}>{c.capital}</div>
              </div>
              <div
                style={{
                  marginTop: 4, alignSelf: 'flex-start',
                  fontFamily: 'var(--font)', fontSize: 10, fontWeight: 600, color: RC.inkStrong,
                  padding: '3px 8px', borderRadius: 999, background: RC.cream, letterSpacing: 0.2,
                }}
              >
                Included
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

// Membership tier hero — big metric + progress to next tier.
function TierCard({
  tier,
  next,
  toNext,
  score,
  onClick,
}: {
  tier: Tier;
  next: Tier | null;
  toNext: number;
  score: number;
  onClick: () => void;
}) {
  const pct = next ? Math.min(100, Math.round((score / next.min) * 100)) : 100;
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        borderRadius: 26, padding: '22px 22px 20px',
        background: `linear-gradient(135deg, ${tier.c1} 0%, ${tier.c2} 100%)`,
        color: '#FFFDFB',
        boxShadow: `0 26px 52px -22px ${tier.glow}, 0 6px 14px -8px ${tier.glow}`,
      }}
    >
      {/* atmosphere */}
      <div style={{ position: 'absolute', right: -60, top: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,253,251,0.16)' }} />
      <div style={{ position: 'absolute', left: -30, bottom: -90, width: 190, height: 190, borderRadius: '50%', background: 'rgba(255,253,251,0.08)' }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l2.6 5.6L21 8.3l-4.5 4.3L17.8 19 12 15.8 6.2 19l1.3-6.4L3 8.3l6.4-.7z" fill="#FFFDFB" fillOpacity="0.95" />
          </svg>
          <span style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.92 }}>
            {tier.name} member
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="#FFFDFB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Big metric */}
      <div style={{ position: 'relative', marginTop: 20, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 54, fontWeight: 700, letterSpacing: -2, lineHeight: 0.9 }}>{score}</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, opacity: 0.9, paddingBottom: 8 }}>
          countries<br />this year
        </div>
      </div>

      {/* Progress to next tier */}
      {next ? (
        <div style={{ position: 'relative', marginTop: 18 }}>
          <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,253,251,0.28)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 7, background: '#FFFDFB' }} />
          </div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, opacity: 0.95 }}>
            <strong style={{ fontWeight: 700 }}>{toNext} more</strong> to unlock {next.name} — {next.perk}
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', marginTop: 16, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, opacity: 0.95 }}>
          Top tier unlocked — {tier.perk}
        </div>
      )}
    </div>
  );
}

// Compact metric tile
function MetricTile({ value, label, onClick }: { value: ReactNode; label: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 18, padding: '14px 12px', cursor: 'pointer',
        background: RC.paper, border: `1px solid ${RC.line}`,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}
    >
      <div style={{ fontFamily: 'var(--font)', fontSize: 24, fontWeight: 700, color: RC.inkStrong, letterSpacing: -0.6, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, color: RC.inkMute }}>{label}</div>
    </div>
  );
}

// Wise-style bucket list — every number is a first-class "account" (the IBAN
// of your identity). One card, aligned rows: flag tile | number + label |
// serving network chip. All rows share the same grid so numbers line up.
function NumberBuckets({ numbers, onMore }: { numbers: PhoneNumber[]; onMore: () => void }) {
  if (!numbers.length) return null;
  return (
    <div
      style={{
        borderRadius: 24, background: RC.paper, border: `1px solid ${RC.line}`,
        boxShadow: '0 10px 28px -18px rgba(208,80,0,0.25)', overflow: 'hidden',
      }}
    >
      {numbers.map((n, i) => (
        <div
          key={n.id}
          onClick={onMore}
          className="press"
          style={{
            display: 'grid', gridTemplateColumns: '44px 1fr auto', alignItems: 'center',
            gap: 12, padding: '14px 16px', cursor: 'pointer',
            borderTop: i > 0 ? `1px solid ${RC.line}` : 'none',
          }}
        >
          {/* flag tile (Wise-style circular avatar) */}
          <div
            style={{
              width: 44, height: 44, borderRadius: '50%', background: RC.cream,
              border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22,
            }}
          >
            {n.flag}
          </div>
          {/* number = the account identifier */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font)', fontSize: 16.5, fontWeight: 700, color: RC.ink,
                letterSpacing: -0.2, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {n.number}
            </div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, color: RC.inkMute, letterSpacing: 0.1 }}>
              {n.country} · {n.tag}
              {n.porting && n.portEta ? ` · port ${n.portEta}` : ''}
            </div>
          </div>
          {/* serving network — live connection chip */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 999,
              background: n.active ? 'rgba(31,138,91,0.10)' : RC.cream,
              border: `1px solid ${n.active ? 'rgba(31,138,91,0.25)' : RC.line}`,
            }}
          >
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: n.active ? '#1F8A5B' : RC.inkMute,
                boxShadow: n.active ? '0 0 0 3px rgba(31,138,91,0.18)' : 'none',
              }}
            />
            <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: n.active ? '#1F7A4E' : RC.inkMute, whiteSpace: 'nowrap' }}>
              {n.network ? `${n.network}${n.ran ? ' · ' + n.ran : ''}` : n.active ? 'Connected' : 'Standby'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Polished action button — colorful tile + 3D emoji glyph + label, with press
// feedback. Each action gets its own hue so the rail reads bright and scannable.
type ActionIcon = 'globe' | 'port' | 'plan' | 'qr';
function ActionChip({ label, icon, onClick }: { label: string; icon: ActionIcon; onClick: () => void }) {
  const glyphs: Record<ActionIcon, ReactNode> = {
    globe: <span style={{ fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.18))' }}>🌍</span>,
    port: <span style={{ fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.18))' }}>🔄</span>,
    plan: <span style={{ fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.18))' }}>💳</span>,
    qr: <span style={{ fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.18))' }}>📲</span>,
  };
  const tints: Record<ActionIcon, string> = {
    globe: 'linear-gradient(145deg, #FFE7C2 0%, #FFC98F 100%)', // sunny orange
    port: 'linear-gradient(145deg, #E9E2FF 0%, #C9BBFF 100%)', // violet
    plan: 'linear-gradient(145deg, #D9F6E6 0%, #A9ECC9 100%)', // mint
    qr: 'linear-gradient(145deg, #FFDFEB 0%, #FFB3D1 100%)', // pink
  };
  const press = (v: string) => (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = v;
  };
  return (
    <button
      onClick={onClick}
      onMouseDown={press('scale(0.94)')}
      onMouseUp={press('scale(1)')}
      onMouseLeave={press('scale(1)')}
      style={{
        border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        transition: 'transform .12s ease',
      }}
    >
      <div
        style={{
          width: '100%', aspectRatio: '1', borderRadius: 18,
          background: tints[icon],
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 6px 14px -8px rgba(58,22,5,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {glyphs[icon]}
      </div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.ink, letterSpacing: -0.1, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </button>
  );
}
