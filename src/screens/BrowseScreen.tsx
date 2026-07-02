// BrowseScreen — country picker with live search + region grouping.
import { useState } from 'react';
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { RingoCard } from '../components/Card';
import { BackBtn } from '../components/ui';
import { COUNTRIES } from '../data/countries';
import type { Country } from '../data/types';
import type { OnNav } from '../navigation';

export function BrowseScreen({ onNav, onBack }: { onNav: OnNav; onBack: () => void }) {
  const [q, setQ] = useState('');
  const filtered = COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.capital.toLowerCase().includes(q.toLowerCase()),
  );
  const popular = filtered.filter((c) => c.popular);
  const grouped: Record<string, Country[]> = {};
  filtered.forEach((c) => {
    (grouped[c.region] = grouped[c.region] || []).push(c);
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Browse" leading={<BackBtn onClick={onBack} />} trailing={null} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, color: RC.ink, letterSpacing: -0.6, lineHeight: 1.1, textWrap: 'pretty' }}>
          Where to next
          <span style={{ background: RC.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>?</span>
        </div>
        <div style={{ marginTop: 6, fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, fontWeight: 400 }}>
          180+ countries · added to your plan instantly
        </div>
      </div>

      <div style={{ padding: '14px 20px 6px' }}>
        <div style={{ height: 48, padding: '0 14px', borderRadius: 14, background: RC.paper, border: `1px solid ${RC.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={RC.inkMute} strokeWidth="2" />
            <path d="M20 20l-3-3" stroke={RC.inkMute} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 180+ countries"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: 'var(--font)', fontSize: 14, color: RC.ink }}
          />
        </div>
      </div>

      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 100px' }}>
        {q.length === 0 && (
          <div>
            <div style={{ padding: '8px 0 10px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Popular right now
            </div>
            <div className="no-bar" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 6px' }}>
              {popular.map((c) => (
                <div
                  key={c.code}
                  onClick={() => onNav('country', c.code)}
                  style={{ flex: '0 0 130px', padding: 14, borderRadius: 18, background: RC.gradSoft, border: '1px solid transparent', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 30 }}>{c.flag}</div>
                  <div style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.ink }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>{c.capital}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([region, list]) => (
          <div key={region} style={{ marginTop: 18 }}>
            <div style={{ padding: '8px 0 10px', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              {region}
            </div>
            <RingoCard style={{ padding: '4px 0' }}>
              {list.map((c, i) => (
                <div
                  key={c.code}
                  onClick={() => onNav('country', c.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    borderBottom: i === list.length - 1 ? 'none' : `1px solid ${RC.line}`, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{c.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, color: RC.ink }}>{c.name}</div>
                    <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>{c.capital}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: RC.inkStrong, padding: '6px 10px', borderRadius: 999, background: RC.cream }}>
                    Included
                  </div>
                </div>
              ))}
            </RingoCard>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: RC.inkMute, fontFamily: 'var(--font)', fontSize: 14 }}>
            No country matches “{q}” — try another spelling.
          </div>
        )}
      </div>
    </div>
  );
}
