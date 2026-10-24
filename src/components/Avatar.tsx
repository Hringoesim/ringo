// Avatar.tsx: the member's own photo, or their Ringo cowboy (the default
// avatar of July 2026, back for Ringo Rewards). Personalisation comes from
// the hat, sky and bandana colours seeded from the email, never from skin
// tone: every default wears the same friendly cartoon complexion. The level
// shows twice: a ring in the level's colour, and from Diamond up the avatar
// itself changes (an ice-blue hat with a gem, then the northern lights).
//
// A Ringo Pioneer outranks the level here (owner 2026-10-24: "Pioneers did
// not get a special badge"): the July golden cowboy comes back (gold star hat,
// gold bandana, sparkles on a founder dusk sky), in a gold ring, with a gold
// star medallion at the bottom right, whatever their Rewards level. A Pioneer
// who added their own photo keeps the gold ring and the medallion.
import { useId, useRef, useState } from 'react';
import { RC } from '../theme';
import { avatarPhoto } from '../store/avatar';
import { levelColor, PIONEER_GOLD } from './profile/format';
import { TextLink } from './ui';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SKY: [string, string][] = [
  ['#FFD59E', '#FF8A5B'], ['#FFB3C1', '#FF6F91'], ['#C9B6FF', '#8A6BFF'],
  ['#A9ECC9', '#37B98A'], ['#FFE29A', '#FF9E4D'], ['#B5E0FF', '#5BA8FF'],
];
const HAT = ['#7A4A24', '#9C6B3F', '#5E3A1E', '#B07A44', '#4E3320'];
const BANDANA: [string, string][] = [
  ['#C0392B', '#E05545'], ['#2E7D5B', '#3FA978'], ['#2B6CB0', '#4A90D9'],
  ['#8E44AD', '#A569BD'], ['#D68910', '#F0A83B'],
];
const SKIN = '#F5C6A0';
const EYE = '#3a2a20';
const STAR = 'M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9z';

function Cowboy({ seed, level, size }: { seed: string; level: string | null; size: number }) {
  const uid = useId().replace(/:/g, '');
  const h = hashStr(seed.trim().toLowerCase() || 'ringo');
  const gid = `av${uid}`;
  const diamond = level === 'diamond';
  const aurora = level === 'aurora';
  const sky: [string, string] = aurora ? ['#0E2A3A', '#2A1650'] : diamond ? ['#D9F3FF', '#7CCBEA'] : SKY[h % SKY.length];
  const hat = aurora ? '#1E1433' : diamond ? '#5CC4E8' : HAT[(h >>> 5) % HAT.length];
  const band = aurora ? ['#2FD39A', '#8652E0'] : diamond ? ['#2B8FB8', '#7FD3F0'] : BANDANA[(h >>> 9) % BANDANA.length];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      {aurora && (
        <>
          <path d="M-5 30 C20 10 40 34 60 18 S95 14 105 6 L105 30 C85 36 70 44 52 36 S15 44 -5 52 Z" fill="#2FD39A" opacity="0.55" />
          <path d="M-5 44 C25 30 45 48 70 34 S100 32 105 26 L105 40 C80 48 60 56 40 48 S10 56 -5 62 Z" fill="#8652E0" opacity="0.45" />
          <circle cx="18" cy="16" r="1.3" fill="#fff" /><circle cx="84" cy="48" r="1" fill="#fff" />
        </>
      )}
      <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill={band[0]} />
      <path d="M38 80 L50 92 L62 80 Z" fill={band[1]} />
      <circle cx="30" cy="58" r="4.5" fill={SKIN} />
      <circle cx="70" cy="58" r="4.5" fill={SKIN} />
      <circle cx="50" cy="57" r="22" fill={SKIN} />
      <circle cx="42" cy="56" r="2.6" fill={EYE} />
      <circle cx="58" cy="56" r="2.6" fill={EYE} />
      <path d="M42 65 Q50 71 58 65" stroke={EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="40" rx="37" ry="8.5" fill={hat} />
      <path d="M31 41 Q31 17 50 17 Q69 17 69 41 Z" fill={hat} />
      <rect x="31" y="36.5" width="38" height="5.5" rx="2.5" fill="rgba(0,0,0,0.22)" />
      {(diamond || aurora) && <path d="M50 22 l5 5 -5 7 -5 -7 Z" fill={aurora ? '#2FD39A' : '#FFFFFF'} stroke={aurora ? '#B9FFE4' : '#2B8FB8'} strokeWidth="1.2" />}
    </svg>
  );
}

