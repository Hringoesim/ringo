// InstallScreen — install the eSIM on this iPhone. Apple's universal link
// opens iOS's own "Add eSIM" flow with the profile pre-filled (iOS 17.4+);
// the QR is for installing on another device; the manual fields are the
// same activation data typed by hand. The LPA string comes from
// ringoesim.com, released against the Stripe reference of the purchase.
import { useState } from 'react';
import { RC, SHADOW_CARD } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionTitle, Step } from '../components/ui';
import { qrDataUri, lpaParts } from '../lib/esim';
import { openExternal, openInSheet } from '../lib/browser';
import { SITE } from '../api/light';
import { haptic, hapticSelection } from '../lib/haptics';

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).catch(() => {});
    hapticSelection();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div onClick={copy} className="press" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', borderBottom: last ? 'none' : `1px solid ${RC.line}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ marginTop: 2, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, fontWeight: 600, color: RC.ink, wordBreak: 'break-all' }}>{value}</div>
      </div>
      <span style={{ flexShrink: 0, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: copied ? '#1F7A4E' : RC.inkStrong }}>
        {copied ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, animation: 'ringoConfirm 1.4s ease both' }}>Copied ✓</span> : 'Copy'}
      </span>
    </div>
  );
}

export function InstallScreen({ install, label, onBack }: { install: { apple_url: string; lpa: string }; label: string; onBack: () => void }) {
  const [showManual, setShowManual] = useState(false);
  const [opened, setOpened] = useState(false);
  const parts = lpaParts(install.lpa);

  const installOnDevice = () => {
    haptic('medium');
    setOpened(true);
    void openExternal(install.apple_url);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Install eSIM" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 130px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.7, lineHeight: 1.15 }}>
          Install your {label} eSIM
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          Takes about a minute. Keep your own SIM for calls; Ringo carries the data.
        </div>

        <div style={{ marginTop: 18 }}>
          <RingoCard style={{ padding: 0 }}>
            <Step num="1" title="Tap “Install on this iPhone”" sub="iOS opens Add eSIM with everything filled in" />
            <Step num="2" title="Confirm, and label it Ringo" sub="Choose “Travel” or “Secondary” when iOS asks" />
            <Step num="3" title="When you land: Ringo for data, roaming on" sub="Settings › Mobile Data › Ringo, and turn on Data Roaming for it" last />
          </RingoCard>
        </div>

        {opened && (
          <div className="rise" style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(31,138,91,0.10)', border: '1px solid rgba(31,138,91,0.24)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: '#1F7A4E', lineHeight: 1.45 }}>
            If iOS did not open Add eSIM, go to Settings › Mobile Data › Add eSIM › Use QR Code › Enter Details Manually and paste the code below.
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Installing on another phone?</SectionTitle>
          <div style={{ padding: 20, borderRadius: 24, background: RC.paper, border: `1px solid ${RC.line}`, boxShadow: SHADOW_CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 190, height: 190, borderRadius: 18, padding: 10, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px ' + RC.line }}>
              <img src={qrDataUri(install.lpa)} alt="eSIM activation QR" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
            </div>
            <div style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, textAlign: 'center', lineHeight: 1.5 }}>
              Scan this with the other phone’s camera. The same code is in your email.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={() => { hapticSelection(); setShowManual((s) => !s); }} className="press" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: RC.inkStrong }}>
            {showManual ? 'Hide manual details' : 'Enter the details manually'}
          </button>
          {showManual && (
            <RingoCard style={{ marginTop: 8, padding: 0 }}>
              <DetailRow label="SM-DP+ Address" value={parts.smdp} />
              <DetailRow label="Activation Code" value={parts.matchingId} />
              {parts.confirmationCode && <DetailRow label="Confirmation Code" value={parts.confirmationCode} />}
              <DetailRow label="Full code (LPA)" value={install.lpa} last />
            </RingoCard>
          )}
        </div>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button className="press" onClick={() => void openInSheet(`${SITE}/esim-setup.html`)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkMute }}>
            Full setup guide with screenshots
          </button>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px max(20px, env(safe-area-inset-bottom, 0px))', borderTop: `1px solid ${RC.line}`, background: RC.glass }}>
        <RingoButton onClick={installOnDevice}>{opened ? 'Open Add eSIM again' : 'Install on this iPhone'}</RingoButton>
      </div>
    </div>
  );
}
