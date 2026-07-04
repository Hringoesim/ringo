// biometric.ts — bridge to the app's embedded Swift BiometricAuth plugin
// (ios/App/App/BiometricAuthPlugin.swift), for a real Face ID / Touch ID prompt.
import { registerPlugin } from '@capacitor/core';

export interface BiometricAuthPlugin {
  isAvailable(): Promise<{ available: boolean; biometryType: 'faceId' | 'touchId' | 'none' }>;
  authenticate(options?: { reason?: string; fallbackTitle?: string }): Promise<{ success: boolean }>;
}

export const BiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth');
