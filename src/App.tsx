// App.tsx — the shell: stack navigation + the three tabs.
//
//   landing → store → destination → checkout → (eSIM ready) → my eSIM → install
//   log in (email + code) opens the eSIM bought elsewhere
//
// A buyer pays through the App Store; ringoesim.com verifies the transaction,
// fulfils the eSIM and tells the app who bought it. Log in (email + code) is
// for a phone that did not do the buying. Everything the app knows about its
// owner lives in src/store/account.ts, on this phone only.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RingoTabBar, type TabId } from './components/TabBar';
import { ScreenHost, type NavDir } from './components/ScreenHost';
import { haptic } from './lib/haptics';
import { account, pendingPurchase } from './store/account';
import { unfinished, onTransaction, finish, loadProducts, iapAvailable, setStoreStatus, type IapTransaction } from './lib/iap';
import { reportTransaction } from './lib/purchase';
import { light } from './api/light';

import { LandingScreen } from './screens/LandingScreen';
import { StoreScreen } from './screens/StoreScreen';
import { DestinationScreen, type Selection } from './screens/DestinationScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { EsimScreen } from './screens/EsimScreen';
import { InstallScreen } from './screens/InstallScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ReportScreen } from './screens/ReportScreen';
import { HelpScreen } from './screens/HelpScreen';

const TABBED = new Set<string>(['store', 'esim', 'help']);
const SEEN_KEY = 'ringo_seen_landing';

interface Frame {
  id: number;
  name: string;
  params: {
    destination?: string;
    selection?: Selection;
    install?: { apple_url: string; lpa: string };
    label?: string;
  };
}

