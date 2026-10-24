// Host.tsx — renders the app two ways:
//  • On a real device (Capacitor native app, or PWA added to the home screen):
//    full-screen, no mockup frame.
//  • In a desktop/web browser: inside a scaled iPhone mockup frame.
// Owns the active theme (persisted) + a quick toggle in browser mode.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { RingoDevice } from './components/Device';
import { App } from './App';
import { RC, applyTheme, RADIUS, LOGO_GRAD, type Scheme } from './theme';
import { syncStatusBar } from './lib/statusBar';
import { setLayoutWidth } from './lib/layout';

// Measures the app root and feeds its live width to useLayout(). On the
// iPhone Duo the WebView resizes when the phone opens or closes; the
// ResizeObserver follows that without any idiom or user-agent check. In the
// desktop mockup it reports the mockup's width, not the browser window's.
function LayoutRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setLayoutWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return () => setLayoutWidth(null);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setLayoutWidth(w);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      setLayoutWidth(null);
    };
  }, []);
  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {children}
    </div>
  );
}

// True when running as an installed app (native shell or standalone PWA).
// `?shot=1` forces it, so App Store screenshots can be captured from a
// desktop headless browser without the mockup frame around them.
function isStandalone(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('shot')) return true;
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
      // The text colour also honours the welcome screen's light request.
      syncStatusBar();
      void import('@capacitor/status-bar')
        .then(({ StatusBar }) => {
          StatusBar.setBackgroundColor?.({ color: next === 'dark' ? '#0E0A16' : '#FFFAF7' });
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

  // Hide the native splash once mounted. launchAutoHide is off, so this is the
  // only thing that dismisses it: run it after a frame so we uncover painted UI
  // rather than an empty webview, and again on a timeout so a failure in here
  // can never strand someone on the splash.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const hide = () =>
      void import('@capacitor/splash-screen').then(({ SplashScreen }) => SplashScreen.hide()).catch(() => {});
    const raf = requestAnimationFrame(() => requestAnimationFrame(hide));
    const backstop = setTimeout(hide, 4000);
    setTheme(theme); // sync status bar on launch
    return () => { cancelAnimationFrame(raf); clearTimeout(backstop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WKWebView scrolls the document when the keyboard opens for a low input
  // (sign-up / log-in) and can leave it shifted afterwards, so the app no
  // longer fills the screen. Snap the document back whenever focus leaves an
  // input or the visual viewport settles.
  // The field being typed in is brought to the middle of its column, above
  // the keyboard (the tab bar stays under the keyboard, as in iOS apps).
  useEffect(() => {
    if (!fullScreen) return;
    const snap = () => requestAnimationFrame(() => window.scrollTo(0, 0));
    const vv = window.visualViewport;
    const reveal = () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const onResize = () => {
      const covered = vv ? Math.max(0, Math.round(window.innerHeight - vv.height)) : 0;
      snap();
      if (covered > 80) window.setTimeout(reveal, 60);
    };
    const onFocusIn = () => window.setTimeout(reveal, 320);
    window.addEventListener('focusout', snap);
    window.addEventListener('focusin', onFocusIn);
    vv?.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('focusout', snap);
      window.removeEventListener('focusin', onFocusIn);
      vv?.removeEventListener('resize', onResize);
    };
  }, [fullScreen]);

  // ── Full-screen (device) ────────────────────────────────────────────────────
  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          background: RC.bg, overflow: 'hidden',
        }}
      >
        <LayoutRoot>
          <App />
        </LayoutRoot>
      </div>
    );
  }

  // ── Mockup frame (browser) ────────────────────────────────────────────────────
  return <BrowserMockup />;
}

// Preview widths for the browser mockup: `?w=360` (iPhone Duo cover),
// `?w=744` (Duo inner display) or any width from 320 to 1024. Default 390.
function mockupSize(): { width: number; height: number } {
  const q = new URLSearchParams(window.location.search);
  const raw = q.get('w') ?? (q.get('duo') === 'inner' ? '744' : q.get('duo') === 'cover' ? '360' : null);
  const w = Math.min(1024, Math.max(320, Number(raw) || 390));
  const h = w >= 600 ? Math.round(w * 1.42) : w < 375 ? 780 : 844;
  return { width: w, height: h };
}

function BrowserMockup() {
  const [scale, setScale] = useState(1);
  const [{ width, height }] = useState(mockupSize);
  useEffect(() => {
    const compute = () => {
      const s = Math.min(window.innerWidth / (width + 40), window.innerHeight / (height + 36), 1);
      setScale(Math.max(0.4, s));
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [width, height]);

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
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24,
          background: LOGO_GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -1,
        }}
      >
        Ringo
      </div>

      <DemoNotice />

      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <RingoDevice width={width} height={height}>
          <LayoutRoot>
            <App />
          </LayoutRoot>
        </RingoDevice>
      </div>
    </div>
  );
}

// Shown beside the mockup in a desktop browser only, never inside the
// native app (this lives in the browser-frame chrome, which native skips).
function DemoNotice() {
  return (
    <div
      style={{
        position: 'absolute', top: 56, left: 28, maxWidth: 250,
        padding: '10px 13px', borderRadius: RADIUS.sm,
        background: RC.cream, border: `1px solid ${RC.line}`,
        fontFamily: 'var(--font)', lineHeight: 1.45,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: RC.ink }}>Demo</div>
      <div style={{ marginTop: 4, fontSize: 13, color: RC.ink2 }}>
        Browser preview of the Ringo iPhone app. Plans, prices and payments
        are the real ones from ringoesim.com. Add ?w=360 or ?w=744 to see the
        iPhone Duo cover and inner displays.
      </div>
    </div>
  );
}
