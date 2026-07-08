// Host.tsx — renders the app two ways:
//  • On a real device (Capacitor native app, or PWA added to the home screen):
//    full-screen, no mockup frame.
//  • In a desktop/web browser: inside a scaled iPhone mockup frame.
// Owns the active theme (persisted) + a quick toggle in browser mode.
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { RingoDevice } from './components/Device';
import { App } from './App';
import { RC, applyTheme, type Scheme } from './theme';

// True when running as an installed app (native shell or standalone PWA).
function isStandalone(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return !!(mm || iosStandalone);
}

// True on a phone-sized / touch screen, even in a plain browser tab. We render
// full-screen there too — the iPhone mockup frame is only useful on desktop.
function isPhoneViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth <= 560;
  return narrow && (coarse || window.innerWidth <= 480);
}

export function Host() {
  const [theme, setThemeState] = useState<Scheme>(() => {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('ringo_theme')) as Scheme | null;
    const initial: Scheme = saved === 'dark' || saved === 'light' ? saved : 'light';
    applyTheme(initial);
    return initial;
  });

  const setTheme = (next: Scheme) => {
    applyTheme(next);
    setThemeState(next);
    try {
      localStorage.setItem('ringo_theme', next);
    } catch {
      /* ignore */
    }
    // Match the native status bar to the theme.
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/status-bar')
        .then(({ StatusBar, Style }) => {
          StatusBar.setStyle({ style: next === 'dark' ? Style.Dark : Style.Light });
          StatusBar.setBackgroundColor?.({ color: next === 'dark' ? '#0A0810' : '#FFF6EF' });
        })
        .catch(() => {});
    }
  };
  // Re-evaluate full-screen vs mockup when the window resizes (desktop ↔ phone).
  const [fullScreen, setFullScreen] = useState(() => isStandalone() || isPhoneViewport());
  useEffect(() => {
    const compute = () => setFullScreen(isStandalone() || isPhoneViewport());
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Hide the native splash once mounted.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide()).catch(() => {});
    setTheme(theme); // sync status bar on launch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Full-screen (device) ────────────────────────────────────────────────────
  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          background: RC.bg, overflow: 'hidden',
        }}
      >
        <App />
      </div>
    );
  }

  // ── Mockup frame (browser) ────────────────────────────────────────────────────
  return <BrowserMockup />;
}

function BrowserMockup() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const compute = () => {
      const s = Math.min(window.innerWidth / 430, window.innerHeight / 880, 1);
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
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
          background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -0.4,
        }}
      >
        Ringo
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: RC.grad, marginLeft: 2, transform: 'translateY(-1px)' }} />
      </div>

      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <RingoDevice width={390} height={844}>
          <App />
        </RingoDevice>
      </div>
    </div>
  );
}
