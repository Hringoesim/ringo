// Avatar.tsx — the user's photo, or a fun seeded "cowboy" default. Each person
// gets a distinct cowboy (hat / skin / sky colours derived from their name), so
// empty accounts still feel personal.
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
const SKIN = ['#F3CBA6', '#E7B183', '#CE9260', '#A56A3C', '#7C4A25'];

export function RingoAvatar({ name, avatar, size = 44 }: { name?: string | null; avatar?: string | null; size?: number }) {
  if (avatar) {
    return <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />;
  }
  const h = hashStr((name || 'ringo').trim().toLowerCase() || 'ringo');
  const sky = SKY[h % SKY.length];
  const hat = HAT[(h >> 5) % HAT.length];
  const skin = SKIN[(h >> 9) % SKIN.length];
  const gid = `av${h % 100000}`;
  const eye = '#3a2a20';
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
      <path d="M20 100 Q20 78 50 78 Q80 78 80 100 Z" fill="#C0392B" />
      <path d="M38 80 L50 92 L62 80 Z" fill="#E05545" />
      {/* ears */}
      <circle cx="30" cy="58" r="4.5" fill={skin} />
      <circle cx="70" cy="58" r="4.5" fill={skin} />
      {/* face */}
      <circle cx="50" cy="57" r="22" fill={skin} />
      {/* eyes + smile */}
      <circle cx="42" cy="56" r="2.6" fill={eye} />
      <circle cx="58" cy="56" r="2.6" fill={eye} />
      <path d="M42 65 Q50 71 58 65" stroke={eye} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* cowboy hat: wide brim + rounded crown + band */}
      <ellipse cx="50" cy="40" rx="37" ry="8.5" fill={hat} />
      <path d="M31 41 Q31 17 50 17 Q69 17 69 41 Z" fill={hat} />
      <rect x="31" y="36.5" width="38" height="5.5" rx="2.5" fill="rgba(0,0,0,0.22)" />
    </svg>
  );
}
