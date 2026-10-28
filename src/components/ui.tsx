// ui.tsx: shared building blocks, matched to ringoesim.com.
// Rules baked in: no uppercase letter-spaced kicker labels, nothing under
// 13px, body copy 15 to 17px, orange text always in RC.orangeInk (contrast),
// 44pt tap targets, clickable rows are real buttons.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  RC, RADIUS, TAP, TYPE, TICK, ON_DARK, GRAD_PREMIUM, LOGO_GRAD, PHOTO_OVERLAY, PHOTO_TEXT_SHADOW,
  cardSurface, hexA, skyFor, typeFor,
} from '../theme';
import { hapticSelection } from '../lib/haptics';
import { useLayout } from '../lib/layout';
import { t, isRtl } from '../lib/i18n';

// ── Header controls ─────────────────────────────────────────────────────────

export function BackBtn({ onClick, label }: { onClick?: () => void; label?: string }) {
  return (
    <button
      className="press"
      onClick={onClick}
      aria-label={label ?? t('Back')}
      style={{
        width: TAP, height: TAP, borderRadius: '50%', padding: 0, flexShrink: 0,
        background: RC.cream, border: `1.5px solid ${RC.lineStrong}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: '0 4px 12px -6px rgba(26,15,46,0.16)',
      }}
    >
      <svg className="flip-rtl" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M10 2L4 8l6 6" stroke={RC.orangeInk} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// A round 44pt header button (the profile button and any other header icon).
export function IconButton({ onClick, label, children }: { onClick?: () => void; label: string; children: ReactNode }) {
  return (
    <button
      className="press"
      onClick={onClick}
      aria-label={label}
      style={{
        width: TAP, height: TAP, borderRadius: '50%', padding: 0, flexShrink: 0,
        border: `1.5px solid ${RC.line}`, background: RC.paper, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

// A text-only action with a 44pt hit area. The padding is taken back with a
// negative margin so the words sit where a bare link would. 15/600 orangeInk.
export function TextLink({ onClick, children, color, align = 'center', disabled = false, style = {} }: { onClick?: () => void; children: ReactNode; color?: string; align?: 'left' | 'center'; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button
      className={disabled ? undefined : 'press'}
      disabled={disabled}
      onClick={onClick}
      style={{
        minHeight: TAP, padding: '0 16px', margin: '-12px -16px', boxSizing: 'border-box',
        display: 'inline-flex', alignItems: 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', textAlign: align === 'left' ? 'start' : 'center',
        border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, lineHeight: 1.3,
        color: color ?? RC.orangeInk, ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Brand ───────────────────────────────────────────────────────────────────

/** The "Ringo" wordmark (site logo gradient). Never remove it from the Store home. */
export function Wordmark({ size }: { size?: number }) {
  const l = useLayout();
  const fs = size ?? (l.isWide ? 28 : 24);
  return (
    <span
      role="img"
      aria-label="Ringo"
      style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: fs, lineHeight: 1,
        letterSpacing: -1, background: LOGO_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text',
        WebkitTextFillColor: 'transparent', color: 'transparent', display: 'inline-block', paddingBottom: 2,
      }}
    >
      Ringo
    </span>
  );
}

// ── Headings ────────────────────────────────────────────────────────────────

/** The large title at the top of a tab screen (h1). 26 cover, 30 phone, 36 wide. */
export function ScreenTitle({ children, sub, style = {} }: { children: ReactNode; sub?: ReactNode; style?: CSSProperties }) {
  const l = useLayout();
  return (
    <div style={{ marginBottom: sub ? 16 : 12, ...style }}>
      <h1 style={{ margin: 0, ...typeFor('display', l.size), color: RC.ink }}>{children}</h1>
      {sub && <p style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>{sub}</p>}
    </div>
  );
}

/**
 * A plain bold section heading with one short line under it, and nothing
 * above it (no kicker). Optional `action` sits at the right of the heading.
 */
export function SectionHead({ title, sub, action, as = 'h2', style = {} }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; as?: 'h1' | 'h2' | 'h3'; style?: CSSProperties }) {
  const l = useLayout();
  const H = as;
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <H style={{ margin: 0, ...typeFor('h1', l.size), color: RC.ink, minWidth: 0 }}>{title}</H>
        {action}
      </div>
      {sub && <p style={{ margin: '8px 0 0', ...TYPE.body, color: RC.ink2 }}>{sub}</p>}
    </div>
  );
}

/**
 * Former uppercase 11px kicker. Now a sentence-case 17/700 ink heading so old
 * call sites read as a plain heading. Prefer SectionHead in new code.
 */
export function SectionTitle({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <h2 style={{ margin: 0, padding: '8px 0 10px', ...TYPE.h3, color: RC.ink, ...style }}>
      {children}
    </h2>
  );
}

// ── Text helpers ────────────────────────────────────────────────────────────

/** Body copy (17, ink) or `tone="secondary"` (15, ink2) or `tone="caption"` (13, inkMute). */
export function Text({ children, tone = 'body', style = {}, as = 'p' }: { children: ReactNode; tone?: 'body' | 'secondary' | 'caption'; style?: CSSProperties; as?: 'p' | 'span' | 'div' }) {
  const T = as;
  const s = tone === 'body' ? { ...TYPE.body, color: RC.ink } : tone === 'secondary' ? { ...TYPE.small, color: RC.ink2 } : { ...TYPE.caption, color: RC.inkMute };
  return <T style={{ margin: 0, ...s, ...style }}>{children}</T>;
}

// ── Tick list ───────────────────────────────────────────────────────────────

/** One green-tick line. `onDark` for the dark plan-card skins. */
export function Tick({ children, onDark = false, tone = 'green', size = 17, style = {} }: { children: ReactNode; onDark?: boolean; tone?: 'green' | 'orange'; size?: 15 | 16 | 17; style?: CSSProperties }) {
  const tickColor = tone === 'orange' ? (onDark ? '#FFB27A' : RC.orangeInk) : onDark ? TICK.onDark : RC.tick;
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, listStyle: 'none', fontFamily: 'var(--font)', fontSize: size, lineHeight: 1.5, color: onDark ? ON_DARK.text2 : RC.ink2, ...style }}>
      <span aria-hidden style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontWeight: 800, color: tickColor }}>✓</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </li>
  );
}

/** A list of ticks. Pass strings or nodes. */
export function TickList({ items, onDark = false, gap = 10, style = {}, size = 17 }: { items: ReactNode[]; onDark?: boolean; gap?: number; style?: CSSProperties; size?: 15 | 16 | 17 }) {
  return (
    <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap, ...style }}>
      {items.map((it, i) => (
        <Tick key={i} onDark={onDark} size={size}>{it}</Tick>
      ))}
    </ul>
  );
}

// ── Photo card (site Picture + Card) ────────────────────────────────────────

interface PhotoCardProps {
  /** Stable id: picks the sunset sky when there is no photo. */
  id: string;
  /** Name over the picture (white, 800). */
  name: ReactNode;
  photo?: string | null;
  /** Alt text for the photo; defaults to an empty alt (decorative). */
  alt?: string;
  /** Emoji flag or small node before the name. */
  flag?: ReactNode;
  /** Data chip at the top right of the picture, e.g. "40 countries". */
  chip?: ReactNode;
  /** big: 16:9, name 24 (feature cards). tile: 4:3, name 17 (country tiles). */
  size?: 'big' | 'tile';
  /** Override the picture's aspect ratio, e.g. '2 / 1'. */
  aspect?: string;
  /** Price line (17/700 ink). */
  price?: ReactNode;
  /** What-line under the price (15 ink2). */
  what?: ReactNode;
  /** Meta line (13 inkMute). */
  meta?: ReactNode;
  /** Extra content in the white body. */
  children?: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  eager?: boolean;
  selected?: boolean;
  style?: CSSProperties;
}

export function PhotoCard({ id, name, photo, alt = '', flag, chip, size = 'big', aspect, price, what, meta, children, onClick, ariaLabel, eager = false, selected = false, style = {} }: PhotoCardProps) {
  const [broken, setBroken] = useState(false);
  const big = size === 'big';
  const tappable = !!onClick;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); }
  };
  const hasBody = price != null || what != null || meta != null || children != null;
  return (
    <div
      onClick={onClick}
      onKeyDown={tappable ? onKey : undefined}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      aria-label={ariaLabel}
      className={tappable ? 'card-press' : undefined}
      style={{
        ...cardSurface(), overflow: 'hidden', cursor: tappable ? 'pointer' : undefined,
        borderColor: selected ? RC.inkStrong : RC.line, display: 'flex', flexDirection: 'column', ...style,
      }}
    >
      <div style={{ position: 'relative', aspectRatio: aspect ?? (big ? '16 / 9' : '4 / 3'), background: skyFor(id), overflow: 'hidden' }}>
        {photo && !broken && (
          <img
            src={photo}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setBroken(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: PHOTO_OVERLAY }} />
        {chip != null && (
          <span
            style={{
              position: 'absolute', top: 10, insetInlineEnd: 10, padding: '5px 10px', borderRadius: 999,
              background: 'rgba(14,7,24,0.55)', border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              color: '#FFFFFF', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, lineHeight: 1.2,
            }}
          >
            {chip}
          </span>
        )}
        <div
          style={{
            position: 'absolute', left: big ? 16 : 12, right: big ? 16 : 12, bottom: big ? 14 : 10,
            display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', textShadow: PHOTO_TEXT_SHADOW,
          }}
        >
          {flag != null && <span aria-hidden style={{ fontSize: big ? 26 : 18, lineHeight: 1, flexShrink: 0 }}>{flag}</span>}
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: big ? 24 : 17, lineHeight: 1.15, letterSpacing: '-0.02em', minWidth: 0, overflowWrap: 'anywhere' }}>{name}</span>
        </div>
      </div>
      {hasBody && (
        <div style={{ padding: big ? '14px 16px 16px' : '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {price != null && <div style={{ fontFamily: 'var(--font)', fontSize: big ? 17 : 15, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', color: RC.ink, fontVariantNumeric: 'tabular-nums' }}>{price}</div>}
          {what != null && <div style={{ ...TYPE.small, color: RC.ink2 }}>{what}</div>}
          {meta != null && <div style={{ ...TYPE.caption, color: RC.inkMute }}>{meta}</div>}
          {children}
        </div>
      )}
    </div>
  );
}

// ── Pioneer badge ───────────────────────────────────────────────────────────

/** The Pioneer badge. premium: plum chip, white label. light: purple text on a soft lilac fill. gold: gold fill, plum label. */
export function PioneerBadge({ label, tone = 'premium', style = {} }: { label?: ReactNode; tone?: 'premium' | 'light' | 'gold'; style?: CSSProperties }) {
  const skin: CSSProperties =
    tone === 'premium'
      ? { background: GRAD_PREMIUM, color: '#FFFFFF' }
      : tone === 'gold'
        ? { background: 'linear-gradient(135deg,#FFE08A 0%,#FFCC33 55%,#FFA733 100%)', color: '#3A1A00' }
        : { background: 'rgba(134,82,224,0.10)', color: RC.purpleInk };
  const star = tone === 'premium' ? '#FFCC33' : tone === 'gold' ? '#3A1A00' : RC.purpleInk;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px 5px 9px', borderRadius: 999,
        fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', ...skin, ...style,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9z" fill={star} />
      </svg>
      {label ?? t('Pioneer')}
    </span>
  );
}

// ── Segmented control (site Segmented) ──────────────────────────────────────
// Up to 4 options: equal-width grid with a sliding pill. More than 4: scrolls
// sideways with snap, the chosen one kept in view. `tone="dark"` for the dark
// plan-card skins. Roving tabindex, arrow keys, haptic selection.
export function Segmented<T extends string>({ value, options, onChange, tone = 'light', ariaLabel }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; tone?: 'light' | 'dark'; ariaLabel?: string }) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  const dark = tone === 'dark';
  const scroll = options.length > 4;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (!scroll) return;
    refs.current[idx]?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [idx, scroll]);
  const pick = (i: number, focus = false) => {
    const o = options[i];
    if (!o) return;
    hapticSelection();
    onChange(o.id);
    if (focus) refs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === (isRtl() ? 'ArrowLeft' : 'ArrowRight') || e.key === 'ArrowDown') { e.preventDefault(); pick((idx + 1) % options.length, true); }
    if (e.key === (isRtl() ? 'ArrowRight' : 'ArrowLeft') || e.key === 'ArrowUp') { e.preventDefault(); pick((idx - 1 + options.length) % options.length, true); }
  };
  const track: CSSProperties = dark
    ? { background: ON_DARK.track, border: `1px solid ${ON_DARK.trackLine}` }
    : { background: RC.cream, border: `1px solid ${RC.line}` };
  const pillBg = dark ? '#FFFFFF' : RC.paper;
  const pillShadow = dark ? '0 2px 14px rgba(0,0,0,0.25)' : '0 2px 14px rgba(26,15,46,0.12)';
  const labelOn = dark ? '#1A0F2E' : RC.ink;
  const labelOff = dark ? ON_DARK.caption : RC.ink2;
  const btn = (on: boolean): CSSProperties => ({
    position: 'relative', border: 'none', cursor: 'pointer', minHeight: TAP, padding: '0 14px',
    borderRadius: RADIUS.pill, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 600, lineHeight: 1.2,
    color: on ? labelOn : labelOff, transition: 'color .2s', whiteSpace: 'nowrap',
  });

  if (scroll) {
    return (
      <div role="tablist" aria-label={ariaLabel} onKeyDown={onKey} className="no-bar" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: RADIUS.pill, overflowX: 'auto', scrollSnapType: 'x mandatory', ...track }}>
        {options.map((o, i) => {
          const on = i === idx;
          return (
            <button key={o.id} ref={(el) => { refs.current[i] = el; }} role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => pick(i)}
              style={{ ...btn(on), flexShrink: 0, scrollSnapAlign: 'center', background: on ? pillBg : 'transparent', boxShadow: on ? pillShadow : 'none' }}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div role="tablist" aria-label={ariaLabel} onKeyDown={onKey} style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 4, padding: 4, borderRadius: RADIUS.pill, ...track }}>
      <div aria-hidden className="seg-pill" style={{ position: 'absolute', top: 4, bottom: 4, insetInlineStart: 4, width: `calc((100% - 8px - ${(options.length - 1) * 4}px) / ${options.length})`, borderRadius: RADIUS.pill, background: pillBg, boxShadow: pillShadow, transform: `translateX(calc(${(isRtl() ? -1 : 1) * idx * 100}% + ${(isRtl() ? -1 : 1) * idx * 4}px))` }} />
      {options.map((o, i) => {
        const on = i === idx;
        return (
          <button key={o.id} ref={(el) => { refs.current[i] = el; }} role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => pick(i)}
            style={{ ...btn(on), background: 'transparent', padding: '0 6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Form fields ─────────────────────────────────────────────────────────────

/** Sentence-case field label, 15/600 ink2, 8 above the input. */
export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'block', ...TYPE.label, color: RC.ink2, marginBottom: 8 }}>
      {children}
    </label>
  );
}

/** Help text under a field: 13 inkMute. */
export function HelpText({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ marginTop: 8, ...TYPE.caption, color: RC.inkMute, ...style }}>{children}</div>;
}

/** The site's alert box: soft red, 15/1.45 error text. */
export function ErrorBox({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: RC.errorSoft, border: '1px solid rgba(225,29,72,0.18)', ...TYPE.small, color: RC.error, ...style }}>
      {children}
    </div>
  );
}

/** The site's paid / done banner: soft green, dark green text. */
export function SuccessBox({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  const dark = RC.scheme === 'dark';
  return (
    <div role="status" style={{ padding: '12px 14px', borderRadius: 12, background: dark ? 'rgba(95,212,154,0.12)' : 'hsl(142,60%,95%)', border: `1px solid ${dark ? 'rgba(95,212,154,0.3)' : 'hsl(142,60%,80%)'}`, ...TYPE.small, fontWeight: 500, color: dark ? RC.success : 'hsl(142,60%,22%)', ...style }}>
      {children}
    </div>
  );
}

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'numeric' | 'email' | 'none' | 'search' | 'url' | 'decimal';
  id?: string;
  name?: string;
  autoComplete?: string;
  ariaLabel?: string;
  /** Shows the field in the error colour. */
  invalid?: boolean;
  onEnter?: () => void;
}

// Height 54, radius 14, 17/500 ink. Border turns orange on FOCUS only (a
// filled field no longer looks active or in error).
export function Input({ value, onChange, placeholder, type = 'text', inputMode, id, name, autoComplete, ariaLabel, invalid = false, onEnter }: InputProps) {
  const [focused, setFocused] = useState(false);
  const border = invalid ? RC.error : focused ? RC.inkStrong : RC.lineStrong;
  return (
    <input
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') onEnter(); } : undefined}
      placeholder={placeholder}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className="ringo-input"
      style={{
        width: '100%', height: 54, padding: '0 16px', boxSizing: 'border-box',
        borderRadius: RADIUS.control, background: RC.paper,
        border: `1.5px solid ${border}`,
        boxShadow: focused ? `0 0 0 3px ${hexA('#FF5724', 0.14)}` : 'none',
        outline: 'none', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 500,
        color: RC.ink, letterSpacing: '-0.01em',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
      }}
    />
  );
}

// ── Rows ────────────────────────────────────────────────────────────────────

type RowIconKind = 'speed' | 'call' | 'hotspot' | 'sos';

function rowIcon(k: RowIconKind) {
  switch (k) {
    case 'speed':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 12a9 9 0 0118 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 12l5-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'call':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'hotspot':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M8 16a5 5 0 010-8M16 8a5 5 0 010 8M5 19a9 9 0 010-14M19 5a9 9 0 010 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'sos':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M9 10c.5-1 1.5-1.5 3-1.5 1.5 0 2.3.7 2.3 1.7 0 1-.7 1.5-2 1.8-1 .2-1.5.5-1.5 1.2v.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.9" fill="currentColor" />
        </svg>
      );
  }
}

export function Row({
  icon,
  title,
  sub,
  last,
  onClick,
  trailing,
  active,
}: {
  icon: RowIconKind;
  title: string;
  sub: string;
  last?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  active?: boolean;
}) {
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', minHeight: 60, width: '100%',
    border: 'none', borderBottom: last ? 'none' : `1px solid ${RC.line}`, textAlign: 'start',
    cursor: onClick ? 'pointer' : 'default', fontFamily: 'var(--font)',
    background: active ? RC.cream : 'transparent', boxSizing: 'border-box',
  };
  const inner = (
    <>
      <div
        style={{
          width: 40, height: 40, borderRadius: RADIUS.sm, flexShrink: 0,
          background: active ? RC.gradCta : RC.cream,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: active ? '#FFFFFF' : RC.orangeInk,
        }}
      >
        {rowIcon(icon)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.h3, color: RC.ink }}>{title}</div>
        <div style={{ ...TYPE.small, color: RC.ink2 }}>{sub}</div>
      </div>
      {trailing}
    </>
  );
  return onClick ? (
    <button className="press" onClick={onClick} aria-pressed={active ?? undefined} style={style}>{inner}</button>
  ) : (
    <div style={style}>{inner}</div>
  );
}

export function Step({
  num,
  title,
  sub,
  last,
}: {
  num: string;
  title: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px',
        borderBottom: last ? 'none' : `1px solid ${RC.line}`,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 32, height: 32, borderRadius: '50%', background: RC.gradCta,
          color: '#FFFFFF', fontFamily: 'var(--font)', fontWeight: 700, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
      >
        {num}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...TYPE.h3, color: RC.ink }}>{title}</div>
        <div style={{ ...TYPE.small, color: RC.ink2, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}
