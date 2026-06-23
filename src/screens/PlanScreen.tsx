// PlanScreen — plan & billing. Real Ringo lineup with a selectable picker,
// fair-use ring, add-ons and recent invoices.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoButton } from '../components/Button';
import { RingoCard } from '../components/Card';
import { BackBtn, Row, SectionTitle } from '../components/ui';
import { useRingoState } from '../store/store';
import { PLANS } from '../data/plans';

interface PlanScreenProps {
  onBack: () => void;
  onInstall: () => void;
  onSwitchPlan?: (id: string) => void;
}

export function PlanScreen({ onBack, onInstall, onSwitchPlan }: PlanScreenProps) {
  const { state, actions } = useRingoState();
  const currentId = state.planId;
  const [selected, setSelected] = useState(currentId);
  const cur = PLANS.find((p) => p.id === selected) || PLANS[0];
  const isCurrent = (id: string) => id === currentId;

  const ADDONS = [
    { id: 'ie-number', icon: 'call' as const, title: 'Extra Ireland number', sub: 'A second local number · +£3/mo' },
    { id: 'tether', icon: 'hotspot' as const, title: 'Office tether', sub: 'Unlimited tethering · +£5/mo' },
    { id: 'always5g', icon: 'speed' as const, title: 'Always 5G', sub: 'Skip fair-use throttle · +£9/mo' },
  ];
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const toggleAddon = (id: string) => setAddons((a) => ({ ...a, [id]: !a[id] }));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Plan" leading={<BackBtn onClick={onBack} />} />

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 120px' }}>
        {/* Plan hero — reflects selected plan */}
        <div style={{ borderRadius: 28, padding: '24px 22px', background: RC.grad, color: '#FFFDFB', boxShadow: '0 30px 60px -24px rgba(248,80,96,0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,253,251,0.13)' }} />
          <div style={{ position: 'absolute', right: 30, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,253,251,0.10)' }} />

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, opacity: 0.85 }}>Ringo {cur.name}</div>
              {isCurrent(cur.id) && (
                <span style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(255,253,251,0.24)', fontFamily: 'var(--font)', fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>Current</span>
              )}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font)', fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>£{cur.price}</span>
              <span style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 500, opacity: 0.85 }}>/ month</span>
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 400, opacity: 0.9, lineHeight: 1.5 }}>
              {cur.highspeed === 'Unlimited'
                ? 'Truly unlimited high-speed data in 180+ countries. No fair-use throttle. Cancel any time.'
                : `${cur.highspeed} high-speed data in 180+ countries, then unlimited at standard speed. Cancel any time.`}
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[cur.highspeed === 'Unlimited' ? 'Unlimited 5G' : `${cur.highspeed} high-speed`, '180+ countries', 'Multi-number'].map((t) => (
                <div key={t} style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,253,251,0.22)', fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600 }}>{t}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan picker */}
        <div style={{ marginTop: 22 }}>
          <SectionTitle>Choose your plan</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PLANS.map((p) => {
              const sel = p.id === selected;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  style={{
                    borderRadius: 20, padding: '16px 18px', cursor: 'pointer',
                    background: sel ? RC.gradSoft : RC.paper,
                    border: `1.5px solid ${sel ? 'transparent' : RC.line}`,
                    outline: sel ? `1.5px solid ${RC.inkStrong}` : 'none',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* radio */}
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        border: sel ? 'none' : `2px solid ${RC.lineStrong}`,
                        background: sel ? RC.grad : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {sel && (
                        <svg width="11" height="11" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-6" stroke="#FFFDFB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 600, color: RC.ink, letterSpacing: -0.2 }}>{p.name}</span>
                        {p.popular && (
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: RC.grad, color: '#FFFDFB', fontFamily: 'var(--font)', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Popular</span>
                        )}
                        {isCurrent(p.id) && (
                          <span style={{ padding: '2px 8px', borderRadius: 999, background: RC.cream, color: RC.inkStrong, fontFamily: 'var(--font)', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Current</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute, fontWeight: 500, marginTop: 1 }}>
                        {p.highspeed === 'Unlimited' ? 'Unlimited high-speed' : `${p.highspeed} high-speed`} · {p.tagline}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 20, fontWeight: 700, color: RC.inkStrong, letterSpacing: -0.5, lineHeight: 1 }}>£{p.price}</div>
                      <div style={{ fontFamily: 'var(--font)', fontSize: 10.5, color: RC.inkMute, fontWeight: 500 }}>/mo</div>
                    </div>
                  </div>
                  {sel && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${RC.lineStrong}` }}>
                      {p.feats.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M5 13l4 4L19 7" stroke={RC.inkStrong} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 500, color: RC.ink }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!isCurrent(cur.id) && (
            <div style={{ marginTop: 14 }}>
              <RingoButton onClick={() => { actions.switchPlan(cur.id); if (onSwitchPlan) onSwitchPlan(cur.id); }}>
                Switch to {cur.name} — £{cur.price}/mo
              </RingoButton>
            </div>
          )}
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>This month</SectionTitle>
          <RingoCard style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: `conic-gradient(#FF7A2F 0%, #E92BA0 34%, ${RC.cream} 34%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}
              >
                <div style={{ width: 62, height: 62, borderRadius: '50%', background: RC.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 20, fontWeight: 700, color: RC.inkStrong, lineHeight: 1 }}>34%</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 9, fontWeight: 500, color: RC.inkMute }}>fair-use</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>You’re flying.</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute, lineHeight: 1.5, marginTop: 2 }}>At this rate, you’ll stay at high speed all month.</div>
                <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 11, color: RC.inkMute }}>Renews May 28 · Visa •• 4242</div>
              </div>
            </div>
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Add-ons</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            {ADDONS.map((a, i) => {
              const on = !!addons[a.id];
              return (
                <Row
                  key={a.id}
                  icon={a.icon}
                  title={a.title}
                  sub={a.sub}
                  last={i === ADDONS.length - 1}
                  active={on}
                  onClick={() => toggleAddon(a.id)}
                  trailing={
                    <span
                      style={{
                        width: 46, height: 28, borderRadius: 999, flexShrink: 0, position: 'relative',
                        background: on ? RC.grad : RC.line, transition: 'background 160ms ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22,
                          borderRadius: '50%', background: '#FFFDFB', transition: 'left 160ms ease',
                          boxShadow: '0 2px 6px -1px rgba(0,0,0,0.3)',
                        }}
                      />
                    </span>
                  }
                />
              );
            })}
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionTitle>Recent</SectionTitle>
          <RingoCard style={{ padding: 0 }}>
            {[
              { d: 'Apr 28', t: 'Ringo Essentials', a: '£19.00' },
              { d: 'Apr 12', t: 'Ireland number', a: '£3.00' },
              { d: 'Mar 28', t: 'Ringo Essentials', a: '£19.00' },
            ].map((r, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${RC.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>{r.t}</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>{r.d}</div>
                </div>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.inkStrong }}>{r.a}</div>
              </div>
            ))}
          </RingoCard>
        </div>

        <div style={{ marginTop: 22 }}>
          <RingoButton variant="ghost" onClick={onInstall}>Install eSIM on this device</RingoButton>
        </div>
      </div>
    </div>
  );
}
