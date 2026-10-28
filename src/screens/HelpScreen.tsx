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
import { pushAvailable, unregisterPush, openPushSettings } from '../lib/push';
import { useLayout, contentColumn, cardGrid, TABBAR_CLEARANCE } from '../lib/layout';
import { t, tn, tk, i18n, LANGS, useLang } from '../lib/i18n';

/** Read by LandingScreen once, to say the account was deleted. */
export const ACCOUNT_DELETED_KEY = 'ringo_account_deleted';
/** Read by App once: a language picked here re-renders the app on Help, not the store. */
export const LANG_RETURN_KEY = 'ringo_lang_return';

const FAQ: { q: string; a: string }[] = [
  { q: tk('Does my phone support eSIM?'), a: tk('Every iPhone from the XS and XR onwards does, including iPhone Duo, as long as it is not carrier locked. In Settings › General › About, look for “Available SIM” or “Digital SIM”.') },
  { q: tk('When should I install it?'), a: tk('Any time before you fly. Installing does not start the clock: the days start when the eSIM first connects at your destination.') },
  { q: tk('Do I keep my own number?'), a: tk('Yes. Your own SIM stays for calls and texts and Ringo carries the data. In Settings › Mobile Data choose Ringo for data and turn Data Roaming on for it.') },
  { q: tk('What if I need more data?'), a: tk('Add more from My eSIM. It lands on the same eSIM within a minute.') },
  { q: tk('How do I pay, and how do I cancel a renewing plan?'), a: tk('By card, in a secure payment sheet right here in the app: any card from any country. Global renews every month until you turn renewal off under My eSIM, and you keep the month you paid for. A plan bought earlier through the App Store is cancelled in Settings › Apple ID › Subscriptions. One payment plans never renew.') },
];

const photo = (id: string) => bundledPictureFor(id) ?? pictureFor(id);

/** One photograph's attribution; a composite names each of its parts. */
function creditLine(c: PictureCredit): string {
  const one = (p: PictureCredit) => [p.title.replace(/\.[a-z]+$/i, ''), p.artist || t('unknown author'), p.license].filter(Boolean).join(', ');
  return c.parts?.length ? `${c.title}: ${c.parts.map(one).join('; ')}` : one(c);
}

const Chevron = ({ open = false }: { open?: boolean }) => (
  <svg className={open ? undefined : 'flip-rtl'} width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }}>
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
        width: '100%', minHeight: 56, boxSizing: 'border-box', textAlign: 'start', cursor: disabled ? 'default' : 'pointer',
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

