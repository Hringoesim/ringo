// App.tsx — main shell with stack-based navigation + tab bar.
//
// Entry is a SINGLE landing screen (Create account | Log in). Onboarding then
// follows the backend orchestration order (Workstream A):
//   account → KYC (Identity gate) → number assignment (allocate | port-in MNP)
//   → eSIM install (SM-DP+/LPAd) → activation → home.
// Auth is real (src/auth/auth.ts); when Supabase is configured it routes through
// Supabase Auth + data (src/lib/ringoSupabase.ts).
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { RingoTabBar } from './components/TabBar';
import { ScreenHost, type NavDir } from './components/ScreenHost';
import { actions as storeActions, useRingoState, kycCleared } from './store/store';
import { haptic, hapticNotify } from './lib/haptics';
import * as auth from './auth/auth';
import { isSupabaseConfigured, sbAuth } from './lib/ringoSupabase';
import type { NavTarget, OnNav } from './navigation';

import { LockScreen } from './screens/LockScreen';
import { LandingScreen } from './screens/LandingScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { NotifyPrimer } from './screens/NotifyPrimer';
import { SignUpScreen } from './screens/SignUpScreen';
import { KycScreen } from './screens/KycScreen';
import { NumberSetupScreen } from './screens/NumberSetupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { BrowseScreen } from './screens/BrowseScreen';
import { CountryScreen } from './screens/CountryScreen';
import { NumbersScreen } from './screens/NumbersScreen';
import { AddNumberScreen } from './screens/AddNumberScreen';
import { PortNumberScreen } from './screens/PortNumberScreen';
import { PlanScreen } from './screens/PlanScreen';
import { InstallScreen } from './screens/InstallScreen';
import { ActivationScreen } from './screens/ActivationScreen';
import { TiersScreen } from './screens/TiersScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PaywallScreen } from './screens/PaywallScreen';
import { LegalScreen } from './screens/LegalScreen';
import { TwoFactorScreen } from './screens/TwoFactorScreen';

const TABBED = new Set(['home', 'browse', 'numbers', 'plan']);
const sb = isSupabaseConfigured();

interface Frame {
  id: number;
  name: string;
  params: {
    code?: string; preselect?: string; onboarding?: boolean; mode?: 'create' | 'login'; kycDone?: boolean;
    planId?: string; gateReturn?: 'addNumber' | 'port' | 'install'; gateArg?: string; mandatory?: boolean;
  };
}
type TabName = 'home' | 'browse' | 'numbers' | 'plan';

