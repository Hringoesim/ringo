// HomeScreen — dashboard with membership tiers, metric strip, action rail,
// wallet-style number card, KYC status and a discovery rail.
import type { MouseEvent, ReactNode } from 'react';
import { RC } from '../theme';
import { useRingoState } from '../store/store';
import { COUNTRIES } from '../data/countries';
import { tierFor, nextTier } from '../data/tiers';
import type { PhoneNumber, Tier } from '../data/types';
import type { OnNav } from '../navigation';

export function HomeScreen({ onNav }: { onNav: OnNav }) {
  const { state } = useRingoState();
  const active = state.numbers.find((n) => n.id === state.activeNumberId) || state.numbers[0];
  const tier = tierFor(state.score);
  const next = nextTier(state.score);
  const toNext = next ? next.min - state.score : 0;
  const kycDone = state.kycStatus === 'verified';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingTop: 54 }}>
        {/* ── App bar: logo · search · avatar ─────────────────── */}
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <img src="/ringo-logo.png" alt="Ringo" style={{ width: 34, height: 34, borderRadius: '50%' }} />
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
            <span style={{ fontFamily: 'Poppins', fontSize: 13, color: RC.inkMute, fontWeight: 500 }}>Search countries</span>
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
                color: RC.inkStrong, fontFamily: 'Poppins', fontWeight: 600, fontSize: 13,
              }}
            >
              {state.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* ── Greeting ────────────────────────────────────────── */}
        <div style={{ padding: '20px 20px 14px' }}>
          <div style={{ fontFamily: 'Poppins', fontSize: 13, color: RC.inkMute, fontWeight: 500, letterSpacing: 0.2 }}>Good morning</div>
          <div style={{ fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.05 }}>
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
          <div style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, color: RC.ink, letterSpacing: -0.3 }}>Your numbers</div>
          <button
            onClick={() => onNav('numbers')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: RC.inkStrong }}
          >
            Manage
          </button>
        </div>
        <div style={{ padding: '0 20px' }}>
          <WalletCard n={active} count={state.numbers.length} onMore={() => onNav('numbers')} />
        </div>

        {/* ── KYC verification status ─────────────────────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <div
            onClick={() => (kycDone ? undefined : onNav('kyc'))}
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
              <div style={{ fontFamily: 'Poppins', fontSize: 14.5, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>
                {kycDone ? 'Identity verified' : state.kycStatus === 'in_review' ? 'Verification in review' : 'Finish identity check'}
              </div>
              <div style={{ fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute, fontWeight: 500 }}>
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
                  fontFamily: 'Poppins', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
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
                  fontFamily: 'Poppins', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}
              >
                {state.kycStatus === 'in_review' ? 'Review' : 'Verify'}
              </div>
            )}
          </div>
        </div>

        {/* ── Discovery: trips ────────────────────────────────── */}
        <div style={{ padding: '28px 20px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Poppins', fontSize: 18, fontWeight: 600, color: RC.ink, letterSpacing: -0.3 }}>Where to next</div>
          <button
            onClick={() => onNav('browse')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'Poppins', fontSize: 13, fontWeight: 600, color: RC.inkStrong }}
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
                <div style={{ fontFamily: 'Poppins', fontSize: 14, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{c.name}</div>
                <div style={{ fontFamily: 'Poppins', fontSize: 11.5, color: RC.inkMute, fontWeight: 500 }}>{c.capital}</div>
              </div>
              <div
                style={{
                  marginTop: 4, alignSelf: 'flex-start',
                  fontFamily: 'Poppins', fontSize: 10, fontWeight: 600, color: RC.inkStrong,
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
          <span style={{ fontFamily: 'Poppins', fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.92 }}>
            {tier.name} member
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke="#FFFDFB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Big metric */}
      <div style={{ position: 'relative', marginTop: 20, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ fontFamily: 'Poppins', fontSize: 54, fontWeight: 700, letterSpacing: -2, lineHeight: 0.9 }}>{score}</div>
        <div style={{ fontFamily: 'Poppins', fontSize: 13, fontWeight: 500, opacity: 0.9, paddingBottom: 8 }}>
          countries<br />this year
        </div>
      </div>

      {/* Progress to next tier */}
      {next ? (
        <div style={{ position: 'relative', marginTop: 18 }}>
          <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,253,251,0.28)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 7, background: '#FFFDFB' }} />
          </div>
          <div style={{ marginTop: 8, fontFamily: 'Poppins', fontSize: 12, fontWeight: 500, opacity: 0.95 }}>
            <strong style={{ fontWeight: 700 }}>{toNext} more</strong> to unlock {next.name} — {next.perk}
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', marginTop: 16, fontFamily: 'Poppins', fontSize: 12, fontWeight: 500, opacity: 0.95 }}>
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
      <div style={{ fontFamily: 'Poppins', fontSize: 24, fontWeight: 700, color: RC.inkStrong, letterSpacing: -0.6, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'Poppins', fontSize: 11.5, fontWeight: 500, color: RC.inkMute }}>{label}</div>
    </div>
  );
}

// Wallet-style hero card — single primary number, big and quiet.
function WalletCard({ n, count, onMore }: { n: PhoneNumber | undefined; count: number; onMore: () => void }) {
  if (!n) return null;
  return (
    <div
      onClick={onMore}
      style={{
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
        borderRadius: 24, padding: '20px 22px 18px',
        background: RC.paper, border: `1px solid ${RC.line}`,
        boxShadow: '0 10px 28px -18px rgba(208,80,0,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{n.flag}</span>
          <div>
            <div style={{ fontFamily: 'Poppins', fontSize: 12, fontWeight: 500, color: RC.inkMute, letterSpacing: 0.2 }}>{n.country} · {n.tag}</div>
            <div style={{ fontFamily: 'Poppins', fontSize: 20, fontWeight: 600, color: RC.ink, letterSpacing: -0.4, lineHeight: 1.2 }}>{n.number}</div>
          </div>
        </div>
        {/* eSIM glyph */}
        <svg width="30" height="20" viewBox="0 0 32 22" fill="none" style={{ opacity: 0.5 }}>
          <rect x="0.5" y="0.5" width="31" height="21" rx="3" stroke={RC.inkStrong} strokeOpacity="0.5" />
          <path d="M10 4v14M22 4v14M5 9h7M5 13h7M20 9h7M20 13h7" stroke={RC.inkStrong} strokeWidth="1.2" strokeOpacity="0.5" />
        </svg>
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Poppins', fontSize: 12, fontWeight: 500, color: RC.inkMute }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.active ? '#1F8A5B' : RC.cream2 }} />
          Main · calls, SMS &amp; codes
        </div>
        <div style={{ fontFamily: 'Poppins', fontSize: 12, fontWeight: 600, color: RC.inkStrong, display: 'flex', alignItems: 'center', gap: 4 }}>
          {count} numbers
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Polished action button — glyph tile + label, with press feedback.
type ActionIcon = 'globe' | 'port' | 'plan' | 'qr';
function ActionChip({ label, icon, onClick }: { label: string; icon: ActionIcon; onClick: () => void }) {
  const glyphs: Record<ActionIcon, ReactNode> = {
    globe: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 12h18M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
    port: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 17l-4-4 4-4M5 13h10a4 4 0 004-4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    plan: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 11h18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
    qr: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 14h3v3M21 14v3h-3M14 21h3M21 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
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
          background: RC.gradSoft, color: RC.inkStrong,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {glyphs[icon]}
      </div>
      <div style={{ fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.ink, letterSpacing: -0.1, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </button>
  );
}
