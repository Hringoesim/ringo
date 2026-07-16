// InstallScreen — real eSIM install. Claims a profile from the backend pool and
// shows its scannable QR, Apple's native "Add eSIM" universal link, and the
// manual SM-DP+ / activation details.
import { useEffect, useState, type ReactNode } from 'react';
import { RC, SHADOW_CARD } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionTitle, Step } from '../components/ui';
import { useRingoState } from '../store/store';
import { qrDataUri, appleInstallUrl, formatIccid } from '../lib/esim';
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
    <div
      onClick={copy}
      className="press"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer',
        borderBottom: last ? 'none' : `1px solid ${RC.line}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ marginTop: 2, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, fontWeight: 600, color: RC.ink, wordBreak: 'break-all' }}>{value}</div>
      </div>
      <span style={{ flexShrink: 0, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 700, color: RC.inkStrong }}>{copied ? 'Copied' : 'Copy'}</span>
    </div>
  );
}

export function InstallScreen({ onBack, onActivate }: { onBack: () => void; onActivate: () => void }): ReactNode {
  const { state, actions } = useRingoState();
  const esim = state.esim;
  const [loading, setLoading] = useState(!esim);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await actions.claimEsim();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const installOnDevice = () => {
    haptic('medium');
    // Opens the native iOS "Add eSIM" flow (universal link), then continues.
    if (esim) window.open(appleInstallUrl(esim), '_system');
    onActivate();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Install eSIM" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 130px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>
          Install your eSIM
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          {esim
            ? <>Profile <strong style={{ color: RC.ink }}>{formatIccid(esim.iccid)}</strong> is ready. Install it on this iPhone, or scan the QR with another device.</>
            : 'Preparing your profile from the network…'}
        </div>

        {/* QR card — the REAL LPA activation code */}
        <div
          style={{
            marginTop: 22, padding: 24, borderRadius: 28,
            background: RC.paper, border: `1px solid ${RC.line}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: SHADOW_CARD,
          }}
        >
          <div style={{ width: 210, height: 210, borderRadius: 20, padding: 12, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1px ' + RC.line, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {esim ? (
              <img src={qrDataUri(esim)} alt="eSIM activation QR" style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: '50%', border: `3px solid ${RC.line}`, borderTopColor: RC.inkStrong, animation: 'ringoSpin 0.7s linear infinite' }} />
            )}
          </div>
          <div style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 12, fontWeight: 500, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {esim ? `${esim.provider ?? 'eSIM'} · SM-DP+ ${esim.smdp}` : 'Fetching activation code…'}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Or do it on this iPhone</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            <Step num="1" title="Tap “Install on this iPhone”" sub="Opens iOS Settings › Add eSIM with the profile pre-filled" />
            <Step num="2" title="Confirm “Add eSIM”" sub="Your iPhone downloads the profile from the SM-DP+ server" />
            <Step num="3" title="Turn on Ringo data" sub="Activation complete — keep your old SIM for calls if you like" last />
          </RingoCard>
        </div>

        {/* Manual entry — SM-DP+ / activation / confirmation codes */}
        {esim && (
          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => { hapticSelection(); setShowManual((s) => !s); }}
              className="press"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: RC.inkStrong }}
            >
              {showManual ? 'Hide manual details' : 'Enter the details manually'}
            </button>
            {showManual && (
              <RingoCard style={{ marginTop: 8, padding: 0 }}>
                <DetailRow label="SM-DP+ Address" value={esim.smdp} />
                <DetailRow label="Activation Code" value={esim.matchingId} />
                {esim.confirmationCode && <DetailRow label="Confirmation Code" value={esim.confirmationCode} />}
                <DetailRow label="ICCID" value={esim.iccid} last />
              </RingoCard>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '14px 20px 24px', borderTop: `1px solid ${RC.line}`, background: RC.glass }}>
        <RingoButton disabled={loading || !esim} onClick={installOnDevice}>
          {loading ? 'Preparing…' : esim ? 'Install on this iPhone' : 'No profile available'}
        </RingoButton>
      </div>
      <style>{`@keyframes ringoSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
