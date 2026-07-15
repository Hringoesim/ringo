// Confetti — a quick, tasteful burst for celebrating a win. Compositor-only
// (transform/opacity), plays once (~1.2s) then can be unmounted. Kept short and
// light so it stays "simple", not noisy.
import { useMemo } from 'react';

const COLORS = ['#FF8A3D', '#F0566B', '#C74B8E', '#FFC24B', '#4CC38A', '#6B8AFF'];

export function Confetti({ count = 32 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: 8 + Math.random() * 84,
        delay: Math.random() * 0.12,
        dur: 0.9 + Math.random() * 0.7,
        rot: (Math.random() - 0.5) * 720,
        x: (Math.random() - 0.5) * 200,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 7,
        round: Math.random() > 0.5,
      })),
    [count],
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 90 }}>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '30%',
            left: `${b.left}%`,
            width: b.size,
            height: b.round ? b.size : b.size * 0.5,
            background: b.color,
            borderRadius: b.round ? '50%' : 2,
            opacity: 0,
            // custom props consumed by the keyframes
            ['--x' as string]: `${b.x}px`,
            ['--r' as string]: `${b.rot}deg`,
            animation: `ringoConfetti ${b.dur}s cubic-bezier(0.34,1.56,0.64,1) ${b.delay}s forwards`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
      <style>{`@keyframes ringoConfetti{0%{opacity:1;transform:translate(0,-10px) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translate(var(--x),560px) rotate(var(--r))}}`}</style>
    </div>
  );
}