export function App() {
  // Each frame carries a unique monotonic id so distinct navigations never
  // share a React key (prevents a screen instance being reused with stale
  // params).
  const seqRef = useRef(0);
  const mkFrame = (name: string, params: Frame['params'] = {}): Frame => ({ id: ++seqRef.current, name, params });

  // VITE_SHOT opens the app straight onto one screen so App Store screenshots
  // can be captured without driving the UI. Build-time constant: a normal
  // build compiles the branch away.
  const [stack, setStack] = useState<Frame[]>(() => {
    const shot = import.meta.env.VITE_SHOT as string | undefined;
    if (shot) {
      const [name, arg] = shot.split(':');
      if (name === 'landing') return [{ id: 0, name: 'landing', params: {} }];
      if (name === 'destination') return [{ id: 0, name: 'store', params: {} }, { id: 1, name: 'destination', params: { destination: arg || 'europe' } }];
      // A sample activation code so the install screen can be photographed
      // without a purchase; nothing about it is a real profile.
      if (name === 'install') return [{ id: 0, name: 'esim', params: {} }, { id: 1, name: 'install', params: { label: arg || 'Europe', install: { lpa: 'LPA:1$consumer.e-sim.global$RINGO-SAMPLE-0000', apple_url: 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA%3A1%24consumer.e-sim.global%24RINGO-SAMPLE-0000' } } }];
      return [{ id: 0, name, params: {} }];
    }
    let seen = false;
    try { seen = !!localStorage.getItem(SEEN_KEY); } catch { /* ignore */ }
    return [{ id: 0, name: seen ? 'store' : 'landing', params: {} }];
  });
  const current = stack[stack.length - 1];

  // Motion direction is set EXPLICITLY by each navigation action (push =
  // forward, pop = back, replace/tab = fade).
  const navDirRef = useRef<NavDir>('fade');
  const navKey = String(current.id);

  const push = (name: string, params: Frame['params'] = {}) => {
    navDirRef.current = 'push';
    haptic('light');
    setStack((s) => [...s, mkFrame(name, params)]);
  };
  const pop = () => {
    navDirRef.current = 'pop';
    haptic('light');
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };
  const goTab = (name: TabId) => {
    navDirRef.current = 'fade';
    haptic('light');
    setStack([mkFrame(name, {})]);
  };
  const leaveLanding = (to: TabId) => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    goTab(to);
  };

  // One line in the device log at launch saying whether the App Store
  // returns our products: the Paid Apps agreement and the product state are
  // the two things that make every plan read "not sold" without any error.
  useEffect(() => {
    if (!iapAvailable()) return;
    const ids = ['com.ringoesim.app.plan.rl_30.10gb.7999.g2', 'com.ringoesim.app.sub.rl_annual.10gb.29988.g2'];
    let alive = true;
    (async () => {
      // An empty answer right at launch is often the store not being ready
      // yet, so the probe asks again a few times before it is believed.
      for (let i = 0; alive && i < 4; i++) {
        if (i) await new Promise((r) => setTimeout(r, 3000 * i));
        try {
          const m = await loadProducts(ids, { fresh: i > 0 });
          setStoreStatus({ checked: true, available: m.size, error: null });
          console.info(`[ringo:iap] products available at launch: ${m.size} of 2 (try ${i + 1})`);
          if (m.size) return;
        } catch (e) {
          setStoreStatus({ checked: true, error: String((e as Error)?.message || e) });
          console.warn('[ringo:iap] product probe failed', e);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  // Transactions StoreKit still holds unfinished (the app died between the
  // purchase sheet and the server, an Ask to Buy was approved later, a
  // subscription renewed): report each with the context saved before the
  // sheet opened, then finish it. A renewal has no context and no owner to
  // give; the site learns of it from Apple directly, so it is only finished.
  useEffect(() => {
    const settle = async (t: IapTransaction) => {
      const ctx = pendingPurchase.get(t.productId);
      if (ctx) {
        try { await reportTransaction(t, ctx); } catch { /* stays unfinished, tried again next launch */ }
        return;
      }
      if (t.productId.includes('.sub.') && t.originalTransactionId !== t.transactionId) { await finish(t.transactionId); return; }
      const acct = account.get();
      if (acct?.email) {
        // A purchase whose context is gone (storage cleared): the site may
        // already know it from the purchase sheet's own report.
        try {
          const r = await light.restorePurchase(t.jws);
          if (r.ok) await finish(t.transactionId);
        } catch { /* left unfinished */ }
      }
    };
    void unfinished().then((list) => list.forEach((t) => void settle(t)));
    let off = () => {};
    void onTransaction((t) => void settle(t)).then((f) => { off = f; });
    return () => off();
  }, []);

  let body: ReactNode = null;
  switch (current.name) {
    case 'landing':
      body = <LandingScreen onExplore={() => leaveLanding('store')} onMyEsim={() => { leaveLanding(account.get() ? 'esim' : 'store'); if (!account.get()) push('login'); }} />;
      break;
    case 'store':
      body = <StoreScreen onOpen={(id) => push('destination', { destination: id })} onMyEsim={() => goTab('esim')} onLogin={() => push('login')} loggedIn={Boolean(account.get())} />;
      break;
    case 'destination':
      body = (
        <DestinationScreen
          id={current.params.destination || 'europe'}
          onBack={pop}
          onContinue={(selection) => push('checkout', { selection })}
        />
      );
      break;
    case 'checkout':
      body = (
        <CheckoutScreen
          selection={current.params.selection!}
          onBack={pop}
          onReady={() => goTab('esim')}
        />
      );
      break;
    case 'esim':
      body = (
        <EsimScreen
          onBack={stack.length > 1 ? pop : undefined}
          onInstall={(install, label) => push('install', { install, label })}
          onLogin={() => push('login')}
          onStore={() => goTab('store')}
          onReport={() => push('report')}
        />
      );
      break;
    case 'install':
      body = <InstallScreen install={current.params.install!} label={current.params.label || 'Ringo'} onBack={pop} />;
      break;
    case 'login':
      body = <LoginScreen onBack={pop} onDone={() => goTab('esim')} />;
      break;
    case 'report':
      body = <ReportScreen onBack={pop} />;
      break;
    case 'help':
      body = <HelpScreen onLogin={() => push('login')} />;
      break;
    default:
      body = <div style={{ padding: 40 }}>Unknown screen: {current.name}</div>;
  }

  const showTabs = TABBED.has(current.name);

  return (
    <div data-screen-label={`Ringo / ${current.name}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <ScreenHost navKey={navKey} dir={navDirRef.current} onSwipeBack={() => { if (stack.length > 1) pop(); }}>
        {body}
      </ScreenHost>
      {showTabs && <RingoTabBar active={current.name} onChange={goTab} />}
    </div>
  );
}
