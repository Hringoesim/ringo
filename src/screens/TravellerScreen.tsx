// TravellerScreen: the first thing after signing up (owner 2026-10-26: "the
// onboarding experience needs to be fun. Once you pick your traveller that
// sticks; you can change your traveller by clicking on your profile pic").
// One playful choice, then the app. The pick lives on this phone with the
// member's other avatar settings (store/avatar.ts).
import { useState } from 'react';
import { RC, TYPE } from '../theme';
import { RingoButton } from '../components/Button';
import { TravellerGrid, TRAVELLERS } from '../components/Avatar';
import { Confetti } from '../components/Confetti';
import { avatarTraveller } from '../store/avatar';
import { account } from '../store/account';
import { hapticNotify } from '../lib/haptics';
import { useLayout, contentColumn } from '../lib/layout';

export function TravellerScreen({ onDone }: { onDone: () => void }) {
  const l = useLayout();
  const acct = account.get();
  const userId = acct?.userId || 'guest';
  const picked = avatarTraveller.use(userId);
  const name = TRAVELLERS.find((t) => t.id === picked)?.name;
  const [party, setParty] = useState(0);
  const go = () => {
    if (!avatarTraveller.picked(userId)) avatarTraveller.set(userId, 'cowboy');
    hapticNotify('success');
    onDone();
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: RC.paper }}>
      {party > 0 && <Confetti key={party} count={28} />}
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: `calc(env(safe-area-inset-top, 0px) + 40px) ${l.gutter}px 140px` }}>
        <div style={{ ...contentColumn(l) }}>
          <h1 className="rise" style={{ margin: 0, ...TYPE.h1, fontSize: 32, color: RC.ink }}>Pick your traveller</h1>
          <p className="rise" style={{ margin: '8px 0 24px', ...TYPE.body, color: RC.ink2 }}>{name ? `${name} it is. Ready when you are.` : 'Who is coming on your trips?'}</p>
          <TravellerGrid userId={userId} seed={acct?.email || userId} level={null} tile={l.isWide ? 96 : 84} onPick={() => setParty((n) => n + 1)} />
          <p style={{ margin: '18px 0 0', ...TYPE.small, color: RC.inkMute }}>Change it any time: tap your picture in Rewards.</p>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `12px ${l.gutter}px max(20px, env(safe-area-inset-bottom, 0px))`, background: RC.glass, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderTop: `1px solid ${RC.line}` }}>
        <RingoButton onClick={go}>{picked ? "Let's go" : 'Skip for now'}</RingoButton>
      </div>
    </div>
  );
}
