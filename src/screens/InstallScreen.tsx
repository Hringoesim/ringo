// InstallScreen: install the eSIM on this iPhone. Apple's universal link
// opens iOS's own "Add eSIM" flow with the profile pre-filled (iOS 17.4+);
// the QR is for installing on another device; the manual fields are the
// same activation data typed by hand. The LPA string comes from
// ringoesim.com, released against the App Store reference of the purchase.
//
// The iOS version is never guessed from the user agent (WebKit freezes it).
// The one-tap button is always offered; once tapped, the manual route opens
// right under it in case this iOS did not show Add eSIM.
import { useState } from 'react';
import { RC, RADIUS, TYPE, cardSurface, typeFor } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionHead, Step, SuccessBox, TextLink } from '../components/ui';
import { qrDataUri, lpaParts } from '../lib/esim';
import { openExternal, openInSheet } from '../lib/browser';
import { SITE } from '../api/light';
import { haptic, hapticSelection } from '../lib/haptics';
import { useLayout, readColumn, twoColumn, actionWidth } from '../lib/layout';

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).catch(() => {});
    hapticSelection();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="press"
      aria-label={`Copy ${label}`}
      style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', minHeight: 56, cursor: 'pointer', borderBottom: last ? 'none' : `1px solid ${RC.line}` }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.label, color: RC.ink2 }}>{label}</div>
        <div style={{ marginTop: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 15, lineHeight: 1.4, fontWeight: 600, color: RC.ink, wordBreak: 'break-all' }}>{value}</div>
      </div>
      <span aria-live="polite" style={{ flexShrink: 0, ...TYPE.label, fontWeight: 700, color: copied ? RC.success : RC.orangeInk }}>
        {copied ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, animation: 'ringoConfirm 1.4s ease both' }}>Copied ✓</span> : 'Copy'}
      </span>
    </button>
  );
}

export function InstallScreen({ install, label, onBack }: { install: { apple_url: string; lpa: string }; label: string; onBack: () => void }) {
  const l = useLayout();
  const [showManual, setShowManual] = useState(false);
  const [opened, setOpened] = useState(false);
  const parts = lpaParts(install.lpa);

  const installOnDevice = () => {
    haptic('medium');
    setOpened(true);
    setShowManual(true);
    void openExternal(install.apple_url);
  };

  const steps = (
    <RingoCard padding={0} clip>
      <Step num="1" title="Tap Install on this iPhone" sub="iOS opens Add eSIM with everything filled in" />
      <Step num="2" title="Confirm, and label it Ringo" sub="Choose Travel or Secondary when iOS asks" />
      <Step num="3" title="When you land, turn on roaming" sub="Settings, Mobile Data, Ringo: turn on Data Roaming" last />
    </RingoCard>
  );

  const qr = (
    <section>
      <SectionHead as="h2" title="Another phone?" sub="Scan this with its camera." />
      <div style={{ ...cardSurface(), padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: l.isWide ? 260 : 'min(100%, 220px)', aspectRatio: '1 / 1', borderRadius: RADIUS.sm, padding: 10, boxSizing: 'border-box', background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px ' + RC.line }}>
          <img src={qrDataUri(install.lpa)} alt="eSIM activation QR code" style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }} />
        </div>
        <p style={{ margin: '12px 0 0', ...TYPE.small, color: RC.ink2, textAlign: 'center' }}>
          The same code is in your email.
        </p>
      </div>
    </section>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <RingoHeader title="Install eSIM" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={l.isWide ? { width: '100%', maxWidth: 880, margin: '0 auto', padding: `4px ${l.gutter}px 0`, boxSizing: 'border-box' } : readColumn(l)}>
          <h2 style={{ margin: '4px 0 0', ...typeFor('display', l.size), color: RC.ink }}>
            Install your {label} eSIM
          </h2>
          <p style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>
            About a minute. Your own SIM keeps your calls.
          </p>

          <div style={{ marginTop: 20, ...twoColumn(l, 1.2, 1) }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: l.cardGap }}>
              {steps}
              {opened && (
                <SuccessBox>
                  If Add eSIM did not open, go to Settings, Mobile Data, Add eSIM, Use QR Code, Enter Details Manually, and paste the details below.
                </SuccessBox>
              )}
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <TextLink onClick={() => { hapticSelection(); setShowManual((s) => !s); }}>
                  {showManual ? 'Hide manual details' : 'Enter the details manually'}
                </TextLink>
              </div>
              {showManual && (
                <RingoCard padding={0} clip>
                  <DetailRow label="SM-DP+ address" value={parts.smdp} />
                  <DetailRow label="Activation code" value={parts.matchingId} />
                  {parts.confirmationCode && <DetailRow label="Confirmation code" value={parts.confirmationCode} />}
                  <DetailRow label="Full code (LPA)" value={install.lpa} last />
                </RingoCard>
              )}
            </div>
            <div style={l.isWide ? undefined : { marginTop: 12 }}>{qr}</div>
          </div>

          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <TextLink onClick={() => void openInSheet(`${SITE}/esim-setup.html`)}>
              Full setup guide with screenshots
            </TextLink>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, borderTop: `1px solid ${RC.line}`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }}>
        <div style={actionWidth(l)}>
          <RingoButton onClick={installOnDevice}>{opened ? 'Open Add eSIM again' : 'Install on this iPhone'}</RingoButton>
        </div>
      </div>
    </div>
  );
}
