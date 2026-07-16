// Avatar.tsx — the user's photo, or a fun "cowboy" default. Personalisation
// comes from the HAT / SKY / BANDANA colours seeded from the name — never from
// skin tone: every default uses the same friendly cartoon complexion, so there
// are no realistic/dark "default faces". Pioneers get an ultra-rare golden one.
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
// One friendly, non-realistic cartoon complexion for every default cowboy.
const SKIN = '#F5C6A0';
const EYE = '#3a2a20';

export function RingoAvatar({
  name,
  avatar,
  size = 44,
  pioneer = false,
}: {
  name?: string | null;
  avatar?: string | null;
  size?: number;
  pioneer?: boolean;
}) {
  if (avatar) {
    return <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />;
  }
  const h = hashStr((name || 'ringo').trim().toLowerCase() || 'ringo');
  if (pioneer) return <PioneerAvatar size={size} />;

  const sky = SKY[h % SKY.length];
  const hat = HAT[(h >> 5) % HAT.length];
  const band = BANDANA[(h >> 9) % BANDANA.length];
  const gid = `av${h % 100000}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ borderRadius: '50%', display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      {/* shoulders / bandana */}
      <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill={band[0]} />
      <path d="M38 80 L50 92 L62 80 Z" fill={band[1]} />
      {/* ears */}
      <circle cx="30" cy="58" r="4.5" fill={SKIN} />
      <circle cx="70" cy="58" r="4.5" fill={SKIN} />
      {/* face */}
      <circle cx="50" cy="57" r="22" fill={SKIN} />
      {/* eyes + smile */}
      <circle cx="42" cy="56" r="2.6" fill={EYE} />
      <circle cx="58" cy="56" r="2.6" fill={EYE} />
      <path d="M42 65 Q50 71 58 65" stroke={EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* cowboy hat: wide brim + rounded crown + band */}
      <ellipse cx="50" cy="40" rx="37" ry="8.5" fill={hat} />
      <path d="M31 41 Q31 17 50 17 Q69 17 69 41 Z" fill={hat} />
      <rect x="31" y="36.5" width="38" height="5.5" rx="2.5" fill="rgba(0,0,0,0.22)" />
    </svg>
  );
}

// The ultra-rare Pioneer avatar — a golden cowboy on a deep founder-dusk sky,
// gold hat with a star, a sparkle, and a gold founder badge. Everyone who holds
// a Pioneer code gets this; it's visibly not one of the ordinary defaults.
function PioneerAvatar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ borderRadius: '50%', display: 'block' }}>
      <defs>
        <linearGradient id="pio-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F0733A" />
          <stop offset="1" stopColor="#7E3A73" />
        </linearGradient>
        <linearGradient id="pio-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE79A" />
          <stop offset="0.5" stopColor="#F4C64B" />
          <stop offset="1" stopColor="#D9982A" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#pio-sky)" />
      {/* faint sparkle field */}
      <circle cx="24" cy="30" r="1.6" fill="rgba(255,255,255,0.85)" />
      <circle cx="80" cy="24" r="1.1" fill="rgba(255,255,255,0.7)" />
      <circle cx="18" cy="66" r="1.1" fill="rgba(255,255,255,0.6)" />
      {/* shoulders / gold bandana */}
      <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill="url(#pio-gold)" />
      <path d="M38 80 L50 92 L62 80 Z" fill="#B9821F" />
      {/* ears + face */}
      <circle cx="30" cy="58" r="4.5" fill={SKIN} />
      <circle cx="70" cy="58" r="4.5" fill={SKIN} />
      <circle cx="50" cy="57" r="22" fill={SKIN} />
      {/* eyes + confident smile */}
      <circle cx="42" cy="56" r="2.6" fill={EYE} />
      <circle cx="58" cy="56" r="2.6" fill={EYE} />
      <path d="M42 65 Q50 71 58 65" stroke={EYE} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* gold cowboy hat: brim + crown + band + centre star */}
      <ellipse cx="50" cy="40" rx="37" ry="8.5" fill="url(#pio-gold)" />
      <path d="M31 41 Q31 16 50 16 Q69 16 69 41 Z" fill="url(#pio-gold)" />
      <rect x="31" y="36.5" width="38" height="5.5" rx="2.5" fill="rgba(120,70,10,0.4)" />
      <path d="M50 22 l2.1 4.3 4.7 .6 -3.4 3.3 .8 4.7 -4.2 -2.2 -4.2 2.2 .8 -4.7 -3.4 -3.3 4.7 -.6 Z" fill="#FFF3C8" />
      {/* twinkle above the hat */}
      <path d="M78 44 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="rgba(255,244,200,0.95)" />
      {/* gold founder badge, bottom-right */}
      <circle cx="78" cy="80" r="13" fill="url(#pio-gold)" stroke="#FFFFFF" strokeWidth="2.5" />
      <path d="M78 72.5 l1.7 3.5 3.9 .5 -2.8 2.7 .7 3.9 -3.5 -1.9 -3.5 1.9 .7 -3.9 -2.8 -2.7 3.9 -.5 Z" fill="#8A5A12" />
    </svg>
  );
}
