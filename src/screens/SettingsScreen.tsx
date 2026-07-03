// SettingsScreen — profile, account management, appearance, support + legal.
// Reached from the avatar tap on Home.
import type { ReactNode } from 'react';
import { RC } from '../theme';
import { RingoCard } from '../components/Card';
import { useRingoState } from '../store/store';
import { PLANS, planPrice, fmtMoney } from '../data/plans';
import type { OnNav } from '../navigation';

interface SettingsScreenProps {
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSignOut: () => void;
  onNav: OnNav;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 24, fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function Row({ label, value, tone, onClick, last }: { label: string; value?: string; tone?: 'ok' | 'warn'; onClick?: () => void; last?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 2px',
        borderBottom: last ? 'none' : `1px solid ${RC.line}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink }}>{label}</div>
      {value && (
        <div
          style={{
            fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600,
            color: tone === 'ok' ? '#1F7A38' : tone === 'warn' ? '#B7341A' : RC.inkMute,
            background: tone === 'ok' ? 'rgba(46,164,79,0.10)' : tone === 'warn' ? 'rgba(229,67,26,0.10)' : 'transparent',
            padding: tone ? '4px 10px' : 0, borderRadius: 999,
          }}
        >
          {value}
        </div>
      )}
      {onClick && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M6 3l5 5-5 5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

export function SettingsScreen({ onBack, theme, onToggleTheme, onSignOut, onNav }: SettingsScreenProps) {
  const isDark = theme === 'dark';
  const { state } = useRingoState();
  const name = state.name || 'there';
  const email = state.email || 'Signed in with Apple';
  const initial = (name[0] || 'R').toUpperCase();
  const kyc = state.kycStatus;
  const kycValue = kyc === 'verified' ? 'Verified' : kyc === 'in_review' ? 'In review' : 'Verify now';
  const kycTone = kyc === 'verified' ? ('ok' as const) : kyc === 'in_review' ? undefined : ('warn' as const);
  const ext = (url: string) => () => window.open(url, '_blank', 'noopener');

  return (
    <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '70px 24px 40px', color: RC.ink }}>
      <button
        onClick={onBack}
        style={{ border: 'none', background: 'transparent', color: RC.inkStrong, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
      >
        ← Back
      </button>
      <div style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Profile</div>

      <RingoCard style={{ marginTop: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: RC.grad, color: '#FFFDFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 17, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{name}</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
          </div>
        </div>
      </RingoCard>

      <SectionLabel>Account</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: '2px 16px' }}>
        <Row label="Identity verification" value={kycValue} tone={kycTone} onClick={kyc === 'pending' ? () => onNav('kyc') : undefined} />
        <Row label="Plan & billing" value={`${PLANS.find((p) => p.id === state.planId)?.name ?? 'Essentials'} · ${fmtMoney(planPrice(state.planId))}/mo`} onClick={() => onNav('plan')} />
        <Row label="Membership" value="Orange" onClick={() => onNav('tiers')} />
        <Row label="Your numbers" value={`${state.numbers.length}`} onClick={() => onNav('numbers')} last />
      </RingoCard>

      <SectionLabel>Appearance</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['dark', 'light'] as const).map((t) => {
            const on = theme === t;
            return (
              <button
                key={t}
                onClick={() => { if (!on) onToggleTheme(); }}
                style={{
                  flex: 1, height: 44, borderRadius: 14, cursor: 'pointer', border: 'none',
                  background: on ? RC.grad : 'transparent',
                  color: on ? '#FFFFFF' : RC.ink,
                  fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>{t === 'dark' ? '🌙' : '☀️'}</span>
                {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            );
          })}
        </div>
      </RingoCard>
      <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.5 }}>
        {isDark ? 'Dark matches ringoesim.com.' : 'Warm light theme.'} You can switch any time.
      </div>

      <SectionLabel>Support</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: '2px 16px' }}>
        <Row label="Help centre" onClick={ext('https://www.ringoesim.com')} />
        <Row label="Contact us" onClick={ext('mailto:support@ringoesim.com')} last />
      </RingoCard>

      <SectionLabel>Legal</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: '2px 16px' }}>
        <Row label="Terms of service" onClick={ext('https://www.ringoesim.com/terms')} />
        <Row label="Privacy policy" onClick={ext('https://www.ringoesim.com/privacy')} last />
      </RingoCard>

      <button
        onClick={onSignOut}
        style={{
          marginTop: 28, width: '100%', height: 50, borderRadius: 14, cursor: 'pointer',
          border: `1.5px solid ${RC.lineStrong}`, background: 'transparent', color: RC.inkStrong,
          fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
        }}
      >
        Sign out
      </button>
      <div style={{ marginTop: 18, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute }}>
        Ringo · version 0.1.0
      </div>
    </div>
  );
}
