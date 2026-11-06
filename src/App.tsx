// App.tsx — the shell: stack navigation + the three tabs.
//
//   landing → store → destination → checkout → (eSIM ready) → my eSIM → install
//   log in (email + code) opens the eSIM bought elsewhere
//
// A buyer pays through the App Store; ringoesim.com verifies the transaction,
// fulfils the eSIM and tells the app who bought it. Log in (email + code) is
// for a phone that did not do the buying. Everything the app knows about its
// owner lives in src/store/account.ts, on this phone only.
//
// Notifications are asked on the onboarding step (NotifyScreen): after signing
// up and picking a traveller, before the tabs; once at launch for a member
// from before the step. The PushSheet below (after the first delivered
// purchase) stays as the ask for a phone that never saw the step.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { RingoTabBar, type TabId } from './components/TabBar';
import { RC } from './theme';
import { ScreenHost, type NavDir, type KeptScreen } from './components/ScreenHost';
import { haptic } from './lib/haptics';
import { account, pendingPurchase } from './store/account';
import { useDestinations } from './store/destinations';
import { startLive } from './store/live';
import { unfinished, onTransaction, finish, loadProducts, iapAvailable, setStoreStatus, type IapTransaction } from './lib/iap';
import { reportTransaction } from './lib/purchase';
import { light } from './api/light';

import { LandingScreen } from './screens/LandingScreen';
import { StoreScreen } from './screens/StoreScreen';
import { DestinationScreen, type Selection, type PaidStart } from './screens/DestinationScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { EsimScreen } from './screens/EsimScreen';
import { InstallScreen } from './screens/InstallScreen';
import { LoginScreen } from './screens/LoginScreen';
import { TravellerScreen } from './screens/TravellerScreen';
import { NotifyScreen } from './screens/NotifyScreen';
import { QuizScreen } from './screens/QuizScreen';
import { avatarTraveller } from './store/avatar';
import { ReportScreen } from './screens/ReportScreen';
import { HelpScreen, LANG_RETURN_KEY } from './screens/HelpScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { WaitlistScreen } from './screens/WaitlistScreen';
import { startPush, shouldPrompt, onboardDue, usePush } from './lib/push';
import { PushSheet } from './components/PushControls';
import { bundledPictureFor, pictureFor } from './data/destinations';

const TABBED = new Set<string>(['store', 'esim', 'rewards', 'help']);

interface Frame {
  id: number;
  name: string;
  params: {
    destination?: string;
    /** the destination opens as its Power Use card (owner 2026-10-27) */
    power?: boolean;
    selection?: Selection;
    /** the plan page already took the payment through the sheet */
    paid?: PaidStart;
    install?: { apple_url: string; lpa: string };
    label?: string;
    /** the login screen opens straight on the email step */
    email?: boolean;
    /** the tab the notifications step opens when done */
    then?: TabId;
  };
}

