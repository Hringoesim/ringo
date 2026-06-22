// App.tsx — main shell with stack-based screen navigation + tab bar.
//
// Onboarding sequence mirrors the backend orchestration order (Workstream A):
//   account → KYC (Identity gate) → Number assignment (allocate | port-in MNP)
//   → eSIM install (SM-DP+/LPAd) → activation → home.
import { useState, type ReactNode } from 'react';
import { RingoTabBar } from './components/TabBar';
import { RingoAPI } from './api/ringoApi';
import { actions as storeActions } from './store/store';
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

// For returning (already-onboarded) users we boot straight to a Face ID lock →
// dashboard. Flip to false to simulate a brand-new user (splash → sign-up).
const ONBOARDED = true;

// Screens that show the tab bar (top-level destinations)
const TABBED = new Set(['home', 'browse', 'numbers', 'plan']);

interface Frame {
  name: string;
  params: { code?: string; preselect?: string; onboarding?: boolean };
}

type TabName = 'home' | 'browse' | 'numbers' | 'plan';

export function App() {
  const [stack, setStack] = useState<Frame[]>([
    { name: ONBOARDED ? 'lock' : 'splash', params: {} },
  ]);
  const [phoneCache, setPhoneCache] = useState('');
  const current = stack[stack.length - 1];

  const push = (name: string, params: Frame['params'] = {}) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const replace = (name: string, params: Frame['params'] = {}) => setStack([{ name, params }]);
  const goTab = (name: TabName) => setStack([{ name, params: {} }]);

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

  let body: ReactNode = null;
  switch (current.name) {
    case 'lock':
      body = <LockScreen onUnlock={() => replace('home')} onSwitchAccount={() => replace('splash')} />;
      break;
    case 'splash':
      body = (
        <SplashScreen
          onContinue={(t) => {
            if (t === 'signup') return push('onboard');
            if (t === 'signin') return replace('home');
            return push('onboard');
          }}
        />
      );
      break;
    case 'onboard':
      // Value-prop intro, then into account creation.
      body = <OnboardScreen onContinue={() => push('signup')} onBack={pop} />;
      break;
    case 'signup':
      body = (
        <SignUpScreen
          onBack={pop}
          onAppleSignIn={async () => {
            try { await RingoAPI.auth.appleSignIn('mock_identity_token'); } catch { /* ignore */ }
            replace('home');
          }}
          onContinue={async ({ email, phone }) => {
            try { await RingoAPI.auth.emailSignUp(email, phone); } catch { /* ignore */ }
            setPhoneCache(phone);
            push('otp');
          }}
          onSkipPhone={async ({ email }) => {
            try { await RingoAPI.auth.emailSignUp(email, null); } catch { /* ignore */ }
            push('kyc'); // Identity gate comes before number assignment.
          }}
        />
      );
      break;
    case 'otp':
      body = (
        <OtpScreen
          phone={phoneCache}
          onBack={pop}
          onContinue={async () => {
            try { await RingoAPI.auth.verifyOtp('chl_mock', '000000'); } catch { /* ignore */ }
            push('kyc');
          }}
        />
      );
      break;
    case 'kyc':
      body = (
        <KycScreen
          onBack={pop}
          onContinue={(payload) => {
            storeActions.submitKyc(payload || {});
            // Identity submitted → proceed to Number Management.
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
          onSkip={() => replace('home')}
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
          onAddCountry={(code) => {
            storeActions.enableCountry(code);
            push('install');
          }}
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
      body = (
        <InstallScreen
          onBack={pop}
          onActivate={async () => {
            try { await RingoAPI.connectivity.activateEsim('LPA:mock'); } catch { /* ignore */ }
            push('activate');
          }}
        />
      );
      break;
    case 'activate':
      body = <ActivationScreen onDone={() => replace('home')} />;
      break;
    case 'tiers':
      body = <TiersScreen onBack={pop} />;
      break;
    case 'settings':
      body = <SettingsScreen onBack={pop} />;
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
