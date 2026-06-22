// App.tsx — main shell with stack-based navigation + tab bar.
//
// Onboarding mirrors the backend orchestration order (Workstream A):
//   account → KYC (Identity gate) → number assignment (allocate | port-in MNP)
//   → eSIM install (SM-DP+/LPAd) → activation → home.
// Auth is real (src/auth/auth.ts): persisted sessions, OTP challenge/verify,
// returning-user lock, sign-out.
import { useState, type ReactNode } from 'react';
import { RingoTabBar } from './components/TabBar';
import { actions as storeActions } from './store/store';
import * as auth from './auth/auth';
import type { NavTarget, OnNav } from './navigation';

import { LockScreen } from './screens/LockScreen';
import { SplashScreen } from './screens/SplashScreen';
import { OnboardScreen } from './screens/OnboardScreen';
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

interface Frame {
  name: string;
  params: { code?: string; preselect?: string; onboarding?: boolean };
}
type TabName = 'home' | 'browse' | 'numbers' | 'plan';

interface AppProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export function App({ theme, onToggleTheme }: AppProps) {
  // Boot from a real session: returning users hit the Face ID lock, new users
  // start at the splash.
  const [stack, setStack] = useState<Frame[]>(() => [
    { name: auth.getSession() ? 'lock' : 'splash', params: {} },
  ]);
  const [otp, setOtp] = useState<{ challengeId: string; devCode: string; phone: string } | null>(null);
  const current = stack[stack.length - 1];

  const push = (name: string, params: Frame['params'] = {}) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const replace = (name: string, params: Frame['params'] = {}) => setStack([{ name, params }]);
  const goTab = (name: TabName) => setStack([{ name, params: {} }]);

  // Land on home and mark onboarding complete for the session.
  const finishToHome = () => {
    auth.completeOnboarding();
    replace('home');
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
          onSwitchAccount={() => { auth.signOut(); replace('splash'); }}
        />
      );
      break;
    case 'splash':
      body = (
        <SplashScreen
          onContinue={(t) => {
            if (t === 'signin') { auth.signInEmailOnly('member@ringoesim.com'); return finishToHome(); }
            return push('onboard');
          }}
        />
      );
      break;
    case 'onboard':
      body = <OnboardScreen onContinue={() => push('signup')} onBack={pop} />;
      break;
    case 'signup':
      body = (
        <SignUpScreen
          onBack={pop}
          onAppleSignIn={async () => { await auth.signInWithApple(); finishToHome(); }}
          onGoogleSignIn={async () => { try { await auth.signInWithGoogle(); } catch { /* cancelled */ } finishToHome(); }}
          onContinue={({ email, phone }) => {
            const { challengeId, devCode } = auth.startPhoneVerification(email, phone);
            setOtp({ challengeId, devCode, phone });
            push('otp');
          }}
          onSkipPhone={({ email }) => {
            auth.signInEmailOnly(email);
            push('kyc'); // Identity gate before number assignment.
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
          onVerify={(code) => {
            const res = auth.verifyCode(otp?.challengeId || '', code);
            if (res.ok) push('kyc');
            return res;
          }}
          onResend={() => auth.resendCode(otp?.challengeId || '')}
        />
      );
      break;
    case 'kyc':
      body = (
        <KycScreen
          onBack={pop}
          onContinue={(payload) => {
            storeActions.submitKyc(payload || {});
            push('numberSetup');
          }}
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
        <SettingsScreen
          onBack={pop}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onSignOut={() => { auth.signOut(); replace('splash'); }}
        />
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
