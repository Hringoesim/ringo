// ActivationScreen — animated success (pulse rings + spring-scale check + staggered text).
import { useEffect, useState } from 'react';
import { RC } from '../theme';
import { RingoButton } from '../components/Button';

export function ActivationScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 250);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => setPhase(3), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        background: `radial-gradient(600px 600px at 50% 30%, rgba(248,80,96,0.25), transparent 70%), ${RC.bg}`,
      }}
    >
      <div style={{ height: 80 }} />

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        {/* Pulsing rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute', width: 260, height: 260, borderRadius: '50%',
              border: `2px solid ${RC.inkStrong}`, opacity: phase >= 1 ? 0 : 0.18,
              animation: phase >= 1 ? `ringoPulse 1.6s ${i * 0.4}s ease-out forwards` : 'none',
            }}
          />
        ))}
        <div
          style={{
            width: 160, height: 160, borderRadius: '50%', background: RC.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 30px 60px -20px rgba(248,80,96,0.6)',
            transform: phase >= 1 ? 'scale(1)' : 'scale(0.6)',
            transition: 'transform .55s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <path
              d="M16 38l14 14 26-30"
              stroke="#FFFDFB" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="80" strokeDashoffset={phase >= 2 ? 0 : 80}
              style={{ transition: 'stroke-dashoffset .7s ease-out' }}
            />
          </svg>
        </div>
      </div>

      <div
        style={{
          textAlign: 'center', padding: '0 28px',
          opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all .5s ease-out',
        }}
      >
        <div style={{ fontFamily: 'Poppins', fontSize: 32, fontWeight: 600, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>
          You’re on Ringo
          <span style={{ background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>.</span>
        </div>
        <div style={{ marginTop: 10, fontFamily: 'Poppins', fontSize: 15, color: RC.inkMute, lineHeight: 1.55 }}>
          Connected in <strong style={{ color: RC.inkStrong, fontWeight: 600 }}>Belgium</strong>. Cross any border — we’ll switch automatically.
        </div>
      </div>

      <div
        style={{
          width: '100%', padding: '24px 24px 36px',
          opacity: phase >= 3 ? 1 : 0, transform: phase >= 3 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all .4s ease-out .1s',
        }}
      >
        <RingoButton onClick={onDone}>Take me home</RingoButton>
      </div>

      <style>{`
        @keyframes ringoPulse {
          0%   { transform:scale(0.4); opacity:0.4; }
          100% { transform:scale(1.6); opacity:0; }
        }
      `}</style>
    </div>
  );
}
