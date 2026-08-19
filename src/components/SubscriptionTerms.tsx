// SubscriptionTerms — the disclosure App Review requires next to any
// auto-renewable purchase (guideline 3.1.2): the subscription's title, its
// length, its price, how renewal and cancellation work, a way to restore a
// previous purchase, and FUNCTIONAL links to the Terms of Use (EULA) and the
// Privacy Policy.
//
// This used to live on the standalone paywall screen. When the purchase moved
// onto the buy button itself the disclosure did not follow it, which would
// have been rejected — so it lives here and goes wherever the buy button goes.
import { useState } from 'react';
import { RC } from '../theme';
import { haptic, hapticNotify } from '../lib/haptics';
import { useRingoState } from '../store/store';
import { BILLING, periodChargeTotal, periodMonthlyPrice, fmtMoney, type BillingPeriod } from '../data/plans';

const TERMS_URL = 'https://ringoesim.com/terms';
const PRIVACY_URL = 'https://ringoesim.com/privacy';

export function SubscriptionTerms({
  period,
  planName,
  onLight = false,
}: {
  period: BillingPeriod;
  planName: string;
  /** true when sitting on the warm gradient, false on a paper background */
  onLight?: boolean;
}) {
  const { actions } = useRingoState();
  const [restoring, setRestoring] = useState(false);
  const [note, setNote] = useState('');

  const months = BILLING[period].months;
  const total = fmtMoney(periodChargeTotal(period));
  const perMonth = fmtMoney(periodMonthlyPrice(period));

  const ink = onLight ? 'rgba(255,255,255,0.78)' : RC.inkMute;
  const link = onLight ? '#FFFFFF' : RC.inkStrong;

  const open = (url: string) => { haptic('light'); window.open(url, '_blank', 'noopener'); };

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    setNote('');
    const res = await actions.restorePurchases();
    setRestoring(false);
    hapticNotify(res.ok ? 'success' : 'warning');
    setNote(res.ok ? 'Purchase restored.' : res.error || 'Nothing to restore.');
  };

  return (
    <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 10.5, color: ink, lineHeight: 1.5, textAlign: 'center' }}>
      {planName} is an auto-renewing subscription. {total} is charged to your Apple ID
      at purchase and every {months} months ({perMonth} a month) until you cancel.
      Turn off auto-renew in your Apple ID settings at least 24 hours before the term ends.
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="press" onClick={() => open(TERMS_URL)} style={{ color: link, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
          Terms of Use
        </span>
        <span aria-hidden>·</span>
        <span className="press" onClick={() => open(PRIVACY_URL)} style={{ color: link, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
          Privacy Policy
        </span>
        <span aria-hidden>·</span>
        <span className="press" onClick={restore} style={{ color: link, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
          {restoring ? 'Restoring…' : 'Restore purchase'}
        </span>
      </div>
      {note && <div style={{ marginTop: 5 }}>{note}</div>}
    </div>
  );
}
