// Usage (owner 2026-10-22: "have it be so people can see the usage"): how
// much of the current plan is used, the last 30 days day by day, and every
// eSIM the account has held with what it used. The figures are the ones
// ringoesim.com stored from the carriers (/api/app-usage); the current plan's
// "left" prefers the live figure My eSIM already read, so the two never
// disagree on screen.
import { RC, RADIUS } from '../theme';
import { RingoCard } from './Card';
import type { Usage, UsageEsim } from '../api/light';

function fmtData(mb: number | null | undefined): string {
  if (mb == null || !Number.isFinite(mb)) return '…';
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB`;
  return `${Math.round(mb)} MB`;
}
function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** The 30 days ending today, zero where nothing was used. */
function lastDays(daily: Usage['daily'], n = 30): { day: string; mb: number }[] {
  const by = new Map(daily.map((d) => [d.day, d.used_mb]));
  const out: { day: string; mb: number }[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, mb: by.get(key) || 0 });
  }
  return out;
}

function Heading({ children }: { children: string }) {
  return <h2 style={{ margin: '8px 0 0', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: RC.ink, letterSpacing: -0.6 }}>{children}</h2>;
}

function Meter({ esim, liveRemaining }: { esim: UsageEsim; liveRemaining: number | null }) {
  const remaining = liveRemaining ?? esim.remaining_mb;
  const total = esim.allowance_mb;
  const used = total != null && remaining != null ? Math.max(0, total - remaining) : esim.used_mb;
  const pct = total && used != null ? Math.min(100, (used / total) * 100) : 0;
  const low = total != null && remaining != null && remaining <= total * 0.1;
  return (
    <RingoCard>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: RC.ink, letterSpacing: -0.6 }}>
          {esim.unlimited ? fmtData(esim.used_mb ?? 0) : fmtData(used)}
          <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: RC.inkMute, letterSpacing: 0 }}>
            {esim.unlimited ? ' used' : total != null ? ` of ${fmtData(total)} used` : ' used'}
          </span>
        </div>
        {!esim.unlimited && remaining != null && (
          <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, color: low ? RC.error : RC.ink }}>{fmtData(remaining)} left</div>
        )}
      </div>
      {!esim.unlimited && total != null && (
        <div role="progressbar" aria-label="Data used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
          style={{ marginTop: 12, height: 10, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(pct, used ? 2 : 0)}%`, height: '100%', borderRadius: RADIUS.pill, background: low ? RC.error : RC.grad, transition: 'width .6s ease' }} />
        </div>
      )}
      {esim.checked_at && (
        <div style={{ marginTop: 8, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>
          {esim.unlimited ? 'Unlimited plan. ' : ''}Updated {new Date(esim.checked_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </RingoCard>
  );
}

function DailyChart({ daily }: { daily: Usage['daily'] }) {
  const days = lastDays(daily);
  const max = Math.max(...days.map((d) => d.mb), 1);
  const week = days.slice(-7).reduce((n, d) => n + d.mb, 0);
  return (
    <RingoCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: RC.ink }}>Last 30 days</div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>{fmtData(week)} this week</div>
      </div>
      <div role="img" aria-label={`Daily data use over the last 30 days, ${fmtData(week)} in the last 7`}
        style={{ marginTop: 14, height: 96, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
        {days.map((d) => (
          <div key={d.day} title={`${shortDate(d.day)}: ${fmtData(d.mb)}`}
            style={{ flex: 1, height: `${d.mb ? Math.max(4, (d.mb / max) * 100) : 2}%`, borderRadius: 3, background: d.mb ? RC.grad : RC.line }} />
        ))}
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font)', fontSize: 11, color: RC.inkMute }}>
        <span>{shortDate(days[0].day)}</span><span>Today</span>
      </div>
    </RingoCard>
  );
}

function History({ esims }: { esims: UsageEsim[] }) {
  return (
    <RingoCard padding={0}>
      {esims.map((e, i) => (
        <div key={e.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i === esims.length - 1 ? 'none' : `1px solid ${RC.line}` }}>
          <div aria-hidden style={{ width: 34, height: 34, borderRadius: 12, background: RC.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{e.flag || '🌍'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: RC.ink }}>{e.label}</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, color: RC.inkMute }}>Bought {shortDate(e.bought_at)}{e.ends_at ? ` · until ${shortDate(e.ends_at)}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 800, color: RC.ink }}>{e.used_mb != null ? fmtData(e.used_mb) : '–'}</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, color: RC.inkMute }}>{e.unlimited ? 'unlimited' : e.allowance_mb ? `of ${fmtData(e.allowance_mb)}` : 'used'}</div>
          </div>
        </div>
      ))}
    </RingoCard>
  );
}

/** The whole usage block for My eSIM; `currentId` is the plan on top of the screen. */
export function UsageSection({ usage, currentId, liveRemaining }: { usage: Usage; currentId: string | null; liveRemaining: number | null }) {
  const current = usage.esims.find((e) => e.id === currentId) || usage.esims[0] || null;
  if (!current && !usage.daily.length) return null;
  return (
    <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }}>
      <Heading>Your data</Heading>
      {current && <Meter esim={current} liveRemaining={current.id === usage.esims[0]?.id ? liveRemaining : null} />}
      <DailyChart daily={usage.daily} />
      {usage.esims.length > 1 && (
        <>
          <Heading>{`Every eSIM, ${fmtData(usage.totals.used_mb)} used`}</Heading>
          <History esims={usage.esims} />
        </>
      )}
    </div>
  );
}
