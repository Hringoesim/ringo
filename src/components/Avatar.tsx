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
import { avatarPhoto, avatarTraveller } from '../store/avatar';
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

/** The Ringo travellers a member can pick (owner 2026-10-25); cowboy is the default. */
export const TRAVELLERS: { id: string; name: string }[] = [
  { id: 'cowboy', name: 'Cowboy' },
  { id: 'backpacker', name: 'Backpacker' },
  { id: 'pilot', name: 'Pilot' },
  { id: 'explorer', name: 'Explorer' },
  { id: 'skier', name: 'Skier' },
  { id: 'surfer', name: 'Surfer' },
  { id: 'captain', name: 'Captain' },
  { id: 'parisian', name: 'City break' },
];

// What each traveller wears on the head and the shoulders, over the same
// face. `c` is the seeded main colour, `d` its lighter partner.
function Outfit({ kind, c, d }: { kind: string; c: string; d: string }) {
  switch (kind) {
    case 'backpacker':
      return (<>
        <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill={d} />
        <path d="M30 84 L34 100 M70 84 L66 100" stroke="#4E3320" strokeWidth="5" strokeLinecap="round" />
        <path d="M28 44 Q28 22 50 22 Q72 22 72 44 Z" fill={c} />
        <path d="M50 44 L90 46 Q88 52 72 50 Z" fill={c} />
        <circle cx="50" cy="23" r="2.2" fill="rgba(0,0,0,0.25)" />
      </>);
    case 'pilot':
      return (<>
        <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill="#7A4A24" />
        <path d="M30 82 Q50 92 70 82 Q66 78 50 78 Q34 78 30 82 Z" fill="#F3E3C8" />
        <path d="M27 60 Q25 26 50 25 Q75 26 73 60 L67 58 Q68 36 50 35 Q32 36 33 58 Z" fill="#7A4A24" />
        <circle cx="41" cy="38" r="7" fill="#B5E0FF" stroke="#3a2a20" strokeWidth="2.5" />
        <circle cx="59" cy="38" r="7" fill="#B5E0FF" stroke="#3a2a20" strokeWidth="2.5" />
        <path d="M48 38 h4" stroke="#3a2a20" strokeWidth="2.5" />
      </>);
    case 'explorer':
      return (<>
        <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill="#C8B07A" />
        <path d="M40 80 L50 90 L60 80" stroke="#8C7444" strokeWidth="2.5" fill="none" />
        <ellipse cx="50" cy="41" rx="34" ry="7" fill="#D9C48F" />
        <path d="M30 42 Q30 16 50 16 Q70 16 70 42 Z" fill="#E6D3A3" />
        <rect x="30" y="37" width="40" height="4.5" rx="2" fill={c} />
      </>);
    case 'skier':
      return (<>
        <path d="M18 100 Q18 76 50 76 Q82 76 82 100 Z" fill={c} />
        <path d="M24 90 H76" stroke={d} strokeWidth="4" />
        <path d="M28 46 Q28 20 50 20 Q72 20 72 46 Z" fill={d} />
        <rect x="28" y="40" width="44" height="7" rx="3" fill={c} />
        <circle cx="50" cy="17" r="6" fill="#FFFFFF" />
        <rect x="31" y="31" width="38" height="9" rx="4.5" fill="#FF9E4D" stroke="#3a2a20" strokeWidth="2" />
      </>);
    case 'surfer':
      return (<>
        <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill={c} />
        <circle cx="34" cy="90" r="3" fill="#FFFFFF" opacity="0.8" /><circle cx="62" cy="94" r="3" fill="#FFFFFF" opacity="0.8" /><circle cx="70" cy="86" r="2.4" fill="#FFE29A" />
        <path d="M27 52 Q22 30 40 28 Q50 20 62 27 Q80 28 74 52 Q72 40 64 38 Q56 34 50 38 Q42 34 34 40 Q28 44 27 52 Z" fill="#E0A440" />
        <rect x="35" y="51" width="13" height="8" rx="3.5" fill="#1E1433" />
        <rect x="52" y="51" width="13" height="8" rx="3.5" fill="#1E1433" />
        <path d="M48 54 h4" stroke="#1E1433" strokeWidth="2" />
      </>);
    case 'captain':
      return (<>
        <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill="#1F2A4D" />
        <circle cx="44" cy="90" r="2" fill="#F0C048" /><circle cx="56" cy="90" r="2" fill="#F0C048" />
        <path d="M28 40 Q26 24 50 22 Q74 24 72 40 Z" fill="#FFFFFF" stroke="#D8D8E0" strokeWidth="1" />
        <rect x="30" y="38" width="40" height="6" rx="2" fill="#1F2A4D" />
        <path d="M32 44 Q50 52 68 44 Z" fill="#111827" />
        <circle cx="50" cy="31" r="4" fill="#F0C048" />
      </>);
    case 'parisian':
      return (<>
        <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill="#2B2F3A" />
        <path d="M30 80 Q50 90 70 80 L66 92 Q50 98 34 92 Z" fill={c} />
        <path d="M60 86 L66 100 L58 100 Z" fill={d} />
        <ellipse cx="46" cy="37" rx="26" ry="9" fill={c} transform="rotate(-8 46 37)" />
        <circle cx="47" cy="27" r="2.4" fill={c} />
      </>);
    default:
      return null;
  }
}

