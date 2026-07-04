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
import { SignUpScreen } from './screens/SignUpScreen';
import { OtpScreen } from './screens/OtpScreen';
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

interface AppProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function App({ theme, onToggleTheme }: AppProps) {
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
  const [otp, setOtp] = useState<{ challengeId: string; devCode: string; phone: string } | null>(null);
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

  const finishToHome = () => {
    auth.completeOnboarding();
    if (sb) void sbAuth.completeOnboarding();
    storeActions.syncIdentity();
    replace('home');
  };

  const signOut = () => {
    if (sb) void sbAuth.signOut();
    auth.signOut();
    storeActions.reset();
    replace('landing');
  };

  // Begin email verification (Supabase OTP if configured, else local mock OTP).
  const beginOtp = async (email: string, phone: string) => {
    if (sb) {
      await sbAuth.startEmailOtp(email);
      setOtp({ challengeId: email, devCode: '', phone: phone || email });
    } else {
      const { challengeId, devCode } = auth.startPhoneVerification(email, phone || email);
      setOtp({ challengeId, devCode, phone: phone || email });
    }
    push('otp');
  };

  // Identity gate (L2): buying or porting a number requires a completed KYC.
  const gateNumber = (target: 'addNumber' | 'port', arg?: string, onboarding = false) => {
    if (kycCleared(state)) {
      if (target === 'addNumber') push('addNumber', { preselect: arg, onboarding });
      else push('port', { onboarding });
    } else {
      hapticNotify('warning');
      push('kyc', { mandatory: true, gateReturn: target, gateArg: arg, onboarding });
    }
  };
  // Paywall gate: installing/activating the eSIM requires a paid plan.
  const gateActivation = (target: 'install' | 'activate') => {
    if (state.subscribed) push(target);
    else { hapticNotify('warning'); push('checkout', { planId: state.planId, gateReturn: 'install' }); }
  };

  const onNav: OnNav = (target: NavTarget, ...args: string[]) => {
    if (target === 'home') return goTab('home');
    if (target === 'browse') return goTab('browse');
    if (target === 'numbers') return goTab('numbers');
    if (target === 'plan') return goTab('plan');
    if (target === 'country') return push('country', { code: args[0] });
    if (target === 'addNumber') return gateNumber('addNumber', args[0]);
    if (target === 'install') return gateActivation('install');
    if (target === 'activate') return gateActivation('activate');
    if (target === 'port') return gateNumber('port');
    if (target === 'tiers') return push('tiers');
    if (target === 'kyc') return push('kyc');
    if (target === 'settings') return push('settings');
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
          onCreate={() => push('signup', { mode: 'create' })}
          onLogin={() => push('signup', { mode: 'login' })}
        />
      );
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
            if (sb) { await sbAuth.apple(); return; } // real Apple OAuth (redirect)
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
    case 'otp':
      body = (
        <OtpScreen
          phone={otp?.phone || ''}
          devCode={otp?.devCode}
          onBack={pop}
          onVerify={async (code) => {
            if (sb) {
              const r = await sbAuth.verifyEmailOtp(otp?.challengeId || '', code);
              if (r.ok) { storeActions.syncIdentity(); push('kyc'); }
              return { ok: r.ok, error: r.error };
            }
            const res = auth.verifyCode(otp?.challengeId || '', code);
            if (res.ok) push('kyc');
            return res;
          }}
          onResend={async () => {
            if (sb) { await sbAuth.startEmailOtp(otp?.challengeId || ''); return null; }
            return auth.resendCode(otp?.challengeId || '');
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
        />
      );
      break;
    case 'home':
      body = <HomeScreen onNav={onNav} />;
      break;
    case 'browse':
      body = <BrowseScreen onNav={onNav} onBack={() => goTab('home')} />;
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
      body = <NumbersScreen onNav={onNav} onBack={() => goTab('home')} />;
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
          onBack={() => goTab('home')}
          onInstall={() => gateActivation('install')}
          onCheckout={(planId) => push('checkout', { planId })}
        />
      );
      break;
    case 'checkout':
      body = (
        <PaywallScreen
          planId={current.params.planId || state.planId}
          onBack={pop}
          onPaid={() => {
            // Payment done → continue to whatever the paywall was gating.
            if (current.params.gateReturn === 'install') replace('install');
            else goTab('home');
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
    case 'settings':
      body = (
        <SettingsScreen onBack={pop} theme={theme} onToggleTheme={onToggleTheme} onSignOut={signOut} onNav={onNav} />
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
