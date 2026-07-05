// OnboardingScreen — a short, personalized onboarding that sells the outcome
// and proves value BEFORE asking for an account (adapted from best-in-class
// flows): one question per screen, a progress bar, conversational copy, then a
// tailored plan recommendation + a founder's note. Users can skip anytime.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoButton } from '../components/Button';
import { PLANS, planPrice, fmtMoney } from '../data/plans';
import { haptic, hapticSelection, hapticNotify } from '../lib/haptics';

const DESTINATIONS = [
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'EU', label: 'Europe', flag: '🇪🇺' },
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JP', label: 'Japan', flag: '🇯🇵' },
  { code: 'AE', label: 'Middle East', flag: '🇦🇪' },
  { code: 'TH', label: 'Asia', flag: '🇹🇭' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
  { code: 'ALL', label: 'All over', flag: '🌍' },
];
const NEEDS = [
  { id: 'data', label: 'Mobile data', emoji: '📶' },
  { id: 'keep', label: 'Keep my number', emoji: '☎️' },
  { id: 'local', label: 'A local number', emoji: '📱' },
  { id: 'calls', label: 'Calls & texts', emoji: '💬' },
];
const FREQ = [
  { id: 'occasionally', label: 'Once in a while' },
  { id: 'few', label: 'A few times a year' },
  { id: 'monthly', label: 'Most months' },
  { id: 'abroad', label: 'I live abroad' },
];

function recommend(needs: string[], freq: string, destCount: number): string {
  if (freq === 'abroad') return 'unlimited';
  if (freq === 'monthly' || destCount >= 4 || needs.includes('data')) return 'pro';
  return 'plus';
}

interface Props {
  onExplore: (planId: string) => void; // finish → dashboard as guest
  onCreate: (planId: string) => void; // create account
  onBack: () => void; // exit to landing
}

