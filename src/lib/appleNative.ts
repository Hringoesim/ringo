// appleNative.ts — bridge to the app's embedded Swift "SignInWithApple" plugin
// (ios/App/App/SignInWithApplePlugin.swift). Registered via Capacitor so the
// native ASAuthorization sheet can be driven from JS; no third-party pod/SPM
// package (the community plugin isn't SPM-compatible on Capacitor 6).
import { registerPlugin } from '@capacitor/core';

export interface AppleAuthResult {
  response?: {
    identityToken?: string;
    authorizationCode?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
    user?: string;
  };
}

export interface AppleNativePlugin {
  /** Present the system Sign in with Apple sheet. `nonce` is the SHA-256 hex of
   *  a raw nonce; the returned identity token embeds that hash. */
  authorize(options: { nonce?: string; scopes?: string }): Promise<AppleAuthResult>;
}

export const SignInWithApple = registerPlugin<AppleNativePlugin>('SignInWithApple');