// The ultra-rare Pioneer avatar of July 2026 (0a02585): a golden cowboy on a
// deep founder-dusk sky, gold hat with a star, gold bandana and a sparkle.
// The gold founder badge sits outside the circle (see PioneerMedallion) so it
// is never clipped.
export function PioneerAvatar({ size }: { size: number }) {
  const uid = useId().replace(/:/g, '');
  const sky = `pio-sky-${uid}`, gold = `pio-gold-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F0733A" />
          <stop offset="1" stopColor="#7E3A73" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE79A" />
          <stop offset="0.5" stopColor="#F4C64B" />
          <stop offset="1" stopColor="#D9982A" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${sky})`} />
      <circle cx="24" cy="30" r="1.6" fill="rgba(255,255,255,0.85)" />
      <circle cx="80" cy="24" r="1.1" fill="rgba(255,255,255,0.7)" />
      <circle cx="18" cy="66" r="1.1" fill="rgba(255,255,255,0.6)" />
      <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill={`url(#${gold})`} />
      <path d="M38 80 L50 92 L62 80 Z" fill="#B9821F" />
      <circle cx="30" cy="58" r="4.5" fill={SKIN} />
      <circle cx="70" cy="58" r="4.5" fill={SKIN} />
      <circle cx="50" cy="57" r="22" fill={SKIN} />
      <circle cx="42" cy="56" r="2.6" fill={EYE} />
      <circle cx="58" cy="56" r="2.6" fill={EYE} />
      <path d="M42 65 Q50 71 58 65" stroke={EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="40" rx="37" ry="8.5" fill={`url(#${gold})`} />
      <path d="M31 41 Q31 16 50 16 Q69 16 69 41 Z" fill={`url(#${gold})`} />
      <rect x="31" y="36.5" width="38" height="5.5" rx="2.5" fill="rgba(120,70,10,0.4)" />
      <path d="M50 22 l2.1 4.3 4.7 .6 -3.4 3.3 .8 4.7 -4.2 -2.2 -4.2 2.2 .8 -4.7 -3.4 -3.3 4.7 -.6 Z" fill="#FFF3C8" />
      <path d="M78 44 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="rgba(255,244,200,0.95)" />
    </svg>
  );
}

/** The gold founder star that sits on a Pioneer's avatar, bottom right. */
function PioneerMedallion({ size }: { size: number }) {
  const d = Math.max(20, Math.round(size * 0.32));
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', right: -2, bottom: -2, width: d, height: d, borderRadius: '50%',
        background: PIONEER_GOLD, border: `${d > 26 ? 3 : 2}px solid ${RC.paper}`, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px -4px rgba(120,70,10,0.55)',
      }}
    >
      <svg width={Math.round(d * 0.58)} height={Math.round(d * 0.58)} viewBox="0 0 24 24"><path d={STAR} fill="#8A5A12" /></svg>
    </span>
  );
}

/** The member's avatar in a ring of their level's colour, or gold for a Pioneer. */
export function RingoAvatar({ seed, userId, level, size = 72, pioneer = false }: { seed: string; userId?: string | null; level: string | null; size?: number; pioneer?: boolean }) {
  const photo = avatarPhoto.use(userId || null);
  const [broken, setBroken] = useState<string | null>(null);
  const ring = Math.max(3, Math.round(size / 22));
  const ringFill = pioneer ? PIONEER_GOLD : level === 'aurora' ? 'linear-gradient(135deg,#2FD39A,#8652E0)' : levelColor(level);
  const inner = size - ring * 2 - 4;
  const showPhoto = photo && broken !== photo;
  return (
    <div
      role="img"
      aria-label={pioneer ? 'Your Ringo Pioneer avatar' : 'Your avatar'}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      <div style={{ width: size, height: size, borderRadius: '50%', padding: ring, boxSizing: 'border-box', background: ringFill, boxShadow: pioneer ? '0 10px 24px -12px rgba(217,152,42,0.75)' : undefined }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${RC.paper}`, boxSizing: 'border-box', background: RC.cream }}>
          {showPhoto
            ? <img src={photo} alt="" onError={() => setBroken(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : pioneer
              ? <PioneerAvatar size={inner} />
              : <Cowboy seed={seed} level={level} size={inner} />}
        </div>
      </div>
      {pioneer && <PioneerMedallion size={size} />}
    </div>
  );
}

/** "Add a photo" / "Use my Ringo avatar": the photo stays on this phone. */
export function AvatarPhotoControls({ userId, pioneer = false }: { userId: string; pioneer?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const photo = avatarPhoto.use(userId);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 24, rowGap: 8 }}>
        <input
          ref={input} type="file" accept="image/*" hidden aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void avatarPhoto.set(userId, f).then((ok) => setFailed(!ok));
          }}
        />
        <TextLink align="left" onClick={() => { setFailed(false); input.current?.click(); }}>{photo ? 'Change photo' : 'Add a photo'}</TextLink>
        {photo && (
          <TextLink align="left" color={RC.ink2} onClick={() => { setFailed(false); avatarPhoto.clear(userId); }}>
            {pioneer ? 'Use my golden avatar' : 'Use my Ringo avatar'}
          </TextLink>
        )}
      </div>
      {failed && <div role="alert" style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 15, lineHeight: 1.45, color: RC.error }}>That photo could not be used. Try another one.</div>}
    </div>
  );
}
