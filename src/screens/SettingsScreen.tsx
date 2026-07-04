// SettingsScreen — profile, account management, appearance, support + legal.
// Reached from the avatar tap on Home.
import { useRef, useState, type ReactNode } from 'react';
import { RC } from '../theme';
import { RingoCard } from '../components/Card';
import { useRingoState } from '../store/store';
import { PLANS, planPrice, fmtMoney } from '../data/plans';
import { membershipFor } from '../data/tiers';
import { referralCode } from '../data/promo';
import { haptic, hapticNotify } from '../lib/haptics';
import type { OnNav } from '../navigation';

interface SettingsScreenProps {
  onBack: () => void;
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
      className={onClick ? 'press' : undefined}
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

export function SettingsScreen({ onBack, onSignOut, onNav }: SettingsScreenProps) {
  const { state, actions } = useRingoState();
  const name = state.name || 'there';
  const email = state.email || 'Signed in with Apple';
  const initial = (name[0] || 'R').toUpperCase();
  const kyc = state.kycStatus;
  const kycValue = kyc === 'verified' ? 'Verified' : kyc === 'in_review' ? 'In review' : 'Verify now';
  const kycTone = kyc === 'verified' ? ('ok' as const) : kyc === 'in_review' ? undefined : ('warn' as const);
  const ext = (url: string) => () => window.open(url, '_blank', 'noopener');

  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [copied, setCopied] = useState(false);
  const invite = referralCode(state.name, state.email || state.name);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { actions.setAvatar(String(reader.result)); hapticNotify('success'); };
    reader.readAsDataURL(f);
  };
  const saveName = () => { actions.setName(draft); setEditing(false); haptic('light'); };
  const copyInvite = () => {
    void navigator.clipboard?.writeText(invite).catch(() => {});
    setCopied(true); hapticNotify('success');
    setTimeout(() => setCopied(false), 1600);
  };
  const shareInvite = () => {
    const text = `Join me on Ringo — one plan, every country. Use my code ${invite} for a discount: https://ringoesim.com`;
    if (navigator.share) void navigator.share({ text }).catch(() => {});
    else copyInvite();
  };

  return (
    <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '70px 24px 40px', color: RC.ink }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
      <button
        onClick={onBack}
        style={{ border: 'none', background: 'transparent', color: RC.inkStrong, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
      >
        ← Back
      </button>
      <div style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Profile</div>

      <RingoCard style={{ marginTop: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar — tap to change photo */}
          <div
            onClick={() => { haptic('light'); fileRef.current?.click(); }}
            className="press"
            style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}
          >
            {state.avatar ? (
              <img src={state.avatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: RC.grad, color: '#FFFDFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', fontWeight: 700, fontSize: 22 }}>{initial}</div>
            )}
            <div style={{ position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: '50%', background: RC.paper, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 8h3l1.5-2h7L18 8h3v11H4z" stroke={RC.inkStrong} strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="13" r="3" stroke={RC.inkStrong} strokeWidth="2" /></svg>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  style={{ flex: 1, minWidth: 0, height: 36, padding: '0 10px', borderRadius: 10, border: `1.5px solid ${RC.lineStrong}`, background: RC.paper, color: RC.ink, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600 }}
                />
                <button onClick={saveName} style={{ height: 36, padding: '0 12px', borderRadius: 10, border: 'none', background: RC.grad, color: '#FFFDFB', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Save</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 17, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{name}</div>
                <button onClick={() => { setDraft(name); setEditing(true); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: RC.inkStrong }}>Edit</button>
              </div>
            )}
            <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
          </div>
        </div>
      </RingoCard>

      {/* Refer & earn — the user's own share code */}
      <SectionLabel>Refer &amp; earn</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: 16 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute, lineHeight: 1.5 }}>
          Share your code — friends get a discount, you earn credit.
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 46, borderRadius: 12, border: `1.5px dashed ${RC.lineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', fontSize: 16, fontWeight: 800, letterSpacing: 1, color: RC.inkStrong, background: RC.gradSoft }}>
            {invite}
          </div>
          <button onClick={copyInvite} className="press" style={{ height: 46, padding: '0 14px', borderRadius: 12, border: `1.5px solid ${RC.line}`, background: RC.paper, color: RC.inkStrong, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{copied ? 'Copied' : 'Copy'}</button>
          <button onClick={shareInvite} className="press" style={{ height: 46, padding: '0 14px', borderRadius: 12, border: 'none', background: RC.grad, color: '#FFFDFB', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Share</button>
        </div>
      </RingoCard>

      <SectionLabel>Account</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: '2px 16px' }}>
        <Row label="Identity verification" value={kycValue} tone={kycTone} onClick={kyc === 'pending' ? () => onNav('kyc') : undefined} />
        <Row label="Plan & billing" value={`${PLANS.find((p) => p.id === state.planId)?.name ?? 'Essentials'} · ${fmtMoney(planPrice(state.planId))}/mo`} onClick={() => onNav('plan')} />
        <Row label="Membership" value={membershipFor(state.score, state.pioneer).name} onClick={() => onNav('tiers')} />
        <Row label="Your numbers" value={`${state.numbers.length}`} onClick={() => onNav('numbers')} last />
      </RingoCard>

      <SectionLabel>Security</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: '2px 16px' }}>
        <Row label="Two-factor authentication" onClick={() => onNav('twofactor')} last />
      </RingoCard>

      <SectionLabel>Support</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: '2px 16px' }}>
        <Row label="Contact us" onClick={ext('mailto:support@ringoesim.com')} last />
      </RingoCard>

      <SectionLabel>Legal</SectionLabel>
      <RingoCard style={{ marginTop: 10, padding: '2px 16px' }}>
        <Row label="Terms of service" onClick={() => onNav('terms')} />
        <Row label="Privacy policy" onClick={() => onNav('privacy')} last />
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
      <div style={{ marginTop: 18, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute, lineHeight: 1.6 }}>
        Developed by Ringo Ltd · version 0.1.0<br />
        Registered in England &amp; Wales (16972659) · Your data is protected — see our Privacy Policy.
      </div>
    </div>
  );
}