export function App() {
  // Loads the destination list once at launch and, with it, the remote
  // switches the site sends (app_flags). Without this the welcome and login
  // screens never saw a flag, because only the store tab fetched it: turning
  // Google sign-in on would have changed nothing until someone opened the
  // store first.
  useDestinations();
  // Everything read from the site is asked again whenever the app returns to
  // the foreground, so what the app sells is what ringoesim.com sells now.
  useEffect(() => { startLive(); }, []);
  // Signing out (or deleting the account, or a token the site no longer
  // accepts) goes back to the sign-in screen. When the account on this phone
  // changes, the email remembered for checkout goes too, so the next person
  // never buys with the previous person's address (and onto their account).
  const prevUserRef = useRef<string | null>(account.get()?.userId ?? null);
  useEffect(() => account.subscribe(() => {
    const acct = account.get();
    const id = acct?.userId ?? null;
    if (id !== prevUserRef.current) {
      if (prevUserRef.current) { try { localStorage.removeItem('ringo_last_email'); } catch { /* ignore */ } }
      prevUserRef.current = id;
      // The kept tabs showed the previous account: they start afresh.
      forgetTabs();
    }
    if (!acct) { navDirRef.current = 'fade'; setPushAsk(null); setStack([mkFrame('landing', {})]); }
  }), []);

  // The ONE notification ask: once per phone, after the first purchase is
  // delivered (the eSIM is attached to the account), over the My eSIM tab.
  // Never at launch, never on Rewards, never inside checkout.
  const [pushAsk, setPushAsk] = useState<{ place: string } | null>(null);
  const pushTimer = useRef<number | null>(null);
  useEffect(() => () => { if (pushTimer.current) window.clearTimeout(pushTimer.current); }, []);
  const askAfterDelivery = (place: string) => {
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    if (!shouldPrompt()) return;
    let tries = 0;
    const check = async () => {
      pushTimer.current = null;
      tries++;
      const acct = account.get();
      if (!acct || !shouldPrompt()) return;
      try {
        const d = await light.subscription(acct.userId, acct.t, {});
        if (d.subscription?.esim_attached) { if (shouldPrompt()) setPushAsk({ place }); return; }
      } catch { /* asked again below */ }
      if (tries < 8) pushTimer.current = window.setTimeout(() => void check(), 5000);
    };
    pushTimer.current = window.setTimeout(() => void check(), 1200);
  };
  // Push: listens for this phone's token and for taps, never asks at launch
  // (src/lib/push.ts). A tapped push opens the tab its path names.
  useEffect(() => startPush((path) => {
    const tab = path.replace(/^\/+/, '').split(/[/?#]/)[0];
    if (tab === 'store' || tab === 'esim' || tab === 'rewards' || tab === 'help') goTab(tab);
  // goTab only sets state, so the first one is as good as any.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
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
    // No account, no way past the sign-in screen (owner 2026-10-23: "make
    // them sign in, like all apps do"; 2026-09-18: sign-in must be seen).
    const acct = account.get();
    if (!acct) return [{ id: 0, name: 'landing', params: {} }];
    // A language just picked under Help re-renders the app there.
    let back: string | null = null;
    try { back = sessionStorage.getItem(LANG_RETURN_KEY); sessionStorage.removeItem(LANG_RETURN_KEY); } catch { /* ignore */ }
    return [{ id: 0, name: back === 'help' ? 'help' : 'store', params: {} }];
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
  // The four tabs stay mounted once opened (ScreenHost keeps them hidden), so
  // switching tabs or coming back from a place finds a tab as it was left:
  // its scroll, the Power list, its photos, no loading state again. A tab
  // whose content a purchase or a new account changes is forgotten and
  // opens afresh.
  const tabFrames = useRef(new Map<string, Frame>());
  const tabNodes = useRef(new Map<number, ReactNode>());
  const forgetTabs = (...names: string[]) => {
    for (const [name, f] of [...tabFrames.current]) {
      if (names.length && !names.includes(name)) continue;
      tabFrames.current.delete(name);
      tabNodes.current.delete(f.id);
    }
  };
  const goTab = (name: TabId) => {
    navDirRef.current = 'fade';
    haptic('light');
    let f = tabFrames.current.get(name);
    if (!f) { f = mkFrame(name, {}); tabFrames.current.set(name, f); }
    const frame = f;
    setStack((s) => (s.length === 1 && s[0].id === frame.id ? s : [frame]));
  };
  // The eSIMs tab is home (owner 2026-11-06: "when you press the home button
  // I want it to bring you back home"): pressed, it opens the store afresh,
  // at the top, with no search and no Power list, wherever the store was
  // left. Coming back from a place (pop) still finds the store as it was.
  const goHome = () => { forgetTabs('store'); goTab('store'); };
  const tabTap = (name: TabId) => (name === 'store' ? goHome() : goTab(name));
  // The notifications step (owner 2026-11-02), once per phone, then the tab.
  const afterOnboarding = (tab: TabId) => {
    if (onboardDue()) { navDirRef.current = 'push'; setStack([mkFrame('notify', { then: tab })]); return; }
    goTab(tab);
  };
  // Signed in or signed up: traveller first for a first sign-in (owner
  // 2026-10-26: make onboarding fun; once per member on this phone), then the
  // notifications step (once per phone), then My eSIM. No welcome screen.
  const signedIn = () => {
    forgetTabs();
    const a = account.get();
    if (a && !avatarTraveller.picked(a.userId)) { navDirRef.current = 'push'; setStack([mkFrame('traveller', {})]); return; }
    afterOnboarding('esim');
  };
  // A member from before the step (or a sign-in that came before the native
  // side had said where permission stands) sees it once, over the tab they
  // are on, as soon as it is due: iOS not asked yet, or the offers switch
  // never set. Never while a screen is open on top of a tab, never while the
  // older sheet shows, never for a screenshot build.
  const pushState = usePush();
  useEffect(() => {
    if (import.meta.env.VITE_SHOT) return;
    if (!pushState.known || pushAsk || !account.get()) return;
    if (stack.length !== 1 || !TABBED.has(stack[0].name) || !onboardDue()) return;
    navDirRef.current = 'push';
    setStack([mkFrame('notify', { then: stack[0].name as TabId })]);
  }, [pushState.known, stack, pushAsk]);

  // One line in the device log at launch saying whether the App Store
  // returns our products: the Paid Apps agreement and the product state are
  // the two things that make every plan read "not sold" without any error.
  useEffect(() => {
    if (!iapAvailable()) return;
    let alive = true;
    (async () => {
      // The reference products are Europe's, read from the live catalogue so
      // a reprice (new product ids) never leaves the probe asking for
      // products that no longer exist.
      let ids: string[] = [];
      try {
        const c = await light.catalog('europe');
        ids = c.plans.map((p) => p.apple_product_id).filter((x): x is string => Boolean(x)).slice(0, 2);
      } catch (e) {
        setStoreStatus({ checked: true, error: String((e as Error)?.message || e) });
        return;
      }
      if (!ids.length) { setStoreStatus({ checked: true, available: 0 }); return; }
      // An empty answer right at launch is often the store not being ready
      // yet, so the probe asks again a few times before it is believed.
      let last: { available: number; error: string | null } = { available: 0, error: null };
      for (let i = 0; alive && i < 4; i++) {
        if (i) await new Promise((r) => setTimeout(r, 3000 * i));
        try {
          const m = await loadProducts(ids, { fresh: i > 0 });
          last = { available: m.size, error: null };
          setStoreStatus({ checked: true, available: m.size, error: null });
          console.info(`[ringo:iap] products available at launch: ${m.size} of ${ids.length} (try ${i + 1})`);
          if (m.size) break;
        } catch (e) {
          last = { available: 0, error: String((e as Error)?.message || e) };
          setStoreStatus({ checked: true, error: last.error });
          console.warn('[ringo:iap] product probe failed', e);
        }
      }
      // A test build (VITE_PROBE_BEACON=1) tells ringoesim.com what the store
      // answered, so a real device can be checked without its screen.
      if (import.meta.env.VITE_PROBE_BEACON === '1') {
        void fetch('https://ringoesim.com/api/app-probe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...last, of: ids.length, ids, build: import.meta.env.VITE_BUILD || 'dev' }) }).catch(() => {});
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
    // `nth`: several unfinished transactions of one product at launch take
    // that product's waiting contexts in order, oldest purchase first,
    // rather than all reading the same one.
    const settle = async (t: IapTransaction, nth = 0) => {
      const ctx = pendingPurchase.get(t.productId, nth);
      if (ctx) {
        try { await reportTransaction(t, ctx); } catch { /* stays unfinished, tried again next launch */ }
        return;
      }
      if (t.productId.includes('.sub.') && t.originalTransactionId !== t.transactionId) { await finish(t.transactionId); return; }
      // A purchase whose context is gone (storage cleared, a reinstall): the
      // signed transaction is the proof, so the site is asked regardless of
      // whether an account is on the phone. Gating this on a stored email
      // left such a purchase redelivered at every launch and never finished.
      const acct = account.get();
      try {
        const r = await light.restorePurchase(t.jws);
        if (r.ok) {
          if (r.user_id && r.t) account.set({ userId: r.user_id, t: r.t, email: r.email ?? acct?.email ?? null, purchaseRef: `apple:${r.transaction_id}` });
          await finish(t.transactionId);
        }
      } catch { /* left unfinished, tried again next launch */ }
    };
    void unfinished().then((list) => {
      const seen = new Map<string, number>();
      [...list].sort((a, b) => a.purchaseDate - b.purchaseDate).forEach((t) => {
        const nth = seen.get(t.productId) ?? 0;
        seen.set(t.productId, nth + 1);
        void settle(t, nth);
      });
    });
    let off = () => {};
    void onTransaction((t) => void settle(t)).then((f) => { off = f; });
    return () => off();
  }, []);

  // A tab at the root of the stack (the store at launch) is the one kept.
  const root = stack[0];
  if (TABBED.has(root.name) && !tabFrames.current.has(root.name)) tabFrames.current.set(root.name, root);

  const screenFor = (current: Frame): ReactNode => {
    let body: ReactNode = null;
    switch (current.name) {
      case 'landing':
        body = <LandingScreen onSignedIn={signedIn} onEmail={() => push('login', { email: true })} />;
        break;
      case 'store':
        body = <StoreScreen onOpen={(id, opts) => push('destination', { destination: id, ...(opts?.power ? { power: true } : {}) })} onMyEsim={() => goTab('esim')} onLogin={() => push('login')} loggedIn={Boolean(account.get())} onQuiz={() => push('quiz')} />;
        break;
      case 'destination':
        body = (
          <DestinationScreen
            id={current.params.destination || 'europe'}
            power={Boolean(current.params.power)}
            onPower={(destination) => push('destination', { destination, power: true })}
            onBack={pop}
            onContinue={(selection, paid) => push('checkout', { selection, ...(paid ? { paid } : {}) })}
          />
        );
        break;
      case 'checkout':
        body = (
          <CheckoutScreen
            selection={current.params.selection!}
            paid={current.params.paid}
            onBack={pop}
            onReady={() => { const place = current.params.selection?.destination || 'global'; forgetTabs('esim', 'rewards'); goTab('esim'); askAfterDelivery(place); }}
          />
        );
        break;
      case 'esim':
        body = (
          <EsimScreen
            onBack={current.id === stack[stack.length - 1].id && stack.length > 1 ? pop : undefined}
            onInstall={(install, label) => push('install', { install, label })}
            onLogin={() => push('login')}
            onStore={() => goTab('store')}
            onReport={() => push('report')}
            onProfile={() => push('profile')}
          />
        );
        break;
      case 'install':
        body = <InstallScreen install={current.params.install!} label={current.params.label || 'Ringo'} onBack={pop} />;
        break;
      case 'quiz':
        body = <QuizScreen onBack={pop} onBrowse={goHome} onOpen={(id) => push('destination', { destination: id })} />;
        break;
      case 'traveller':
        body = <TravellerScreen onDone={() => afterOnboarding('esim')} />;
        break;
      case 'notify':
        body = <NotifyScreen onDone={() => goTab(current.params.then || 'esim')} />;
        break;
      case 'login':
        body = <LoginScreen onBack={pop} onDone={signedIn} startWithEmail={Boolean(current.params.email)} />;
        break;
      case 'report':
        body = <ReportScreen onBack={pop} />;
        break;
      case 'help':
        body = <HelpScreen onLogin={() => push('login')} onProfile={() => push('profile')} onWaitlist={() => push('waitlist')} />;
        break;
      case 'rewards':
        body = <RewardsScreen onBrowse={() => goTab('store')} onLogin={() => push('login')} onWaitlist={() => push('waitlist')} />;
        break;
      case 'profile':
        body = <RewardsScreen onBack={pop} onBrowse={() => goTab('store')} onLogin={() => push('login')} onWaitlist={() => push('waitlist')} />;
        break;
      // The full Ringo service (own number ported, every country): its free
      // waitlist and the website's survey. Not Ringo Light.
      case 'waitlist':
        body = <WaitlistScreen onBack={pop} onLogin={() => push('login')} onBrowse={() => goTab('store')} />;
        break;
      default:
        body = <div style={{ padding: 40 }}>Unknown screen: {current.name}</div>;
    }
    return body;
  };
  // A kept tab's element is made once, so going back to it or switching tabs
  // never re-renders it (its callbacks only read refs and state setters).
  const nodeFor = (f: Frame): ReactNode => {
    if (tabFrames.current.get(f.name)?.id !== f.id) return screenFor(f);
    let n = tabNodes.current.get(f.id);
    if (n === undefined) { n = screenFor(f); tabNodes.current.set(f.id, n); }
    return n;
  };
  const body = nodeFor(current);
  const kept: KeptScreen[] = [...tabFrames.current.values()].filter((f) => f.id !== current.id).map((f) => ({ key: String(f.id), node: nodeFor(f) }));

  const showTabs = TABBED.has(current.name);
  const closePushAsk = useCallback(() => setPushAsk(null), []);

  return (
    <div data-screen-label={`Ringo / ${current.name}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <ScreenHost navKey={navKey} dir={navDirRef.current} fullBleed={current.name === 'landing'} kept={kept} onSwipeBack={() => { if (stack.length > 1) pop(); }}>
        {body}
      </ScreenHost>
      {/* The tab screens scroll under the clock; without this strip a heading
          scrolled up runs straight through the time and battery. */}
      {showTabs && <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 'env(safe-area-inset-top, 0px)', background: `var(--status-strip, ${RC.bg})`, zIndex: 5, pointerEvents: 'none' }} />}
      {showTabs && <RingoTabBar active={current.name} onChange={tabTap} />}
      {pushAsk && showTabs && (
        <PushSheet
          place={pushAsk.place}
          photo={bundledPictureFor(pushAsk.place) ?? pictureFor(pushAsk.place)}
          onClose={closePushAsk}
        />
      )}
    </div>
  );
}
