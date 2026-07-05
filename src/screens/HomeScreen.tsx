// HomeScreen — dashboard with membership tiers, metric strip, action rail,
// wallet-style number card, KYC status and a discovery rail.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RC, SHADOW_CARD, SHADOW_HERO } from '../theme';
import { useRingoState } from '../store/store';
import { COUNTRIES } from '../data/countries';
import { TIERS, tierFor, nextTier, membershipFor } from '../data/tiers';
import type { PhoneNumber, Tier } from '../data/types';
import type { OnNav } from '../navigation';
import { LOGO_SRC } from '../assets';
import { Confetti } from '../components/Confetti';
import { hapticNotify } from '../lib/haptics';

// Onboarding destination picks → representative country codes for the dashboard.
const DEST_MAP: Record<string, string[]> = {
  US: ['US'], GB: ['GB'], JP: ['JP'], AE: ['AE'], AU: ['AU'],
  TH: ['TH', 'SG', 'ID', 'JP'],
  EU: ['ES', 'FR', 'DE', 'IT', 'PT', 'NL'],
  ALL: [],
};

/** Time-of-day greeting from the device clock. */
function greetingNow(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({ onNav }: { onNav: OnNav }) {
  const { state, actions } = useRingoState();
  const rank = tierFor(state.score); // climbing rank (Orange → Coral → …)
  const tier = membershipFor(state.score, state.pioneer); // shown membership (Pioneer or rank)
  const next = nextTier(state.score);
  const toNext = next ? next.min - state.score : 0;
  const kycDone = state.kycStatus === 'verified';
  const leveledTo = state.tierUp ? TIERS.find((t) => t.id === state.tierUp) : null;
  useEffect(() => { if (state.tierUp) hapticNotify('success'); }, [state.tierUp]);

  // Personalize the discovery rail with the destinations picked in onboarding.
  const pickedCodes = Array.from(new Set(state.destinations.flatMap((d) => DEST_MAP[d] || [])));
  const picked = pickedCodes
    .map((c) => COUNTRIES.find((x) => x.code === c))
    .filter((c): c is (typeof COUNTRIES)[number] => !!c)
    .slice(0, 8);
  const destList = picked.length ? picked : COUNTRIES.filter((c) => c.popular).slice(0, 6);
  const destTitle = picked.length ? 'Your destinations' : 'Where to next';

  // ── Pull-to-refresh: drag down at the top to reload data ──────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const THRESHOLD = 64;

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) { startY.current = null; setPull(0); return; }
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.5, 96));
  };
  const onTouchEnd = async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      hapticNotify('success');
      try { await actions.hydrate(); } catch { /* keep state */ }
      await new Promise((r) => setTimeout(r, 650));
      setRefreshing(false);
    }
    setPull(0);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {leveledTo && <Confetti />}
      <div
        ref={scrollRef}
        className="no-bar"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ flex: 1, overflowY: 'auto', paddingTop: 54, position: 'relative' }}
      >
        {/* pull-to-refresh spinner */}
        <div
          style={{
            position: 'absolute', top: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center',
            pointerEvents: 'none', opacity: pull > 6 || refreshing ? 1 : 0, transition: 'opacity 0.2s',
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `2.5px solid ${RC.line}`, borderTopColor: RC.inkStrong,
              transform: `rotate(${pull * 4}deg)`,
              animation: refreshing ? 'ringoSpin 0.7s linear infinite' : 'none',
            }}
          />
        </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: startY.current === null ? 'transform 0.25s cubic-bezier(0.2,0,0,1)' : 'none' }}>
        {/* ── App bar: logo · search · avatar ─────────────────── */}
        <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <img src={LOGO_SRC} alt="Ringo" style={{ height: 24, width: 'auto' }} />
          <div
            onClick={() => onNav('browse')}
            className="press"
            style={{
              flex: 1, height: 40, padding: '0 14px', borderRadius: 999,
              background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD,
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
            className="press"
            style={{
              width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
              background: `linear-gradient(135deg, ${tier.c1}, ${tier.c2})`,
              padding: 2, display: 'flex',
            }}
          >
            {state.avatar ? (
              <img src={state.avatar} alt="" style={{ flex: 1, width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div
                style={{
                  flex: 1, borderRadius: '50%', background: RC.paper,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: RC.inkStrong, fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13,
                }}
              >
                {state.name.charAt(0)}
              </div>
            )}
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

        {/* ── Finish-setup checklist (hides once complete) ─────── */}
        <SetupChecklist
          kycDone={kycDone}
          subscribed={state.subscribed}
          hasNumber={state.numbers.length > 0}
          onNav={onNav}
        />

        {/* ── Tier-up celebration ─────────────────────────────── */}
        {leveledTo && (
          <div style={{ padding: '0 20px 12px' }}>
            <div
              onClick={() => { actions.clearTierUp(); onNav('tiers'); }}
              className="press"
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18, cursor: 'pointer',
                background: `linear-gradient(135deg, ${leveledTo.c1}, ${leveledTo.c2})`, color: '#FFFDFB',
                boxShadow: `0 12px 24px -14px ${leveledTo.glow}`,
              }}
            >
              <span style={{ fontSize: 24 }}>🎉</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700 }}>You reached {leveledTo.name}!</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 12, opacity: 0.9 }}>New perks unlocked — tap to see them</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); actions.clearTierUp(); }}
                style={{ border: 'none', background: 'rgba(255,253,251,0.25)', color: '#FFFDFB', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* ── HERO: membership tier card ──────────────────────── */}
        <div style={{ padding: '0 20px' }}>
          <TierCard tier={tier} rank={rank} next={next} toNext={toNext} score={state.score} onClick={() => onNav('tiers')} />
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
          <NumberBuckets numbers={state.numbers} onMore={() => onNav('numbers')} onAdd={() => onNav('addNumber')} />
        </div>

        {/* ── KYC verification status ─────────────────────────── */}
        <div style={{ padding: '24px 20px 0' }}>
          <div
            onClick={kycDone ? undefined : () => onNav('kyc')}
            className={kycDone ? undefined : 'press'}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: 16,
              borderRadius: 20, background: RC.paper, border: `1px solid ${RC.line}`,
              boxShadow: SHADOW_CARD, cursor: kycDone ? 'default' : 'pointer',
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
                  background: state.kycStatus === 'in_review' ? RC.cream : 'rgba(206,74,30,0.10)',
                  color: RC.inkStrong,
                  fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                }}
              >
                {state.kycStatus === 'in_review' ? 'Review' : 'Verify'}
              </div>
            )}
          </div>
        </div>

        {/* ── Discovery: trips ────────────────────────────────── */}
        <div style={{ padding: '28px 20px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font)', fontSize: 18, fontWeight: 600, color: RC.ink, letterSpacing: -0.3 }}>{destTitle}</div>
          <button
            onClick={() => onNav('browse')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkStrong }}
          >
            See all
          </button>
        </div>
        <div className="no-bar" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 14px' }}>
          {destList.map((c) => (
            <div
              key={c.code}
              onClick={() => onNav('country', c.code)}
              style={{
                flex: '0 0 124px', borderRadius: 20, padding: 14,
                background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD, cursor: 'pointer',
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
      <style>{`@keyframes ringoSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Finish-setup checklist — a clear, persistent list of the steps to get live
// (verify → plan → number). Disappears once every step is done.
function SetupChecklist({ kycDone, subscribed, hasNumber, onNav }: { kycDone: boolean; subscribed: boolean; hasNumber: boolean; onNav: OnNav }) {
  const steps: { label: string; done: boolean; to: 'kyc' | 'plan' | 'addNumber' }[] = [
    { label: 'Verify your identity', done: kycDone, to: 'kyc' },
    { label: 'Choose your plan', done: subscribed, to: 'plan' },
    { label: 'Add or keep your number', done: hasNumber, to: 'addNumber' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;
  return (
    <div style={{ padding: '0 20px 6px' }}>
      <div style={{ borderRadius: 20, background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 6px' }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: RC.ink, letterSpacing: -0.2 }}>Finish setup</span>
          <span style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: RC.inkMute }}>{doneCount}/{steps.length}</span>
        </div>
        {steps.map((s, i) => (
          <div
            key={s.to}
            onClick={s.done ? undefined : () => onNav(s.to)}
            className={s.done ? undefined : 'press'}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: s.done ? 'default' : 'pointer', borderTop: i ? `1px solid ${RC.line}` : 'none' }}
          >
            <div
              style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: s.done ? RC.grad : 'transparent', border: s.done ? 'none' : `2px solid ${RC.lineStrong}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {s.done && <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: s.done ? RC.inkMute : RC.ink, textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
            {!s.done && (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke={RC.inkStrong} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Membership tier hero — big metric + progress to next tier.
function TierCard({
  tier,
  rank,
  next,
  toNext,
  score,
  onClick,
}: {
  tier: Tier;
  rank: Tier;
  next: Tier | null;
  toNext: number;
  score: number;
  onClick: () => void;
}) {
  // Progress within the current RANK band (rank floor → next rank), so the bar
  // matches the "X more to unlock" copy. (For Pioneers the card colour/name come
  // from `tier`, but the climb is still measured against the rank ladder.)
  const pct = next
    ? Math.min(100, Math.max(0, Math.round(((score - rank.min) / (next.min - rank.min)) * 100)))
    : 100;

  // Tactile "catches light" hero (Revolut-style): tilts in 3D as you drag, with
  // a gloss that sweeps across it. Progress bar fills on mount for momentum.
  const cardRef = useRef<HTMLDivElement>(null);
  const [barPct, setBarPct] = useState(0);
  useEffect(() => { const t = setTimeout(() => setBarPct(pct), 180); return () => clearTimeout(t); }, [pct]);
  const tilt = (e: { clientX: number; clientY: number }) => {
    const el = cardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = 'none';
    el.style.transform = `perspective(760px) rotateY(${px * 9}deg) rotateX(${-py * 9}deg) scale(1.012)`;
  };
  const untilt = () => {
    const el = cardRef.current; if (!el) return;
    el.style.transition = 'transform 0.55s cubic-bezier(0.22,1,0.36,1)';
    el.style.transform = 'perspective(760px) rotateY(0deg) rotateX(0deg) scale(1)';
  };
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onPointerMove={tilt}
      onPointerLeave={untilt}
      onPointerUp={untilt}
      style={{
        position: 'relative', overflow: 'hidden', cursor: 'pointer', willChange: 'transform',
        borderRadius: 26, padding: '22px 22px 20px',
        // The one sunset surface — a warm top-left light bloom over the per-tier
        // gradient deepened toward dusk, lifted with a real shadow.
        background: `radial-gradient(130% 150% at 12% 8%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 46%), linear-gradient(135deg, ${tier.c1} 0%, ${tier.c2} 100%)`,
        color: '#FFFDFB',
        boxShadow: SHADOW_HERO,
      }}
    >
      {/* atmosphere */}
      <div style={{ position: 'absolute', right: -60, top: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,253,251,0.10)' }} />
      <div style={{ position: 'absolute', left: -30, bottom: -90, width: 190, height: 190, borderRadius: '50%', background: 'rgba(255,253,251,0.06)' }} />
      {/* gloss sweep — catches the light */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '-45%', width: '45%', background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.33) 50%, transparent 100%)', transform: 'skewX(-12deg)', animation: 'ringoSheen 6s ease-in-out infinite', pointerEvents: 'none' }} />

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
            <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 7, background: '#FFFDFB', transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)' }} />
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
      className="press"
      style={{
        borderRadius: 18, padding: '14px 12px', cursor: 'pointer',
        background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}
    >
      <div style={{ fontFamily: 'var(--font)', fontSize: 24, fontWeight: 700, color: RC.ink, letterSpacing: -0.6, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 500, color: RC.inkMute }}>{label}</div>
    </div>
  );
}

// Wise-style bucket list — every number is a first-class "account" (the IBAN
// of your identity). One card, aligned rows: flag tile | number + label |
// serving network chip. All rows share the same grid so numbers line up.
function NumberBuckets({ numbers, onMore, onAdd }: { numbers: PhoneNumber[]; onMore: () => void; onAdd: () => void }) {
  // Even with zero numbers, keep the card + "Add a number" row (the only add
  // affordance here) — the map below simply renders no rows.
  return (
    <div
      style={{
        borderRadius: 24, background: RC.paper, border: `1px solid ${RC.line}`,
        boxShadow: SHADOW_CARD, overflow: 'hidden',
      }}
    >
      {numbers.map((n, i) => (
        <div
          key={n.id}
          onClick={onMore}
          className="press"
          style={{
            display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center',
            gap: 10, padding: '14px 14px', cursor: 'pointer',
            borderTop: i > 0 ? `1px solid ${RC.line}` : 'none',
          }}
        >
          {/* flag tile (Wise-style circular avatar) */}
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%', background: RC.cream,
              border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 20,
            }}
          >
            {n.flag}
          </div>
          {/* number = the account identifier */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink,
                letterSpacing: -0.3, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {n.number}
            </div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, color: RC.inkMute, letterSpacing: 0.1 }}>
              {n.country} · {n.tag}
              {n.porting && n.portEta ? ` · port ${n.portEta}` : ''}
              {n.scheduledRelease ? ' · releasing at renewal' : ''}
            </div>
          </div>
          {/* serving network — live connection chip (or a scheduled-release flag) */}
          {n.scheduledRelease ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999,
                background: 'rgba(206,74,30,0.10)', border: '1px solid rgba(206,74,30,0.22)',
              }}
            >
              <span style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: RC.inkStrong, whiteSpace: 'nowrap' }}>Ending</span>
            </div>
          ) : (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 999,
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
          )}
        </div>
      ))}
      {/* Wise-style "open a new bucket" row */}
      <div
        onClick={onAdd}
        className="press"
        style={{
          display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center',
          gap: 10, padding: '14px 14px', cursor: 'pointer',
          borderTop: numbers.length ? `1px solid ${RC.line}` : 'none',
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: '50%', background: RC.gradSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke={RC.inkStrong} strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.inkStrong, letterSpacing: -0.2 }}>
            Add a number
          </div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, color: RC.inkMute }}>
            New local number or port yours in
          </div>
        </div>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// Restrained action button — a uniform warm-sand tile with a monochrome
// sunset-ember line icon. Color lives on the hero, not the rail, so the four
// actions read as a calm, coherent family rather than candy.
type ActionIcon = 'globe' | 'port' | 'plan' | 'qr';
function ActionChip({ label, icon, onClick }: { label: string; icon: ActionIcon; onClick: () => void }) {
  const glyphs: Record<ActionIcon, string> = { globe: '🌍', port: '🔄', plan: '💳', qr: '📲' };
  const tints: Record<ActionIcon, string> = {
    globe: 'linear-gradient(145deg, #FFE7C2 0%, #FFC98F 100%)', // sunny orange
    port: 'linear-gradient(145deg, #E9E2FF 0%, #C9BBFF 100%)', // violet
    plan: 'linear-gradient(145deg, #D9F6E6 0%, #A9ECC9 100%)', // mint
    qr: 'linear-gradient(145deg, #FFDFEB 0%, #FFB3D1 100%)', // pink
  };
  return (
    <button
      onClick={onClick}
      className="press"
      style={{
        border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
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
        <span style={{ fontSize: 30, lineHeight: 1, filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.18))' }}>{glyphs[icon]}</span>
      </div>
      <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.ink, letterSpacing: -0.1, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
    </button>
  );
}