export function App() {
  const { state } = useRingoState();
  // Each frame carries a unique monotonic id so distinct navigations never share
  // a React key (prevents a screen instance being reused with stale params).
  const seqRef = useRef(0);
  const mkFrame = (name: string, params: Frame['params'] = {}): Frame => ({
    id: ++seqRef.current,
    name,
    params,
  });
  const [stack, setStack] = useState<Frame[]>(() => [
    { id: 0, name: auth.getSession() ? 'lock' : 'landing', params: {} },
  ]);
  const current = stack[stack.length - 1];

  // Motion direction is set EXPLICITLY by each navigation action (push=forward,
  // pop=back, replace/tab=fade) rather than inferred from stack length — a
  // whole-stack replace() collapses to length 1 and would otherwise read as a
  // backwards 'pop'. navKey is the frame id, unique per navigation.
  const navDirRef = useRef<NavDir>('fade');
  const navKey = String(current.id);

  useEffect(() => {
    void storeActions.hydrate();
  }, []);

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
  const replace = (name: string, params: Frame['params'] = {}) => {
    navDirRef.current = 'fade';
    setStack([mkFrame(name, params)]);
  };
  const goTab = (name: TabName) => {
    navDirRef.current = 'fade';
    haptic('light');
    setStack([mkFrame(name, {})]);
  };
  // Navigate to a tab. Switching between tab roots replaces the (shallow) stack;
  // but opening a tab screen from a pushed detail screen (e.g. Settings → Plan)
  // PUSHES it, so Back returns to where you came from instead of stranding you.
  const navTab = (name: TabName) => (TABBED.has(current.name) ? goTab(name) : push(name));
  // Back handler for tab screens: pop when we were pushed here (history exists),
  // otherwise fall back to the home root.
  const backOrHome = () => (stack.length > 1 ? pop() : goTab('home'));

  // Ask for notifications only ONCE, and only after a real commitment (sign-in or
  // purchase) — never upfront during a guest's exploration.
  const NOTIFY_KEY = 'ringo_notify_asked';
  const arriveHome = () => {
    let asked = true;
    try { asked = !!localStorage.getItem(NOTIFY_KEY); } catch { /* ignore */ }
    if (!asked) {
      try { localStorage.setItem(NOTIFY_KEY, '1'); } catch { /* ignore */ }
      replace('notify');
    } else {
      replace('home');
    }
  };

  const finishToHome = () => {
    auth.completeOnboarding();
    if (sb) void sbAuth.completeOnboarding();
    storeActions.syncIdentity();
    arriveHome(); // sign-in / activation complete → offer alerts (once)
  };

  const signOut = () => {
    if (sb) void sbAuth.signOut();
    auth.signOut();
    storeActions.reset();
    replace('landing');
  };

  // Guests can explore the dashboard freely; committing (buying/porting a number,
  // subscribing) requires an account first.
  const isGuest = () => !auth.getSession();
  const requireAccount = (): boolean => {
    if (isGuest()) { hapticNotify('warning'); push('signup', { mode: 'create' }); return true; }
    return false;
  };

  // Identity gate (L2): buying or porting a number requires an account + KYC.
  const gateNumber = (target: 'addNumber' | 'port', arg?: string, onboarding = false) => {
    if (requireAccount()) return;
    if (kycCleared(state)) {
      if (target === 'addNumber') push('addNumber', { preselect: arg, onboarding });
      else push('port', { onboarding });
    } else {
      hapticNotify('warning');
      push('kyc', { mandatory: true, gateReturn: target, gateArg: arg, onboarding });
    }
  };
  // Paywall gate: installing/activating the eSIM requires an account + paid plan.
  const gateActivation = (target: 'install' | 'activate') => {
    if (requireAccount()) return;
    if (state.subscribed) push(target);
    else { hapticNotify('warning'); push('checkout', { planId: state.planId, gateReturn: 'install' }); }
  };

  const onNav: OnNav = (target: NavTarget, ...args: string[]) => {
    if (target === 'home') return goTab('home');
    if (target === 'browse') return navTab('browse');
    if (target === 'numbers') return navTab('numbers');
    if (target === 'plan') return navTab('plan');
    if (target === 'country') return push('country', { code: args[0] });
    if (target === 'addNumber') return gateNumber('addNumber', args[0]);
    if (target === 'install') return gateActivation('install');
    if (target === 'activate') return gateActivation('activate');
    if (target === 'port') return gateNumber('port');
    if (target === 'tiers') return push('tiers');
    if (target === 'kyc') return push('kyc');
    if (target === 'settings') return push('settings');
    if (target === 'terms') return push('terms');
    if (target === 'privacy') return push('privacy');
    if (target === 'twofactor') return push('twofactor');
  };

  const onboarding = !!current.params.onboarding;
  const session = auth.getSession();

  let body: ReactNode = null;
  switch (current.name) {
    case 'lock':
      body = (
        <LockScreen
          userName={session?.name || 'there'}
          onUnlock={() => replace('home')}
          onSwitchAccount={signOut}
        />
      );
      break;
    case 'landing':
      body = (
        <LandingScreen
          onExplore={() => push('onboard')}
          onCreate={() => push('signup', { mode: 'create' })}
          onLogin={() => push('signup', { mode: 'login' })}
        />
      );
      break;
    case 'onboard':
      body = (
        <OnboardingScreen
          onBack={pop}
          onExplore={(planId, destinations) => { storeActions.applyOnboarding(planId, destinations); replace('home'); }}
          onCreate={(planId, destinations) => { storeActions.applyOnboarding(planId, destinations); push('signup', { mode: 'create' }); }}
        />
      );
      break;
    case 'notify':
      body = <NotifyPrimer onDone={() => replace('home')} />;
      break;
    case 'signup':
      body = (
        <SignUpScreen
          mode={current.params.mode}
          onBack={pop}
          onForgotPassword={async (email) => {
            if (sb) return sbAuth.resetPassword(email);
            return { ok: false, error: 'Password reset needs the live backend.' };
          }}
          onAppleSignIn={async () => {
            if (sb) {
              await sbAuth.apple(); // native: resolves signed-in; web: redirects away
              if (auth.getSession()) { storeActions.syncIdentity(); finishToHome(); }
              return;
            }
            await auth.signInWithApple();
            finishToHome();
          }}
          onGoogleSignIn={async () => {
            if (sb) { await sbAuth.google(); return; } // real Google OAuth (redirect)
            try { await auth.signInWithGoogle(); } catch { /* cancelled */ }
            finishToHome();
          }}
          onEmailAuth={async ({ name, email, password }) => {
            const isLogin = current.params.mode === 'login';
            if (sb) {
              const r = isLogin
                ? await sbAuth.signInPassword(email, password)
                : await sbAuth.signUpPassword(name, email, password);
              if (!r.ok) throw new Error(r.error || 'Authentication failed.');
              storeActions.syncIdentity();
              if (isLogin) finishToHome();
              else push('kyc');
              return;
            }
            // Local fallback when Supabase isn't configured.
            auth.signInEmailOnly(email);
            if (isLogin) finishToHome();
            else push('kyc');
          }}
        />
      );
      break;
    case 'kyc': {
      const gateReturn = current.params.gateReturn;
      const gateArg = current.params.gateArg;
      const gateOnboarding = current.params.onboarding;
      body = (
        <KycScreen
          onBack={pop}
          mandatory={!!current.params.mandatory}
          onContinue={(payload) => {
            // Only record a KYC submission when the user actually completed the
            // steps — "I'll verify later" must not file an empty submission.
            if (payload) storeActions.submitKyc(payload);
            // If we came here to unlock a number action, continue to it now.
            if (gateReturn === 'addNumber') return push('addNumber', { preselect: gateArg, onboarding: gateOnboarding });
            if (gateReturn === 'port') return push('port', { onboarding: gateOnboarding });
            push('numberSetup', { kycDone: !!payload });
          }}
        />
      );
      break;
    }
    case 'numberSetup':
      body = (
        <NumberSetupScreen
          kycDone={current.params.kycDone !== false}
          onNewNumber={() => gateNumber('addNumber', undefined, true)}
          onPortIn={() => gateNumber('port', undefined, true)}
          onSkip={finishToHome}
          onBack={pop}
        />
      );
      break;
    case 'home':
      body = <HomeScreen onNav={onNav} />;
      break;
    case 'browse':
      body = <BrowseScreen onNav={onNav} onBack={backOrHome} />;
      break;
    case 'country':
      body = (
        <CountryScreen
          code={current.params.code as string}
          onNav={onNav}
          onBack={pop}
          onAddCountry={(code) => { storeActions.enableCountry(code); gateActivation('install'); }}
        />
      );
      break;
    case 'numbers':
      body = <NumbersScreen onNav={onNav} onBack={backOrHome} />;
      break;
    case 'addNumber':
      body = (
        <AddNumberScreen
          preselect={current.params.preselect}
          onBack={pop}
          onContinue={(code) => {
            storeActions.allocateNumber(code);
            if (onboarding) gateActivation('install');
            else goTab('numbers');
          }}
        />
      );
      break;
    case 'port':
      body = (
        <PortNumberScreen
          onBack={pop}
          onContinue={(payload) => {
            storeActions.portNumber(payload);
            if (onboarding) gateActivation('install');
            else goTab('numbers');
          }}
        />
      );
      break;
    case 'plan':
      body = (
        <PlanScreen
          onBack={backOrHome}
          onInstall={() => gateActivation('install')}
          onCheckout={(planId) => { if (requireAccount()) return; push('checkout', { planId }); }}
        />
      );
      break;
    case 'checkout':
      body = (
        <PaywallScreen
          planId={current.params.planId || state.planId}
          onBack={pop}
          onPaid={() => {
            // Payment done → continue to whatever the paywall was gating. Replace
            // the checkout frame with install (pop the paywall, push install) so
            // the back stack is preserved and Back from Install still works —
            // never trap the user on a single-frame stack.
            if (current.params.gateReturn === 'install') { pop(); push('install'); }
            else arriveHome(); // purchase complete → offer alerts (once)
          }}
        />
      );
      break;
    case 'install':
      body = <InstallScreen onBack={pop} onActivate={() => push('activate')} />;
      break;
    case 'activate':
      body = <ActivationScreen onDone={finishToHome} />;
      break;
    case 'tiers':
      body = <TiersScreen onBack={pop} />;
      break;
    case 'terms':
      body = <LegalScreen doc="terms" onBack={pop} />;
      break;
    case 'privacy':
      body = <LegalScreen doc="privacy" onBack={pop} />;
      break;
    case 'twofactor':
      body = <TwoFactorScreen onBack={pop} />;
      break;
    case 'settings':
      body = (
        <SettingsScreen onBack={pop} onSignOut={signOut} onNav={onNav} />
      );
      break;
    default:
      body = <div style={{ padding: 40 }}>Unknown screen: {current.name}</div>;
  }

  const showTabs = TABBED.has(current.name);

  return (
    <div data-screen-label={`Ringo / ${current.name}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ScreenHost navKey={navKey} dir={navDirRef.current}>
        {body}
      </ScreenHost>
      {showTabs && <RingoTabBar active={current.name} onChange={goTab} />}
    </div>
  );
}
