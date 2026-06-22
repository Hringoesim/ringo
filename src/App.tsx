// App.tsx — main shell with stack-based navigation + tab bar.
//
// Entry is a SINGLE landing screen (Create account | Log in). Onboarding then
// follows the backend orchestration order (Workstream A):
//   account → KYC (Identity gate) → number assignment (allocate | port-in MNP)
//   → eSIM install (SM-DP+/LPAd) → activation → home.
// Auth is real (src/auth/auth.ts); when Supabase is configured it routes through
// Supabase Auth + data (src/lib/ringoSupabase.ts).
import { useState, useEffect, type ReactNode } from 'react';
import { RingoTabBar } from './components/TabBar';
import { actions as storeActions } from './store/store';
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

const TABBED = new Set(['home', 'browse', 'numbers', 'plan']);
const sb = isSupabaseConfigured();

interface Frame {
  name: string;
  params: { code?: string; preselect?: string; onboarding?: boolean; mode?: 'create' | 'login' };
}
type TabName = 'home' | 'browse' | 'numbers' | 'plan';

interface AppProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function App({ theme, onToggleTheme }: AppProps) {
  const [stack, setStack] = useState<Frame[]>(() => [
    { name: auth.getSession() ? 'lock' : 'landing', params: {} },
  ]);
  const [otp, setOtp] = useState<{ challengeId: string; devCode: string; phone: string } | null>(null);
  const current = stack[stack.length - 1];

  useEffect(() => {
    void storeActions.hydrate();
  }, []);

  const push = (name: string, params: Frame['params'] = {}) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const replace = (name: string, params: Frame['params'] = {}) => setStack([{ name, params }]);
  const goTab = (name: TabName) => setStack([{ name, params: {} }]);

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

  const onNav: OnNav = (target: NavTarget, ...args: string[]) => {
    if (target === 'home') return goTab('home');
    if (target === 'browse') return goTab('browse');
    if (target === 'numbers') return goTab('numbers');
    if (target === 'plan') return goTab('plan');
    if (target === 'country') return push('country', { code: args[0] });
    if (target === 'addNumber') return push('addNumber', { preselect: args[0] });
    if (target === 'install') return push('install');
    if (target === 'activate') return push('activate');
    if (target === 'port') return push('port');
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
          onAppleSignIn={async () => { await auth.signInWithApple(); finishToHome(); }}
          onGoogleSignIn={async () => {
            if (sb) { await sbAuth.google(); return; } // redirect flow
            try { await auth.signInWithGoogle(); } catch { /* cancelled */ }
            finishToHome();
          }}
          onContinue={({ email, phone }) => void beginOtp(email, phone)}
          onSkipPhone={({ email }) => {
            if (sb) { void beginOtp(email, ''); return; }
            auth.signInEmailOnly(email);
            push('kyc');
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
    case 'kyc':
      body = (
        <KycScreen
          onBack={pop}
          onContinue={(payload) => { storeActions.submitKyc(payload || {}); push('numberSetup'); }}
        />
      );
      break;
    case 'numberSetup':
      body = (
        <NumberSetupScreen
          onNewNumber={() => push('addNumber', { onboarding: true })}
          onPortIn={() => push('port', { onboarding: true })}
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
          onAddCountry={(code) => { storeActions.enableCountry(code); push('install'); }}
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
            if (onboarding) push('install');
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
            if (onboarding) push('install');
            else goTab('numbers');
          }}
        />
      );
      break;
    case 'plan':
      body = <PlanScreen onBack={() => goTab('home')} onInstall={() => push('install')} />;
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
        <SettingsScreen onBack={pop} theme={theme} onToggleTheme={onToggleTheme} onSignOut={signOut} />
      );
      break;
    default:
      body = <div style={{ padding: 40 }}>Unknown screen: {current.name}</div>;
  }

  const showTabs = TABBED.has(current.name);

  return (
    <div data-screen-label={`Ringo / ${current.name}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{body}</div>
      {showTabs && <RingoTabBar active={current.name} onChange={goTab} />}
    </div>
  );
}