function Traveller({ seed, level, size, kind }: { seed: string; level: string | null; size: number; kind: string }) {
  const uid = useId().replace(/:/g, '');
  const h = hashStr(seed.trim().toLowerCase() || 'ringo');
  const gid = `av${uid}`;
  const diamond = level === 'diamond';
  const aurora = level === 'aurora';
  const cowboy = !TRAVELLERS.some((t) => t.id === kind) || kind === 'cowboy';
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
      {cowboy && <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill={band[0]} />}
      {cowboy && <path d="M38 80 L50 92 L62 80 Z" fill={band[1]} />}
      {!cowboy && <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill={band[0]} />}
      <circle cx="30" cy="58" r="4.5" fill={SKIN} />
      <circle cx="70" cy="58" r="4.5" fill={SKIN} />
      <circle cx="50" cy="57" r="22" fill={SKIN} />
      {kind !== 'surfer' && <circle cx="42" cy="56" r="2.6" fill={EYE} />}
      {kind !== 'surfer' && <circle cx="58" cy="56" r="2.6" fill={EYE} />}
      <path d="M42 65 Q50 71 58 65" stroke={EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {cowboy ? (
        <>
          <ellipse cx="50" cy="40" rx="37" ry="8.5" fill={hat} />
          <path d="M31 41 Q31 17 50 17 Q69 17 69 41 Z" fill={hat} />
          <rect x="31" y="36.5" width="38" height="5.5" rx="2.5" fill="rgba(0,0,0,0.22)" />
        </>
      ) : (
        <Outfit kind={kind} c={band[0]} d={band[1]} />
      )}
      {(diamond || aurora) && <path d={cowboy ? 'M50 22 l5 5 -5 7 -5 -7 Z' : 'M82 14 l5 5 -5 7 -5 -7 Z'} fill={aurora ? '#2FD39A' : '#FFFFFF'} stroke={aurora ? '#B9FFE4' : '#2B8FB8'} strokeWidth="1.2" />}
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
  const kind = avatarTraveller.use(userId || null) || 'cowboy';
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
            : pioneer && kind === 'cowboy'
              ? <PioneerAvatar size={inner} />
              : <Traveller seed={seed} level={level} size={inner} kind={kind} />}
        </div>
      </div>
      {pioneer && <PioneerMedallion size={size} />}
    </div>
  );
}

/** "Add a photo" / "Use my Ringo avatar": the photo stays on this phone. */
export function AvatarPhotoControls({ userId, pioneer = false, seed = '', level = null }: { userId: string; pioneer?: boolean; seed?: string; level?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const photo = avatarPhoto.use(userId);
  const kind = avatarTraveller.use(userId) || 'cowboy';
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
      <TravellerPicker userId={userId} seed={seed || userId} level={level} pioneer={pioneer} current={photo ? null : kind} />
      {failed && <div role="alert" style={{ marginTop: 14, fontFamily: 'var(--font)', fontSize: 15, lineHeight: 1.45, color: RC.error }}>That photo could not be used. Try another one.</div>}
    </div>
  );
}

/** Pick a traveller (owner 2026-10-25): picking one also puts the photo away. */
function TravellerPicker({ userId, seed, level, pioneer, current }: { userId: string; seed: string; level: string | null; pioneer: boolean; current: string | null }) {
  const tile = 58;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink }}>Pick your traveller</div>
      <div role="radiogroup" aria-label="Pick your traveller" className="no-bar" style={{ marginTop: 10, display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {TRAVELLERS.map((t) => {
          const on = current === t.id;
          return (
            <button
              key={t.id} type="button" role="radio" aria-checked={on} aria-label={t.name} className="press"
              onClick={() => { avatarPhoto.clear(userId); avatarTraveller.set(userId, t.id); }}
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <span style={{ width: tile, height: tile, borderRadius: '50%', overflow: 'hidden', display: 'block', boxSizing: 'border-box', border: `3px solid ${on ? RC.orangeInk : 'transparent'}`, boxShadow: on ? 'none' : `inset 0 0 0 1px ${RC.line}` }}>
                {pioneer && t.id === 'cowboy' ? <PioneerAvatar size={tile - 6} /> : <Traveller seed={seed} level={level} size={tile - 6} kind={t.id} />}
              </span>
              <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: on ? 700 : 500, color: on ? RC.ink : RC.ink2, whiteSpace: 'nowrap' }}>{t.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
