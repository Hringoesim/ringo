// Globe.tsx — abstract dotted-meridian globe (no AI-slop pin map).
import type { ReactNode } from 'react';

export function RingoGlobe({ size = 300, opacity = 1 }: { size?: number; opacity?: number }) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const meridians: ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const rx = r * Math.abs(Math.cos((i * Math.PI) / 7 + 0.2));
    meridians.push(
      <ellipse key={'m' + i} cx={cx} cy={cy} rx={rx} ry={r}
        fill="none" stroke="url(#ringoGrad)" strokeWidth="1.1"
        strokeDasharray="1.4 5" strokeOpacity="0.55" />,
    );
  }
  const parallels: ReactNode[] = [];
  for (let i = 1; i < 6; i++) {
    const ry = r * Math.sin((i * Math.PI) / 6);
    parallels.push(
      <ellipse key={'p' + i} cx={cx} cy={cy - r * Math.cos((i * Math.PI) / 6)}
        rx={r * Math.sin((i * Math.PI) / 6)} ry={ry * 0.18}
        fill="none" stroke="url(#ringoGrad)" strokeWidth="1.1"
        strokeDasharray="1.4 5" strokeOpacity="0.55" />,
    );
    if (i !== 3)
      parallels.push(
        <ellipse key={'p2' + i} cx={cx} cy={cy + r * Math.cos((i * Math.PI) / 6)}
          rx={r * Math.sin((i * Math.PI) / 6)} ry={ry * 0.18}
          fill="none" stroke="url(#ringoGrad)" strokeWidth="1.1"
          strokeDasharray="1.4 5" strokeOpacity="0.55" />,
      );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity }}>
      <defs>
        <linearGradient id="ringoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F08038" />
          <stop offset="50%" stopColor="#F25F77" />
          <stop offset="100%" stopColor="#ED4D8E" />
        </linearGradient>
        <radialGradient id="ringoGlobeFill" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="#FFE6D2" />
          <stop offset="60%" stopColor="#FCD3BB" />
          <stop offset="100%" stopColor="#F4B493" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#ringoGlobeFill)" />
      {meridians}
      {parallels}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#ringoGrad)" strokeWidth="2" />
    </svg>
  );
}
