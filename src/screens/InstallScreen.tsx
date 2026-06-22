// InstallScreen — eSIM install (QR + on-device steps).
import type { ReactNode } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, SectionTitle, Step } from '../components/ui';

// Decorative QR — generated grid (not a real QR).
function QRArt() {
  const seed = (n: number) => ((n * 9301 + 49297) % 233280) / 233280;
  const cells: { x: number; y: number; on: boolean }[] = [];
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) cells.push({ x, y, on: seed(x * 31 + y * 7) > 0.55 });
  const isFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
  return (
    <svg width="100%" height="100%" viewBox="0 0 21 21" style={{ display: 'block', borderRadius: 6 }}>
      <defs>
        <linearGradient id="qrGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F08038" />
          <stop offset="100%" stopColor="#ED4D8E" />
        </linearGradient>
      </defs>
      {cells.map(
        (c, i) =>
          !isFinder(c.x, c.y) &&
          c.on && <rect key={i} x={c.x + 0.15} y={c.y + 0.15} width={0.7} height={0.7} rx={0.18} fill="url(#qrGrad)" />,
      ) as ReactNode}
      {/* finder patterns */}
      {[[0, 0], [14, 0], [0, 14]].map(([fx, fy], i) => (
        <g key={i}>
          <rect x={fx + 0.2} y={fy + 0.2} width={6.6} height={6.6} rx={1.5} fill="none" stroke="url(#qrGrad)" strokeWidth="1" />
          <rect x={fx + 2.2} y={fy + 2.2} width={2.6} height={2.6} rx={0.6} fill="url(#qrGrad)" />
        </g>
      ))}
    </svg>
  );
}

export function InstallScreen({ onBack, onActivate }: { onBack: () => void; onActivate: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Install eSIM" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 130px' }}>
        <div style={{ fontFamily: 'Poppins', fontSize: 28, fontWeight: 600, color: RC.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>
          Two taps and you’re live.
        </div>
        <div style={{ marginTop: 6, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute, lineHeight: 1.5 }}>
          Your profile is ready on Ringo’s SM-DP+. Scan this QR with another device, or install it on this iPhone via your eSIM (LPA).
        </div>

        <div
          style={{
            marginTop: 22, padding: 24, borderRadius: 28,
            background: RC.paper, border: `1px solid ${RC.line}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: '0 20px 50px -24px rgba(208,80,0,0.25)',
          }}
        >
          <div style={{ width: 200, height: 200, borderRadius: 24, padding: 14, background: '#FFFDFB', position: 'relative', boxShadow: 'inset 0 0 0 1px ' + RC.line }}>
            <QRArt />
            {/* Center logo on the QR */}
            <div
              style={{
                position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                width: 48, height: 48, borderRadius: 14, background: RC.grad,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 18px -8px rgba(248,80,96,0.6)',
              }}
            >
              <span style={{ color: '#FFFDFB', fontFamily: 'Poppins', fontWeight: 700, fontSize: 18 }}>R</span>
            </div>
          </div>
          <div style={{ marginTop: 14, fontFamily: 'Poppins', fontSize: 12, fontWeight: 500, color: RC.inkMute, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            SM-DP+ activation code · expires in 23h
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Or do it on this iPhone</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            <Step num="1" title="Tap “Install on this device”" sub="Your iPhone’s LPA fetches the profile from SM-DP+" />
            <Step num="2" title="Confirm “Add eSIM”" sub="Downloads & installs the Ringo profile onto your eUICC" />
            <Step num="3" title="Enable Ringo data" sub="SGP.22 activation complete — keep your old SIM for calls if you want" last />
          </RingoCard>
        </div>
      </div>

      <div
        style={{
          padding: '14px 20px 24px', borderTop: `1px solid ${RC.line}`,
          background: 'rgba(254,248,244,0.92)', backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <RingoButton onClick={onActivate}>Install on this device</RingoButton>
      </div>
    </div>
  );
}
