// Avatar.tsx: the member's own photo, or their Ringo cowboy (the default
// avatar of July 2026, back for Ringo Rewards). Personalisation comes from
// the hat, sky and bandana colours seeded from the email, never from skin
// tone: every default wears the same friendly cartoon complexion. The level
// shows twice: a ring in the level's colour, and from Diamond up the avatar
// itself changes (an ice-blue hat with a gem, then the northern lights).
import { useRef } from 'react';
import { RC } from '../theme';
import { avatarPhoto } from '../store/avatar';
import { levelColor } from './profile/format';

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


function Cowboy({ seed, level, size }: { seed: string; level: string | null; size: number }) {
  const h = hashStr(seed.trim().toLowerCase() || 'ringo');
  const gid = `av${h % 100000}${level || ''}`;
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

/** The member's avatar in a ring of their level's colour. */
export function RingoAvatar({ seed, userId, level, size = 72 }: { seed: string; userId?: string | null; level: string | null; size?: number }) {
  const photo = avatarPhoto.use(userId || null);
  const ring = Math.max(3, Math.round(size / 22));
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', padding: ring, boxSizing: 'border-box', background: level === 'aurora' ? 'linear-gradient(135deg,#2FD39A,#8652E0)' : levelColor(level), flexShrink: 0 }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${RC.paper}`, boxSizing: 'border-box', background: RC.cream }}>
        {photo
          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <Cowboy seed={seed} level={level} size={size - ring * 2 - 4} />}
      </div>
    </div>
  );
}

/** "Change photo" / "Use my Ringo avatar": the photo stays on this phone. */
export function AvatarPhotoControls({ userId }: { userId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const photo = avatarPhoto.use(userId);
  const link = { border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 700, color: RC.inkStrong } as const;
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void avatarPhoto.set(userId, f); e.target.value = ''; }} />
      <button className="press" style={link} onClick={() => input.current?.click()}>{photo ? 'Change photo' : 'Add a photo'}</button>
      {photo && <button className="press" style={{ ...link, color: RC.inkMute }} onClick={() => avatarPhoto.clear(userId)}>Use my Ringo avatar</button>}
    </div>
  );
}
