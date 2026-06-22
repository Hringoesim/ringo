// Host.tsx — layout host: scales the iPhone to fit the viewport, owns the active
// theme (default dark = website match), and exposes a quick toggle.
import { useEffect, useState } from 'react';
import { RingoDevice } from './components/Device';
import { App } from './App';
import { RC, applyTheme, type Scheme } from './theme';

export function Host() {
  const [theme, setThemeState] = useState<Scheme>('light');

  const setTheme = (next: Scheme) => {
    applyTheme(next); // mutate tokens synchronously, then re-render the tree
    setThemeState(next);
  };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / 430, vh / 880, 1);
      setScale(Math.max(0.4, s));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div
      style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px', position: 'relative', overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 24, left: 28,
          fontFamily: 'Poppins', fontWeight: 700, fontSize: 18,
          background: RC.grad,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -0.4,
        }}
      >
        Ringo
        <span
          style={{
            display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
            background: RC.grad, marginLeft: 2, transform: 'translateY(-1px)',
          }}
        />
      </div>

      {/* Quick theme toggle (chip) */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: 22, right: 26, zIndex: 5,
          height: 30, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
          border: `1px solid ${RC.scheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`,
          background: RC.scheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
          color: RC.scheme === 'dark' ? '#FBEDE6' : '#3A1605',
          fontFamily: 'Poppins', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7,
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ fontSize: 13 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>

      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <RingoDevice width={390} height={844}>
          <App theme={theme} onToggleTheme={toggleTheme} />
        </RingoDevice>
      </div>
    </div>
  );
}
