// HelpScreen — the third tab: how the eSIM works, the setup guide, contact,
// the legal pages (the live ones on ringoesim.com, so they never drift from
// what the site says), and forgetting this phone's eSIM handle.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoCard } from '../components/Card';
import { RingoButton } from '../components/Button';
import { SectionTitle } from '../components/ui';
import { LinkRow } from './EsimScreen';
import { SITE, light } from '../api/light';
import { openInSheet } from '../lib/browser';
import { useAccount, account } from '../store/account';
import { manageSubscriptions, iapAvailable, useStoreStatus } from '../lib/iap';
import { PICTURE_CREDITS } from '../data/pictureCredits';
import { DESTINATIONS } from '../data/destinations';
import { hapticSelection } from '../lib/haptics';

const FAQ: { q: string; a: string }[] = [
  { q: 'Does my phone support eSIM?', a: 'Every iPhone from the XS and XR onwards does, as long as it is not carrier-locked. Check in Settings › General › About: if you see “Available SIM” or “Digital SIM”, you are set.' },
  { q: 'When should I install it?', a: 'Any time before you fly. Installing does not start the clock on a 30-day plan; the days start when the eSIM first connects at your destination.' },
  { q: 'Do I keep my own number?', a: 'Yes. Your own SIM stays in the phone for calls and texts; Ringo carries the data. In Settings › Mobile Data choose Ringo for data and turn Data Roaming on for it.' },
  { q: 'What if I run out of data?', a: 'Add 10 or 20 GB from My eSIM; it lands on the same eSIM within a minute. Unlimited plans follow the fair use policy in the Terms.' },
  { q: 'How do I pay, and how do I cancel a renewing plan?', a: 'Every plan is bought through the App Store with your Apple ID. A renewing plan renews automatically until you cancel it in Settings › Apple ID › Subscriptions, at least 24 hours before the period ends. One-payment plans never renew.' },
  { q: 'Can I get a refund?', a: 'Before the eSIM is installed and used, yes, within 14 days. Once it is installed and used, plans are non-refundable; see the Terms. Purchases are billed by Apple, so refund requests go through reportaproblem.apple.com.' },
];

export function HelpScreen({ onLogin }: { onLogin: () => void }) {
  const acct = useAccount();
  const storeStatus = useStoreStatus();
  const [open, setOpen] = useState<number | null>(null);
  const [credits, setCredits] = useState(false);
  const [deleting, setDeleting] = useState<'idle' | 'confirm' | 'busy' | 'done' | 'failed'>('idle');

  // Delete the account (App Review 5.1.1(v)): the site replaces every
  // identifier on the person's rows; the eSIM on the phone keeps working.
  const deleteAccount = async () => {
    if (!acct) return;
    setDeleting('busy');
    try {
      await light.deleteAccount(acct.userId, acct.t);
      account.forget();
      setDeleting('done');
    } catch {
      setDeleting('failed');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Help" />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 130px' }}>
        <SectionTitle>Common questions</SectionTitle>
        <RingoCard style={{ padding: 0 }}>
          {FAQ.map((f, i) => (
            <div key={f.q} style={{ borderBottom: i === FAQ.length - 1 ? 'none' : `1px solid ${RC.line}` }}>
              <button className="press" onClick={() => { hapticSelection(); setOpen(open === i ? null : i); }} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink }}>{f.q}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ transform: open === i ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><path d="M6 3l5 5-5 5" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {open === i && <div style={{ padding: '0 16px 14px', fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.55 }}>{f.a}</div>}
            </div>
          ))}
        </RingoCard>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Guides and contact</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            <LinkRow label="Setup guide" sub="Install and switch on, step by step" onClick={() => void openInSheet(`${SITE}/esim-setup.html`)} />
            <LinkRow label="Contact Ringo" sub="We answer by email, usually the same day" onClick={() => void openInSheet(`${SITE}/contact`)} />
            <LinkRow label="Manage subscriptions" sub={`Your Apple ID subscriptions${iapAvailable() ? ` · ${storeStatus.error ? `App Store: ${storeStatus.error}` : storeStatus.checked ? (storeStatus.available > 0 ? 'App Store connected' : 'App Store: no products available') : 'checking the App Store'}` : ''}`} onClick={() => void manageSubscriptions()} last />
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Legal</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            <LinkRow label="Terms of Use" onClick={() => void openInSheet(`${SITE}/terms`)} />
            <LinkRow label="Privacy Policy" onClick={() => void openInSheet(`${SITE}/privacy`)} last />
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Account</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            {acct ? (
              <>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${RC.line}`, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute }}>
                  Logged in as <span style={{ color: RC.ink, fontWeight: 600 }}>{acct.email || 'this account'}</span>
                </div>
                <LinkRow label="Log out" sub="Removes your eSIM details from this phone only" onClick={() => { hapticSelection(); account.forget(); }} />
                {deleting === 'confirm' ? (
                  <div style={{ padding: '14px 16px', fontFamily: 'var(--font)', fontSize: 13.5, color: RC.ink, lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700 }}>Delete your account?</div>
                    <div style={{ marginTop: 4, color: RC.inkMute }}>Your email and details are removed from Ringo and we stop writing to you. An eSIM already on your phone keeps working until it runs out; it cannot be resent or topped up afterwards.</div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      <RingoButton size="sm" variant="ghost" full={false} onClick={() => setDeleting('idle')}>Keep it</RingoButton>
                      <RingoButton size="sm" full={false} onClick={() => void deleteAccount()}>Delete my account</RingoButton>
                    </div>
                  </div>
                ) : (
                  <LinkRow label={deleting === 'busy' ? 'Deleting…' : deleting === 'failed' ? 'Could not delete, try again' : 'Delete my account'} sub="Removes your email and details from Ringo" onClick={() => { hapticSelection(); if (deleting !== 'busy') setDeleting('confirm'); }} last />
                )}
              </>
            ) : deleting === 'done' ? (
              <div style={{ padding: '14px 16px', fontFamily: 'var(--font)', fontSize: 13.5, color: '#1F7A4E', fontWeight: 600 }}>Your account has been deleted.</div>
            ) : (
              <LinkRow label="Log in" sub="With the email you bought with" onClick={onLogin} last />
            )}
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Photo credits</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            <LinkRow label={credits ? 'Hide the list' : 'Destination photographs'} sub="Wikimedia Commons and NASA, with their licences" onClick={() => { hapticSelection(); setCredits((c) => !c); }} last={!credits} />
            {credits && (
              <div style={{ padding: '4px 16px 14px', fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute, lineHeight: 1.6 }}>
                {DESTINATIONS.map((d) => { const c = PICTURE_CREDITS[d.id]; return c ? <div key={d.id}><span style={{ color: RC.ink, fontWeight: 600 }}>{d.label}:</span> {c.title.replace(/\.[a-z]+$/i, '')}, {c.artist || 'unknown author'}, {c.license}</div> : null; })}
              </div>
            )}
          </RingoCard>
        </div>

        <div style={{ marginTop: 26, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.6 }}>
          Ringo Ltd, 86-90 Paul Street, London EC2A 4NE<br />
          Company 16972659 · Ringo {import.meta.env.VITE_APP_VERSION || '1.0'}
        </div>
      </div>
    </div>
  );
}
