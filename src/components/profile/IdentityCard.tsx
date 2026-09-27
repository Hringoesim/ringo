// The account at the top of the profile: an initial, the address and since
// when. The address may break only before its "@", never in the middle of
// a name, and a part too long for the line ends in an ellipsis.
import { RC, RADIUS, BRAND } from '../../theme';
import { RingoCard } from '../Card';
import { monthYear, tintFor } from './format';

export function IdentityCard({ email, memberSince, tierId, tierName }: { email: string; memberSince: string | null; tierId: string | null; tierName: string | null }) {
  const at = email.indexOf('@');
  const local = at > 0 ? email.slice(0, at) : email;
  const domain = at > 0 ? email.slice(at) : '';
  const initial = (email.trim()[0] || '?').toUpperCase();
  const since = monthYear(memberSince);
  const part = { display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' } as const;
  return (
    <RingoCard padding={16} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div aria-hidden style={{ width: 56, height: 56, borderRadius: RADIUS.pill, flexShrink: 0, background: RC.grad, color: BRAND.starlight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800 }}>{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div data-profile-email title={email} style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 700, color: RC.ink, letterSpacing: -0.2, lineHeight: 1.3 }}>
          <span style={part}>{local}</span><wbr /><span style={part}>{domain}</span>
        </div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontFamily: 'var(--font)', fontSize: 13, color: RC.inkMute }}>
          <span>{since ? `Member since ${since}` : 'Ringo member'}</span>
          {tierName && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px 3px 7px', borderRadius: RADIUS.pill, background: RC.cream, border: `1px solid ${RC.line}`, color: RC.ink, fontSize: 12, fontWeight: 700 }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: RADIUS.pill, background: tintFor(tierId) }} />
              {tierName}
            </span>
          )}
        </div>
      </div>
    </RingoCard>
  );
}