export function OnboardingScreen({ onExplore, onCreate, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [dests, setDests] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [freq, setFreq] = useState<string>('');
  const total = 4;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => {
    hapticSelection();
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const next = () => { haptic('light'); setStep((s) => Math.min(total - 1, s + 1)); };
  const back = () => { haptic('light'); if (step === 0) onBack(); else setStep((s) => s - 1); };

  const plan = PLANS.find((p) => p.id === recommend(needs, freq, dests.length)) || PLANS[1];
  const nCountries = dests.includes('ALL') ? '180+' : String(Math.max(dests.length, 1) * 30);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: RC.bg }}>
      {/* Progress + back */}
      <div style={{ padding: '54px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={back} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex' }} aria-label="Back">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke={RC.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div style={{ flex: 1, height: 6, borderRadius: 6, background: RC.cream, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((step + 1) / total) * 100}%`, background: RC.grad, borderRadius: 6, transition: 'width 0.35s cubic-bezier(0.2,0,0,1)' }} />
        </div>
        {step < total - 1 && (
          <button onClick={() => onExplore(plan.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: RC.inkMute }}>Skip</button>
        )}
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 12px' }}>
        {step === 0 && (
          <Question title="Where do you travel?" sub="Pick every place you go — we'll cover them all on one plan.">
            <ChipGrid>
              {DESTINATIONS.map((d) => (
                <Chip key={d.code} on={dests.includes(d.code)} onClick={() => toggle(dests, setDests, d.code)}>
                  <span style={{ fontSize: 18 }}>{d.flag}</span> {d.label}
                </Chip>
              ))}
            </ChipGrid>
          </Question>
        )}
        {step === 1 && (
          <Question title="What do you need most?" sub="Choose as many as you like.">
            <ChipGrid>
              {NEEDS.map((n) => (
                <Chip key={n.id} on={needs.includes(n.id)} onClick={() => toggle(needs, setNeeds, n.id)}>
                  <span style={{ fontSize: 18 }}>{n.emoji}</span> {n.label}
                </Chip>
              ))}
            </ChipGrid>
          </Question>
        )}
        {step === 2 && (
          <Question title="How often are you away?" sub="So we size the right amount of data for you.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FREQ.map((f) => (
                <Chip key={f.id} on={freq === f.id} onClick={() => { hapticSelection(); setFreq(f.id); }} full>
                  {f.label}
                </Chip>
              ))}
            </div>
          </Question>
        )}
        {step === 3 && (
          <div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, color: RC.inkStrong, letterSpacing: 0.4, textTransform: 'uppercase' }}>Your plan</div>
            <div style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>
              You're set for <span style={{ background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{nCountries} countries.</span>
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 15, color: RC.inkMute, lineHeight: 1.55 }}>
              Based on your trips, <strong style={{ color: RC.ink }}>Ringo {plan.name}</strong> keeps you connected everywhere you go — no roaming, keep your number, one simple bill.
            </div>

            {/* recommended plan card */}
            <div style={{ marginTop: 18, borderRadius: 22, padding: '20px 20px', background: RC.grad, color: '#FFFDFB', boxShadow: '0 18px 40px -20px rgba(199,75,142,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, opacity: 0.9 }}>Recommended for you</div>
                <div style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.24)', fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>Best match</div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800 }}>Ringo {plan.name}</span>
                <span style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, opacity: 0.9 }}>{fmtMoney(planPrice(plan.id))}/mo</span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {[plan.highspeed === 'Unlimited' ? 'Unlimited high-speed data' : `${plan.highspeed} high-speed data`, '180+ countries · no roaming', needs.includes('keep') ? 'Keep your existing number' : 'Keep or add a number', 'Cancel anytime'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'var(--font)', fontSize: 13.5 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#FFFDFB" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* the real lever: concrete value vs roaming */}
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ borderRadius: 16, padding: '14px 14px', background: RC.paper, border: `1px solid ${RC.line}` }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: RC.inkMute, textTransform: 'uppercase', letterSpacing: 0.4 }}>Roaming</div>
                <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.inkMute, letterSpacing: -0.5 }}>~€10–15<span style={{ fontSize: 12, fontWeight: 600 }}>/day</span></div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute, lineHeight: 1.4 }}>Per country · bill shock · new SIM each trip</div>
              </div>
              <div style={{ borderRadius: 16, padding: '14px 14px', background: RC.gradSoft, border: `1.5px solid ${RC.inkStrong}` }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: RC.inkStrong, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ringo {plan.name}</div>
                <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, letterSpacing: -0.5 }}>{fmtMoney(planPrice(plan.id))}<span style={{ fontSize: 12, fontWeight: 600 }}>/mo</span></div>
                <div style={{ marginTop: 4, fontFamily: 'var(--font)', fontSize: 11.5, color: RC.ink, lineHeight: 1.4 }}>Flat · 180+ countries · keep your number</div>
              </div>
            </div>

            {/* founder's note — human touch */}
            <div style={{ marginTop: 16, borderRadius: 18, padding: 16, background: RC.paper, border: `1px solid ${RC.line}` }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, color: RC.ink, lineHeight: 1.6 }}>
                “We built Ringo so you never have to hunt for a SIM or fear a roaming bill again. One plan, your number, the whole world. Welcome aboard.”
              </div>
              <div style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Hippolyte</div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute }}>Founder, Ringo</div>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: '12px 22px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step < total - 1 ? (
          <RingoButton
            onClick={next}
            disabled={(step === 0 && dests.length === 0) || (step === 1 && needs.length === 0) || (step === 2 && !freq)}
          >
            Continue
          </RingoButton>
        ) : (
          <>
            <RingoButton onClick={() => { hapticNotify('success'); onExplore(plan.id); }}>Start exploring with {plan.name}</RingoButton>
            <button
              onClick={() => onCreate(plan.id)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.inkStrong }}
            >
              Create an account to save this
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Question({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.12 }}>{title}</div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 14.5, color: RC.inkMute, lineHeight: 1.5 }}>{sub}</div>
      <div style={{ marginTop: 22 }}>{children}</div>
    </div>
  );
}
function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>;
}
function Chip({ on, onClick, children, full }: { on: boolean; onClick: () => void; children: React.ReactNode; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="press"
      style={{
        gridColumn: full ? '1 / -1' : undefined,
        display: 'flex', alignItems: 'center', gap: 8, justifyContent: full ? 'flex-start' : 'flex-start',
        padding: '14px 14px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
        background: on ? RC.gradSoft : RC.paper,
        border: `1.5px solid ${on ? 'transparent' : RC.line}`,
        outline: on ? `1.5px solid ${RC.inkStrong}` : 'none',
        fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 600, color: RC.ink,
      }}
    >
      {children}
    </button>
  );
}