export function HelpScreen({ onLogin, onProfile, onWaitlist }: { onLogin: () => void; onProfile: () => void; onWaitlist: () => void }) {
  const l = useLayout();
  const acct = useAccount();
  const storeStatus = useStoreStatus();
  const [open, setOpen] = useState<number | null>(null);
  const [credits, setCredits] = useState(false);
  const destinations = useDestinations();
  const [deleting, setDeleting] = useState<'idle' | 'confirm' | 'busy' | 'failed'>('idle');
  const [signingOut, setSigningOut] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  useLang();
  const chosenLang = i18n.chosen();

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
    ? (storeStatus.error ? `App Store: ${storeStatus.error}` : t('App Store: no products available'))
    : undefined;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', paddingBottom: TABBAR_CLEARANCE }}>
        <div style={{ ...contentColumn(l), paddingTop: 'max(54px, calc(env(safe-area-inset-top, 0px) + 12px))', paddingBottom: 24 }}>
          <ScreenTitle sub={t('Answers, guides and your account.')}>{t('Help')}</ScreenTitle>

          <div style={{ ...cardGrid(l, { min: 300, phoneMin: l.isCover ? undefined : 150 }), marginTop: 8 }}>
            <PhotoCard
              id="contact"
              name={t('Talk to us')}
              photo={photo('japan')}
              size={l.size === 'phone' ? 'tile' : 'big'}
              aspect={l.isCover ? '2 / 1' : undefined}
              what={t('Write to us and a person answers.')}
              onClick={() => { hapticSelection(); void openInSheet(`${SITE}/contact?app=1`); }}
              ariaLabel={t('Contact Ringo')}
            />
            <PhotoCard
              id="setup"
              name={t('Setup guide')}
              photo={photo('iceland')}
              size={l.size === 'phone' ? 'tile' : 'big'}
              aspect={l.isCover ? '2 / 1' : undefined}
              what={t('Install your eSIM step by step.')}
              onClick={() => { hapticSelection(); void openInSheet(`${SITE}/esim-setup.html`); }}
              ariaLabel={t('Open the setup guide')}
            />
          </div>

          <div style={{ marginTop: l.sectionGap }}>
            <Group title={t('Common questions')}>
              {FAQ.map((f, i) => {
                const isOpen = open === i;
                return (
                  <div key={f.q} style={{ borderBottom: i === FAQ.length - 1 ? 'none' : `1px solid ${RC.line}` }}>
                    <button
                      className="press"
                      aria-expanded={isOpen}
                      onClick={() => { hapticSelection(); setOpen(isOpen ? null : i); }}
                      style={{ width: '100%', minHeight: 56, boxSizing: 'border-box', textAlign: 'start', cursor: 'pointer', border: 'none', background: 'transparent', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span style={{ flex: 1, ...TYPE.h3, fontWeight: 600, color: RC.ink }}>{t(f.q)}</span>
                      <Chevron open={isOpen} />
                    </button>
                    {isOpen && <p style={{ margin: 0, padding: '0 16px 16px', ...TYPE.small, fontSize: 16, lineHeight: 1.55, color: RC.ink2 }}>{t(f.a)}</p>}
                  </div>
                );
              })}
            </Group>
          </div>

          <div style={{ ...cardGrid(l, { min: 340 }), gap: l.isWide ? 24 : l.sectionGap, marginTop: l.sectionGap, alignItems: 'start' }}>
            {pushAvailable() && (
              <Group title={t('Notifications')}>
                <PushSwitches />
              </Group>
            )}

            <Group title={t('Language')}>
              <HelpRow
                label={langOpen ? t('Hide languages') : (chosenLang ? LANGS.find((x) => x.code === chosenLang)?.name ?? '' : t('Same as my phone'))}
                sub={langOpen ? undefined : t('App language')}
                onClick={() => { hapticSelection(); setLangOpen((o) => !o); }}
                last={!langOpen}
              />
              {langOpen && [{ code: 'auto' as const, name: t('Same as my phone') }, ...LANGS].map((x) => {
                const on = x.code === 'auto' ? !chosenLang : chosenLang === x.code;
                return (
                  <button
                    key={x.code}
                    className="press"
                    role="radio"
                    aria-checked={on}
                    lang={x.code === 'auto' ? undefined : x.code}
                    onClick={() => { hapticSelection(); try { sessionStorage.setItem(LANG_RETURN_KEY, 'help'); } catch { /* ignore */ } i18n.set(x.code); }}
                    style={{ width: '100%', minHeight: 48, boxSizing: 'border-box', textAlign: 'start', cursor: 'pointer', border: 'none', borderTop: `1px solid ${RC.line}`, background: 'transparent', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <span style={{ flex: 1, ...TYPE.body, fontWeight: on ? 700 : 500, color: RC.ink }}>{x.name}</span>
                    {on && <span aria-hidden style={{ fontWeight: 800, color: RC.tick }}>✓</span>}
                  </button>
                );
              })}
              {/* The same choice lives in iOS Settings for Ringo; a change there wins (owner 2026-10-28). */}
              {langOpen && pushAvailable() && (
                <div style={{ borderTop: `1px solid ${RC.line}` }}>
                  <HelpRow label={t('Change it in iPhone Settings')} sub={t('Settings, Ringo, Language')} onClick={() => void openPushSettings()} last />
                </div>
              )}
            </Group>

            <Group title={t('Account')}>
              {acct ? (
                <>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${RC.line}`, ...TYPE.small, color: RC.ink2, overflowWrap: 'anywhere' }}>
                    {tn('Signed in as {email}', { email: <span style={{ color: RC.ink, fontWeight: 600 }}>{acct.email || t('this account')}</span> })}
                  </div>
                  <HelpRow label={t('My profile')} onClick={() => { hapticSelection(); onProfile(); }} />
                  <HelpRow label={signingOut ? t('Signing out…') : t('Sign out')} disabled={signingOut} onClick={() => void signOut()} />
                  {deleting === 'confirm' || deleting === 'busy' ? (
                    <div style={{ padding: 16 }}>
                      <div style={{ ...TYPE.h3, color: RC.ink }}>{t('Delete your account?')}</div>
                      <p style={{ margin: '6px 0 0', ...TYPE.small, color: RC.ink2 }}>
                        {t('Your email and details are removed from Ringo and we stop writing to you. An eSIM already on your phone keeps working until it runs out, but it cannot be resent or topped up.')}
                      </p>
                      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ flex: '1 1 140px' }}>
                          <RingoButton size="sm" variant="secondary" disabled={deleting === 'busy'} onClick={() => setDeleting('idle')}>{t('Keep it')}</RingoButton>
                        </div>
                        <div style={{ flex: '1 1 140px' }}>
                          <RingoButton size="sm" loading={deleting === 'busy'} onClick={() => void deleteAccount()} style={{ background: RC.error, boxShadow: 'none' }}>{t('Delete')}</RingoButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {deleting === 'failed' && <ErrorBox style={{ margin: '12px 16px 0' }}>{t('We could not delete your account just now. Please try again.')}</ErrorBox>}
                      <HelpRow label={t('Delete my account')} danger onClick={() => { hapticSelection(); setDeleting('confirm'); }} last />
                    </>
                  )}
                </>
              ) : (
                <HelpRow label={t('Sign in')} onClick={onLogin} last />
              )}
            </Group>

            {/* The full Ringo service (not launched), apart from Ringo Light. */}
            <Group title={t('Coming next from Ringo')}>
              <HelpRow label={t('Your number, every country')} sub={t('Join the free waitlist and help shape it.')} onClick={() => { hapticSelection(); onWaitlist(); }} last />
            </Group>

            <Group title={t('Plans and legal')}>
              <HelpRow label={t('Manage subscriptions')} sub={storeNote} onClick={() => void manageSubscriptions()} />
              <HelpRow label={t('Terms of Use')} onClick={() => void openInSheet(`${SITE}/terms?app=1`)} />
              <HelpRow label={t('Privacy Policy')} onClick={() => void openInSheet(`${SITE}/privacy?app=1`)} last />
            </Group>

            <Group title={t('Photo credits')}>
              <HelpRow label={credits ? t('Hide the list') : t('Destination photographs')} onClick={() => { hapticSelection(); setCredits((c) => !c); }} last={!credits} />
              {credits && (
                <div style={{ padding: '6px 16px 16px', ...TYPE.caption, fontWeight: 400, lineHeight: 1.6, color: RC.inkMute }}>
                  {destinations.map((d) => { const c = PICTURE_CREDITS[d.id]; return c ? <div key={d.id}><span style={{ color: RC.ink, fontWeight: 600 }}>{d.label}:</span> {creditLine(c)}</div> : null; })}
                  {Object.keys(BUNDLED_PICTURE_CREDITS).length > 0 && <div style={{ marginTop: 8, color: RC.ink, fontWeight: 600 }}>{t('Offline pictures')}</div>}
                  {Object.entries(BUNDLED_PICTURE_CREDITS).map(([id, c]) => <div key={`b-${id}`}><span style={{ color: RC.ink, fontWeight: 600 }}>{destinationFrom(destinations, id)?.label || id}:</span> {creditLine(c)}</div>)}
                </div>
              )}
            </Group>
          </div>

          <p style={{ margin: `${l.sectionGap}px 0 0`, textAlign: 'center', ...TYPE.caption, fontWeight: 400, lineHeight: 1.6, color: RC.inkMute }}>
            Ringo Ltd, 86-90 Paul Street, London EC2A 4NE<br />
            {t('Company')} 16972659 · Ringo {import.meta.env.VITE_APP_VERSION || '1.0'}
          </p>
        </div>
      </div>
    </div>
  );
}
