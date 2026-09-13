// HelpScreen — the third tab: how the eSIM works, the setup guide, contact,
// the legal pages (the live ones on ringoesim.com, so they never drift from
// what the site says), and forgetting this phone's eSIM handle.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoCard } from '../components/Card';
import { SectionTitle } from '../components/ui';
import { LinkRow } from './EsimScreen';
import { SITE } from '../api/light';
import { openInSheet } from '../lib/browser';
import { useAccount, account } from '../store/account';
import { hapticSelection } from '../lib/haptics';

const FAQ: { q: string; a: string }[] = [
  { q: 'Does my phone support eSIM?', a: 'Every iPhone from the XS and XR onwards does, as long as it is not carrier-locked. Check in Settings › General › About: if you see “Available SIM” or “Digital SIM”, you are set.' },
  { q: 'When should I install it?', a: 'Any time before you fly. Installing does not start the clock on a 30-day plan; the days start when the eSIM first connects at your destination.' },
  { q: 'Do I keep my own number?', a: 'Yes. Your own SIM stays in the phone for calls and texts; Ringo carries the data. In Settings › Mobile Data choose Ringo for data and turn Data Roaming on for it.' },
  { q: 'What if I run out of data?', a: 'Add 10 or 20 GB from My eSIM; it lands on the same eSIM within a minute. Unlimited plans follow the fair use policy in the Terms.' },
  { q: 'Can I get a refund?', a: 'Before the eSIM is installed and used, yes, within 14 days. Once it is installed and used, plans are non-refundable; see the Terms.' },
];

export function HelpScreen() {
  const acct = useAccount();
  const [open, setOpen] = useState<number | null>(null);
  const [forgot, setForgot] = useState(false);

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
            <LinkRow label="ringoesim.com" sub="Plans, destinations and the blog" onClick={() => void openInSheet(SITE)} last />
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Legal</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            <LinkRow label="Terms and Conditions" onClick={() => void openInSheet(`${SITE}/terms`)} />
            <LinkRow label="Privacy Policy" onClick={() => void openInSheet(`${SITE}/privacy`)} last />
          </RingoCard>
        </div>

        {acct && (
          <div style={{ marginTop: 22 }}>
            <SectionTitle>This phone</SectionTitle>
            <RingoCard style={{ padding: 0 }}>
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${RC.line}`, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute }}>
                eSIM shown for <span style={{ color: RC.ink, fontWeight: 600 }}>{acct.email || 'this account'}</span>
              </div>
              <LinkRow label={forgot ? 'Forgotten' : 'Forget this eSIM on this phone'} sub="Removes the handle from this phone only. Your eSIM and email stay." onClick={() => { if (forgot) return; account.forget(); setForgot(true); }} last />
            </RingoCard>
          </div>
        )}

        <div style={{ marginTop: 26, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.6 }}>
          Ringo Ltd, 86-90 Paul Street, London EC2A 4NE<br />
          Company 16972659 · Ringo {import.meta.env.VITE_APP_VERSION || '1.0'}
        </div>
      </div>
    </div>
  );
}
