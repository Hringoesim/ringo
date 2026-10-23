// welcome.ts — whether an account has had the Ringo Rewards welcome
// (src/screens/WelcomeScreen.tsx) on this phone. Once per account.
const SEEN_PREFIX = 'ringo_welcome_v1:';

export function welcomeDue(userId: string | null | undefined): boolean {
  if (!userId) return false;
  try { return localStorage.getItem(SEEN_PREFIX + userId) !== '1'; } catch { return false; }
}

export function markWelcomeSeen(userId: string): void {
  try { localStorage.setItem(SEEN_PREFIX + userId, '1'); } catch { /* ignore */ }
}
