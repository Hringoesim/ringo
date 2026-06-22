// Host.tsx — layout host: scales the iPhone to fit the viewport and letterboxes
// it on the warm canvas. Corner labels echo the prototype chrome.
import { useEffect, useState } from 'react';
import { RingoDevice } from './components/Device';
import { App } from './App';

const ACCENT_A = '#F08038';
const ACCENT_B = '#ED4D8E';

export function Host() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const targetW = 430;
      const targetH = 880;
      const s = Math.min(vw / targetW, vh / targetH, 1);
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
          background: `linear-gradient(135deg,${ACCENT_A},${ACCENT_B})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -0.4,
        }}
      >
        Ringo
        <span
          style={{
            display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
            background: `linear-gradient(135deg,${ACCENT_A},${ACCENT_B})`,
            marginLeft: 2, transform: 'translateY(-1px)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute', top: 28, right: 28,
          fontFamily: 'Poppins', fontSize: 11, fontWeight: 500, color: '#9A6B4A',
          letterSpacing: 0.3, textTransform: 'uppercase',
        }}
      >
        iPhone · prototype
      </div>

      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <RingoDevice width={390} height={844}>
          <App />
        </RingoDevice>
      </div>
    </div>
  );
}
