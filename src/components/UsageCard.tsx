// Usage (owner 2026-10-22: "have it be so people can see the usage"): how
// much of the current plan is used, the last 30 days day by day, and every
// eSIM the account has held with what it used. The figures are the ones
// ringoesim.com stored from the carriers (/api/app-usage); the current plan's
// "left" prefers the live figure My eSIM already read, but only when the
// meter shows that same plan, so the two never disagree on screen.
import { RC, RADIUS, TYPE } from '../theme';
import { RingoCard } from './Card';
import { SectionHead } from './ui';
import type { Usage, UsageEsim } from '../api/light';
import { t, fmtNumber, fmtDate, placeName } from '../lib/i18n';

function fmtData(mb: number | null | undefined): string {
  if (mb == null || !Number.isFinite(mb)) return '…';
  if (mb >= 1024) return `${fmtNumber(mb / 1024, { maximumFractionDigits: mb >= 10240 ? 0 : 1, minimumFractionDigits: mb >= 10240 ? 0 : 1 })} GB`;
  return `${fmtNumber(Math.round(mb))} MB`;
}
function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtDate(d, { day: 'numeric', month: 'short' });
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

function Meter({ esim, liveRemaining }: { esim: UsageEsim; liveRemaining: number | null }) {
  const remaining = liveRemaining ?? esim.remaining_mb;
  const total = esim.allowance_mb;
  const used = total != null && remaining != null ? Math.max(0, total - remaining) : esim.used_mb;
  const pct = total && used != null ? Math.min(100, (used / total) * 100) : 0;
  const low = total != null && remaining != null && remaining <= total * 0.1;
  return (
    <RingoCard>
      <div style={{ ...TYPE.h3, color: RC.ink }}>{esim.flag ? `${esim.flag} ` : ''}{placeName(esim.label, esim.flag)}</div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px 12px' }}>
        <div style={{ ...TYPE.price, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>
          {esim.unlimited ? fmtData(esim.used_mb ?? 0) : fmtData(used)}
          <span style={{ ...TYPE.small, fontWeight: 500, color: RC.ink2 }}>
            {' '}{esim.unlimited ? t('used') : total != null ? t('of {total} used', { total: fmtData(total) }) : t('used')}
          </span>
        </div>
        {esim.unlimited ? (
          <div style={{ ...TYPE.small, fontWeight: 700, color: RC.success }}>{t('Unlimited')}</div>
        ) : remaining != null && (
          <div style={{ ...TYPE.small, fontWeight: 700, color: low ? RC.error : RC.ink }}>{t('{amount} left', { amount: fmtData(remaining) })}</div>
        )}
      </div>
      {!esim.unlimited && total != null && (
        <div role="progressbar" aria-label={t('Data used')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
          style={{ marginTop: 12, height: 12, borderRadius: RADIUS.pill, background: RC.cream, overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(pct, used ? 2 : 0)}%`, height: '100%', borderRadius: RADIUS.pill, background: low ? RC.error : RC.grad, transition: 'width .6s ease' }} />
        </div>
      )}
      {esim.checked_at && (
        <div style={{ marginTop: 10, ...TYPE.caption, color: RC.inkMute }}>
          {t('Updated {time}', { time: fmtDate(esim.checked_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '2px 12px' }}>
        <div style={{ ...TYPE.h3, color: RC.ink }}>{t('Last 30 days')}</div>
        <div style={{ ...TYPE.small, color: RC.ink2 }}>{t('{amount} in the last 7 days', { amount: fmtData(week) })}</div>
      </div>
      <div role="img" aria-label={t('Daily data use over the last 30 days, {amount} in the last 7', { amount: fmtData(week) })}
        style={{ marginTop: 14, height: 110, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
        {days.map((d) => (
          <div key={d.day} title={`${shortDate(d.day)}: ${fmtData(d.mb)}`}
            style={{ flex: 1, minWidth: 0, height: `${d.mb ? Math.max(4, (d.mb / max) * 100) : 2}%`, borderRadius: 3, background: d.mb ? RC.grad : RC.line }} />
        ))}
      </div>
      <div aria-hidden style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', ...TYPE.caption, color: RC.inkMute }}>
        <span>{shortDate(days[0].day)}</span><span>{t('Today')}</span>
      </div>
    </RingoCard>
  );
}

function History({ esims }: { esims: UsageEsim[] }) {
  return (
    <RingoCard padding={0} clip>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {esims.map((e, i) => (
          <li key={e.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i === esims.length - 1 ? 'none' : `1px solid ${RC.line}` }}>
            <div aria-hidden style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: RC.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{e.flag || '🌍'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...TYPE.h3, color: RC.ink, overflowWrap: 'anywhere' }}>{placeName(e.label, e.flag)}</div>
              <div style={{ ...TYPE.small, color: RC.ink2 }}>{e.ends_at ? t('Bought {date}, until {end}', { date: shortDate(e.bought_at), end: shortDate(e.ends_at) }) : t('Bought {date}', { date: shortDate(e.bought_at) })}</div>
            </div>
            <div style={{ textAlign: 'end', flexShrink: 0 }}>
              <div style={{ ...TYPE.bodyStrong, color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{e.used_mb != null ? fmtData(e.used_mb) : t('None')}</div>
              <div style={{ ...TYPE.caption, color: RC.inkMute }}>{e.unlimited ? t('Unlimited') : e.allowance_mb ? t('of {total}', { total: fmtData(e.allowance_mb) }) : t('used')}</div>
            </div>
          </li>
        ))}
      </ul>
    </RingoCard>
  );
}

/**
 * The whole usage block for My eSIM. `currentDestination` is the destination
 * of the plan at the top of the screen: the meter shows that eSIM, and only
 * then takes My eSIM's live "left" figure.
 */
export function UsageSection({ usage, currentDestination, liveRemaining }: { usage: Usage; currentDestination: string | null; liveRemaining: number | null }) {
  const forPlan = currentDestination ? usage.esims.filter((e) => e.destination === currentDestination) : [];
  const matched = forPlan.find((e) => !/ended|expired|terminated/i.test(e.status)) || forPlan[0] || null;
  const current = matched || usage.esims[0] || null;
  if (!current && !usage.daily.length) return null;
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <SectionHead title={t('Your data')} style={{ marginBottom: 4 }} />
      {current && <Meter esim={current} liveRemaining={matched && current.id === matched.id ? liveRemaining : null} />}
      <DailyChart daily={usage.daily} />
      {usage.esims.length > 1 && (
        <>
          <SectionHead title={t('Every eSIM')} sub={t('{amount} used in all.', { amount: fmtData(usage.totals.used_mb) })} style={{ marginTop: 12, marginBottom: 4 }} />
          <History esims={usage.esims} />
        </>
      )}
    </section>
  );
}
