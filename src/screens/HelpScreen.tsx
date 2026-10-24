// HelpScreen: the Help tab. Two photo cards (contact, setup guide), the common
// questions, notification switches, the account (sign out, delete), the legal
// pages (the live ones on ringoesim.com, so they never drift from the site)
// and the photo credits. On a wide screen (iPhone Duo open) the groups sit in
// two columns.
import { CARD_PAYMENTS } from '../lib/cardPay';
import { useState, type ReactNode } from 'react';
import { RC, TYPE, cardSurface } from '../theme';
import { RingoButton } from '../components/Button';
import { ScreenTitle, SectionHead, PhotoCard, ErrorBox } from '../components/ui';
import { SITE, light } from '../api/light';
import { openInSheet } from '../lib/browser';
import { useAccount, account } from '../store/account';
import { manageSubscriptions, iapAvailable, useStoreStatus } from '../lib/iap';
import { PICTURE_CREDITS, BUNDLED_PICTURE_CREDITS, type PictureCredit } from '../data/pictureCredits';
import { bundledPictureFor, pictureFor } from '../data/destinations';
import { useDestinations, destinationFrom } from '../store/destinations';
import { hapticNotify, hapticSelection } from '../lib/haptics';
import { PushSwitches } from '../components/PushControls';
import { pushAvailable, unregisterPush } from '../lib/push';
import { useLayout, contentColumn, cardGrid, TABBAR_CLEARANCE } from '../lib/layout';

/** Read by LandingScreen once, to say the account was deleted. */
export const ACCOUNT_DELETED_KEY = 'ringo_account_deleted';

const FAQ: { q: string; a: string }[] = [
  { q: 'Does my phone support eSIM?', a: 'Every iPhone from the XS and XR onwards does, including iPhone Duo, as long as it is not carrier locked. In Settings › General › About, look for “Available SIM” or “Digital SIM”.' },
  { q: 'When should I install it?', a: 'Any time before you fly. Installing does not start the clock: the days start when the eSIM first connects at your destination.' },
  { q: 'Do I keep my own number?', a: 'Yes. Your own SIM stays for calls and texts and Ringo carries the data. In Settings › Mobile Data choose Ringo for data and turn Data Roaming on for it.' },
  { q: 'What if I need more data?', a: 'Add more from My eSIM. It lands on the same eSIM within a minute.' },
  { q: 'How do I pay, and how do I cancel a renewing plan?', a: 'By card or Apple Pay, on a secure Stripe page: any card from any country. Global renews every month until you turn renewal off under My eSIM, and you keep the month you paid for. A plan bought earlier through the App Store is cancelled in Settings › Apple ID › Subscriptions. One payment plans never renew.' },
];

const photo = (id: string) => bundledPictureFor(id) ?? pictureFor(id);

/** One photograph's attribution; a composite names each of its parts. */
function creditLine(c: PictureCredit): string {
  const one = (p: PictureCredit) => [p.title.replace(/\.[a-z]+$/i, ''), p.artist || 'unknown author', p.license].filter(Boolean).join(', ');
  return c.parts?.length ? `${c.title}: ${c.parts.map(one).join('; ')}` : one(c);
}

