// ShareFriends: share with 3 friends, get EUR 10 (owner 2026-10-25). Every 3
// friends who open the member's link and buy a plan earn EUR 10 of Ringo
// credit, again for every 3 more. Signups alone earn nothing. The count and
// the link come from /api/app-profile (referral); the credit is granted on
// ringoesim.com once each purchase is a day old.
import { useState } from 'react';
import { RC, RADIUS, TYPE, SITE_GRAD, cardSurface } from '../../theme';
import { RingoButton } from '../Button';
import { hapticSelection } from '../../lib/haptics';
import type { Layout } from '../../lib/layout';
import type { Profile } from '../../api/light';

type Referral = NonNullable<Profile['referral']>;

export function ShareFriends({ r, l }: { r: Referral; l: Layout }) {
  const [note, setNote] = useState<string | null>(null);
  if (!r.link || !(r.per > 0) || !(r.credit_cents > 0)) return null;
  const link = r.link;
  const eur = `€${Math.round(r.credit_cents / 100)}`;
  const inRound = r.friends_bought % r.per;
  const share = async () => {
    hapticSelection();
    setNote(null);
    const data = { title: 'Ringo', text: 'I use Ringo for data when I travel. Get your eSIM here:', url: link };
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); return; } catch (e) { if ((e as Error)?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(link); setNote('Link copied'); } catch { setNote('Copy the link to share it.'); }
  };
  return (
    <div style={{ ...cardSurface(), padding: l.cardPad }}>
      <div style={{ ...TYPE.h2, color: RC.ink }}>Share with {r.per} friends, get {eur}</div>
      <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>
        When {r.per} friends buy a plan through your link, you get {eur} of Ringo credit. Again for every {r.per} more.
      </p>
      <div role="img" aria-label={`${inRound} of ${r.per} friends this round`} style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        {Array.from({ length: r.per }, (_, i) => (
          <div key={i} style={{ width: 38, height: 38, borderRadius: '50%', background: i < inRound ? SITE_GRAD : RC.cream, boxShadow: i < inRound ? 'none' : `inset 0 0 0 2px ${RC.line}`, color: i < inRound ? '#fff' : RC.inkMute, display: 'flex', alignItems: 'center', justifyContent: 'center', ...TYPE.bodyStrong }}>
            {i + 1}
          </div>
        ))}
        <span style={{ ...TYPE.small, color: RC.ink2, marginLeft: 4 }}>
          {r.earned > 0 ? `${r.earned} × ${eur} earned` : `${inRound} of ${r.per} friends`}
        </span>
      </div>
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: RADIUS.control, background: RC.cream, border: `1px solid ${RC.line}`, ...TYPE.small, fontWeight: 600, color: RC.ink, overflowWrap: 'anywhere', userSelect: 'text', WebkitUserSelect: 'text' }}>
        {link.replace(/^https:\/\//, '').replace(/&utm_.*$/, '')}
      </div>
      <div style={{ marginTop: 12 }}><RingoButton onClick={() => void share()}>Share your link</RingoButton></div>
      {note && <div role="status" style={{ marginTop: 8, ...TYPE.small, color: RC.ink2 }}>{note}</div>}
    </div>
  );
}