const Chevron = ({ open = false }: { open?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
    <path d="M6 3l5 5-5 5" stroke={RC.inkDeco} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** A tappable list row: 17/600 label, optional 15 ink2 line, 56pt tall. */
function HelpRow({ label, sub, onClick, last, danger, disabled }: { label: string; sub?: string; onClick: () => void; last?: boolean; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      className={disabled ? undefined : 'press'}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%', minHeight: 56, boxSizing: 'border-box', textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
        border: 'none', borderBottom: last ? 'none' : `1px solid ${RC.line}`, background: 'transparent',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', ...TYPE.h3, fontWeight: 600, color: danger ? RC.error : RC.ink }}>{label}</span>
        {sub && <span style={{ display: 'block', ...TYPE.small, color: RC.ink2, marginTop: 2 }}>{sub}</span>}
      </span>
      {!danger && <Chevron />}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <SectionHead title={title} as="h2" style={{ marginBottom: 12 }} />
      <div style={{ ...cardSurface(), overflow: 'hidden' }}>{children}</div>
    </section>
  );
}

export function HelpScreen({ onLogin, onProfile }: { onLogin: () => void; onProfile: () => void }) {
  const l = useLayout();
  const acct = useAccount();
  const storeStatus = useStoreStatus();
  const [open, setOpen] = useState<number | null>(null);
  const [credits, setCredits] = useState(false);
  const destinations = useDestinations();
  const [deleting, setDeleting] = useState<'idle' | 'confirm' | 'busy' | 'failed'>('idle');
  const [signingOut, setSigningOut] = useState(false);

  // Sign out: this phone's token stops receiving the account's pushes first.
  const signOut = async () => {
    if (signingOut) return;
    hapticSelection();
    setSigningOut(true);
    await unregisterPush();
    account.forget();
  };

  // Delete the account (App Review 5.1.1(v)): the site replaces every
  // identifier on the person's rows; the eSIM on the phone keeps working.
  // Forgetting the account returns the app to the sign-in screen, which says
  // the account was deleted.
  const deleteAccount = async () => {
    if (!acct || deleting === 'busy') return;
    setDeleting('busy');
    try {
      await unregisterPush();
      await light.deleteAccount(acct.userId, acct.t);
      try { sessionStorage.setItem(ACCOUNT_DELETED_KEY, '1'); } catch { /* ignore */ }
      hapticNotify('success');
      account.forget();
    } catch {
      hapticNotify('error');
      setDeleting('failed');
    }
  };

  const storeNote = !CARD_PAYMENTS && iapAvailable() && (storeStatus.error || (storeStatus.checked && storeStatus.available === 0))
    ? (storeStatus.error ? `App Store: ${storeStatus.error}` : 'App Store: no products available')
    : undefined;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: TABBAR_CLEARANCE }}>
        <div style={{ ...contentColumn(l), paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 12px))', paddingBottom: 24 }}>
          <ScreenTitle sub="Answers, guides and your account.">Help</ScreenTitle>

          <div style={{ ...cardGrid(l, { min: 300, phoneMin: l.isCover ? undefined : 150 }), marginTop: 8 }}>
            <PhotoCard
              id="contact"
              name="Talk to us"
              photo={photo('japan')}
              size={l.size === 'phone' ? 'tile' : 'big'}
              aspect={l.isCover ? '2 / 1' : undefined}
              what="Write to us and a person answers."
              onClick={() => { hapticSelection(); void openInSheet(`${SITE}/contact?app=1`); }}
              ariaLabel="Contact Ringo"
            />
            <PhotoCard
              id="setup"
              name="Setup guide"
              photo={photo('iceland')}
              size={l.size === 'phone' ? 'tile' : 'big'}
              aspect={l.isCover ? '2 / 1' : undefined}
              what="Install your eSIM step by step."
              onClick={() => { hapticSelection(); void openInSheet(`${SITE}/esim-setup.html`); }}
              ariaLabel="Open the setup guide"
            />
          </div>

          <div style={{ marginTop: l.sectionGap }}>
            <Group title="Common questions">
              {FAQ.map((f, i) => {
                const isOpen = open === i;
                return (
                  <div key={f.q} style={{ borderBottom: i === FAQ.length - 1 ? 'none' : `1px solid ${RC.line}` }}>
                    <button
                      className="press"
                      aria-expanded={isOpen}
                      onClick={() => { hapticSelection(); setOpen(isOpen ? null : i); }}
                      style={{ width: '100%', minHeight: 56, boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span style={{ flex: 1, ...TYPE.h3, fontWeight: 600, color: RC.ink }}>{f.q}</span>
                      <Chevron open={isOpen} />
                    </button>
                    {isOpen && <p style={{ margin: 0, padding: '0 16px 16px', ...TYPE.small, fontSize: 16, lineHeight: 1.55, color: RC.ink2 }}>{f.a}</p>}
                  </div>
                );
              })}
            </Group>
          </div>

          <div style={{ ...cardGrid(l, { min: 340 }), gap: l.isWide ? 24 : l.sectionGap, marginTop: l.sectionGap, alignItems: 'start' }}>
            {pushAvailable() && (
              <Group title="Notifications">
                <PushSwitches />
              </Group>
            )}

            <Group title="Account">
              {acct ? (
                <>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${RC.line}`, ...TYPE.small, color: RC.ink2, overflowWrap: 'anywhere' }}>
                    Signed in as <span style={{ color: RC.ink, fontWeight: 600 }}>{acct.email || 'this account'}</span>
                  </div>
                  <HelpRow label="My profile" onClick={() => { hapticSelection(); onProfile(); }} />
                  <HelpRow label={signingOut ? 'Signing out…' : 'Sign out'} disabled={signingOut} onClick={() => void signOut()} />
                  {deleting === 'confirm' || deleting === 'busy' ? (
                    <div style={{ padding: 16 }}>
                      <div style={{ ...TYPE.h3, color: RC.ink }}>Delete your account?</div>
                      <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>
                        Your email and details are removed from Ringo and we stop writing to you. An eSIM already on your phone keeps working until it runs out, but it cannot be resent or topped up.
                      </p>
                      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ flex: '1 1 140px' }}>
                          <RingoButton size="sm" variant="secondary" disabled={deleting === 'busy'} onClick={() => setDeleting('idle')}>Keep it</RingoButton>
                        </div>
                        <div style={{ flex: '1 1 140px' }}>
                          <RingoButton size="sm" loading={deleting === 'busy'} onClick={() => void deleteAccount()} style={{ background: RC.error, boxShadow: 'none' }}>Delete</RingoButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {deleting === 'failed' && <ErrorBox style={{ margin: '12px 16px 0' }}>We could not delete your account just now. Please try again.</ErrorBox>}
                      <HelpRow label="Delete my account" danger onClick={() => { hapticSelection(); setDeleting('confirm'); }} last />
                    </>
                  )}
                </>
              ) : (
                <HelpRow label="Sign in" onClick={onLogin} last />
              )}
            </Group>

            <Group title="Plans and legal">
              <HelpRow label="Manage subscriptions" sub={storeNote} onClick={() => void manageSubscriptions()} />
              <HelpRow label="Terms of Use" onClick={() => void openInSheet(`${SITE}/terms?app=1`)} />
              <HelpRow label="Privacy Policy" onClick={() => void openInSheet(`${SITE}/privacy?app=1`)} last />
            </Group>

            <Group title="Photo credits">
              <HelpRow label={credits ? 'Hide the list' : 'Destination photographs'} onClick={() => { hapticSelection(); setCredits((c) => !c); }} last={!credits} />
              {credits && (
                <div style={{ padding: '6px 16px 16px', ...TYPE.caption, fontWeight: 400, lineHeight: 1.6, color: RC.inkMute }}>
                  {destinations.map((d) => { const c = PICTURE_CREDITS[d.id]; return c ? <div key={d.id}><span style={{ color: RC.ink, fontWeight: 600 }}>{d.label}:</span> {creditLine(c)}</div> : null; })}
                  {Object.keys(BUNDLED_PICTURE_CREDITS).length > 0 && <div style={{ marginTop: 8, color: RC.ink, fontWeight: 600 }}>Offline pictures</div>}
                  {Object.entries(BUNDLED_PICTURE_CREDITS).map(([id, c]) => <div key={`b-${id}`}><span style={{ color: RC.ink, fontWeight: 600 }}>{destinationFrom(destinations, id)?.label || id}:</span> {creditLine(c)}</div>)}
                </div>
              )}
            </Group>
          </div>

          <p style={{ margin: `${l.sectionGap}px 0 0`, textAlign: 'center', ...TYPE.caption, fontWeight: 400, lineHeight: 1.6, color: RC.inkMute }}>
            Ringo Ltd, 86-90 Paul Street, London EC2A 4NE<br />
            Company 16972659 · Ringo {import.meta.env.VITE_APP_VERSION || '1.0'}
          </p>
        </div>
      </div>
    </div>
  );
}
