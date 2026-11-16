// Avatar.tsx: the member's own photo, or their Ringo cowboy (the default
// avatar of July 2026, back for Ringo Rewards). Personalisation comes from
// the hat and outfit colours seeded from the email, never from skin tone:
// every default wears the same friendly cartoon complexion. The level shows
// twice: a ring in the level's colour, and from Diamond up the avatar itself
// changes (an ice sky and ice-blue gear with a gem, then the northern lights).
//
// A Ringo Pioneer outranks the level here (owner 2026-10-24: "Pioneers did
// not get a special badge"): the July golden cowboy comes back (gold star hat,
// gold bandana, sparkles on a founder dusk sky), in a gold ring, with a gold
// star medallion at the bottom right, whatever their Rewards level. A Pioneer
// who added their own photo keeps the gold ring and the medallion.
import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RC } from '../theme';
import { avatarPhoto, avatarTraveller } from '../store/avatar';
import { levelColor, PIONEER_GOLD } from './profile/format';
import { TextLink } from './ui';
import { hapticSelection } from '../lib/haptics';
import { t, t as tr, tk } from '../lib/i18n';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const HAT = ['#7A4A24', '#9C6B3F', '#5E3A1E', '#B07A44', '#4E3320'];
const BANDANA: [string, string][] = [
  ['#C0392B', '#E05545'], ['#2E7D5B', '#3FA978'], ['#2B6CB0', '#4A90D9'],
  ['#8E44AD', '#A569BD'], ['#D68910', '#F0A83B'],
];
const STAR = 'M12 2.8l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.1 6.4 20l1.1-6.2L3 9.4l6.2-.9z';

/** The Ringo travellers a member can pick (owner 2026-10-25); cowboy is the default. */
export const TRAVELLERS: { id: string; name: string }[] = [
  { id: 'cowboy', name: tk('Cowboy') },
  { id: 'backpacker', name: tk('Backpacker') },
  { id: 'pilot', name: tk('Pilot') },
  { id: 'explorer', name: tk('Explorer') },
  { id: 'skier', name: tk('Skier') },
  { id: 'surfer', name: tk('Surfer') },
  { id: 'captain', name: tk('Captain') },
  { id: 'parisian', name: tk('City break') },
];

// The drawing (owner 2026-11-16, "some seem very mild and crayon like"): every
// traveller shares one shaded face (HEAD) and one pair of shoulders (BODY),
// stands in a place of their own (Scene) and wears shaded gear (outfit). Still
// pure SVG on a 100 by 100 board, so the app carries no image files for it.
const HEAD = 'M29.5 54 Q29.5 34 50 34 Q70.5 34 70.5 54 Q70.5 69.5 59.5 75 Q50 79.5 40.5 75 Q29.5 69.5 29.5 54Z';
const BODY = 'M15 100 Q16 81 36 77 L42 76 Q50 86 58 76 L64 77 Q84 81 85 100Z';
const HAIR = '#5A3B28';
const SPARK = 'l1.5 3.3 3.3 1.5 -3.3 1.5 -1.5 3.3 -1.5 -3.3 -3.3 -1.5 3.3 -1.5Z';

/** The sky behind each traveller, top to bottom. */
const SCENE_SKY: Record<string, [string, string]> = {
  cowboy: ['#FFC57E', '#FF7458'], backpacker: ['#9EDBFF', '#E4F8EC'], pilot: ['#3F97F2', '#C6E8FF'],
  explorer: ['#FFE7A0', '#FFBB5C'], skier: ['#7CC7FF', '#EAF7FF'], surfer: ['#FF8FA8', '#FFD08A'],
  captain: ['#8FD4FF', '#EAF8FF'], parisian: ['#FFB9CF', '#FFE8C4'],
  diamond: ['#DDF5FF', '#86CFEC'], aurora: ['#0B2233', '#2A1650'], pioneer: ['#F0733A', '#6A2F74'],
};
/** The glass of the goggles and sunglasses. */
const LENS: Record<string, [string, string]> = { pilot: ['#E6F6FF', '#6DB8EE'], skier: ['#FFD166', '#E0478C'] };

/** The same shapes on the left and, mirrored, on the right. */
function Both({ children }: { children: ReactNode }) {
  return (<>{children}<g transform="translate(100 0) scale(-1 1)">{children}</g></>);
}

/** A shape in its colour with the shared light on top: lit from above, darker below. */
function Shaded({ d, fill, sh, stroke }: { d: string; fill: string; sh: string; stroke?: string }) {
  return (<><path d={d} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.8 : undefined} /><path d={d} fill={sh} /></>);
}

function Cloud({ x, y, s, o = 0.95 }: { x: number; y: number; s: number; o?: number }) {
  return (
    <g fill="#fff" opacity={o} transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="10" ry="4" /><circle cx="-4" cy="-3" r="4" /><circle cx="2" cy="-4.5" r="5" /><circle cx="7" cy="-2" r="3.2" />
    </g>
  );
}

/** Where the traveller stands. Diamond and Aurora members stand under their level's sky, a Pioneer at founder dusk. */
function Scene({ kind }: { kind: string }) {
  switch (kind) {
    case 'cowboy':
      return (<>
        <circle cx="76" cy="30" r="20" fill="#FFF1C2" opacity=".28" /><circle cx="76" cy="30" r="12" fill="#FFF3CC" />
        <path d="M0 72 L0 56 L9 56 L11 50 L22 50 L24 58 L33 60 L35 100 L0 100Z" fill="#B8442F" opacity=".6" />
        <path d="M100 76 L100 60 L92 60 L90 54 L82 54 L80 62 L72 64 L70 100 L100 100Z" fill="#B8442F" opacity=".5" />
        <path d="M0 84 Q50 76 100 84 L100 100 L0 100Z" fill="#9E3A2A" opacity=".55" />
        <g fill="#2F6E52"><rect x="8.5" y="66" width="3.6" height="17" rx="1.8" /><path d="M4.5 70 q0 6 5 6 v-2.4 q-2.6 0 -2.6 -3.6z" /><path d="M16.2 67 q0 6 -5 6 v-2.4 q2.6 0 2.6 -3.6z" /></g>
      </>);
    case 'backpacker':
      return (<>
        <circle cx="18" cy="20" r="8" fill="#FFF6CF" opacity=".9" /><Cloud x={84} y={18} s={0.8} o={0.9} />
        <path d="M-6 82 L18 42 L34 68 L44 56 L60 82Z" fill="#6C9FC4" /><path d="M18 42 L23.5 51 L19 49 L15.5 51.5 L12.8 50.6Z" fill="#fff" />
        <path d="M52 82 L81 38 L108 82Z" fill="#5488B2" /><path d="M81 38 L87.5 48 L83 46 L80 50 L75 47Z" fill="#fff" />
        <path d="M0 80 Q25 68 50 78 T100 74 L100 100 L0 100Z" fill="#5FBE7C" />
        <g fill="#2B7A52"><path d="M7 80 L11.5 66 L16 80Z" /><path d="M14 82 L18 71 L22 82Z" /><path d="M86 78 L90 66 L94 78Z" /></g>
      </>);
    case 'pilot':
      return (<>
        <Cloud x={14} y={30} s={1.1} /><Cloud x={88} y={22} s={0.9} /><Cloud x={10} y={72} s={1.3} o={0.85} /><Cloud x={90} y={66} s={1.2} o={0.9} />
        <path d="M58 9 L96 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
      </>);
    case 'explorer':
      return (<>
        <circle cx="20" cy="24" r="16" fill="#FFF8DC" opacity=".4" /><circle cx="20" cy="24" r="9.5" fill="#FFF8DC" />
        <path d="M0 70 Q20 56 42 68 T100 58 L100 100 L0 100Z" fill="#F2AC4C" /><path d="M0 84 Q35 68 60 80 T100 76 L100 100 L0 100Z" fill="#DE8B32" />
        <path d="M88 76 Q86 64 89.5 54" stroke="#7A4A24" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g stroke="#2F8A5B" strokeWidth="2.4" fill="none" strokeLinecap="round"><path d="M89.5 54 Q82 48 76 53" /><path d="M89.5 54 Q84 43 77 43" /><path d="M89.5 54 Q92 44 99 45" /><path d="M89.5 54 Q96 51 101 57" /></g>
      </>);
    case 'skier':
      return (<>
        <path d="M-8 82 L20 36 L44 82Z" fill="#E7F3FD" /><path d="M20 36 L44 82 L27 82 L23 58Z" fill="#B3D3EE" />
        <path d="M56 82 L84 32 L110 82Z" fill="#F4FAFF" /><path d="M84 32 L110 82 L93 82 L88 56Z" fill="#BCD9F0" />
        <path d="M0 82 Q50 73 100 82 L100 100 L0 100Z" fill="#fff" />
        <g fill="#2B7A52"><path d="M6 82 L10 69 L14 82Z" /><path d="M88 80 L92 68 L96 80Z" /></g>
        <g fill="#fff"><path d="M8 74 L10 69 L12 74Z" /><path d="M90 73 L92 68 L94 73Z" /></g>
        <g fill="#fff"><circle cx="12" cy="16" r="1.3" /><circle cx="30" cy="9" r="1" /><circle cx="68" cy="8" r="1.2" /><circle cx="90" cy="18" r="1.4" /><circle cx="6" cy="44" r="1" /><circle cx="95" cy="48" r="1.1" /></g>
      </>);
    case 'surfer':
      return (<>
        <circle cx="24" cy="60" r="19" fill="#FFF1C2" opacity=".35" /><circle cx="24" cy="60" r="12" fill="#FFF3CC" />
        <rect y="60" width="100" height="40" fill="#22A9BD" /><rect y="60" width="100" height="3" fill="#7DE0E3" opacity=".7" />
        <path d="M4 68 h12 M8 73 h9" stroke="#FFF3CC" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
        <path d="M62 100 Q62 70 82 61 Q96 56 102 66 Q95 62 88 66 Q79 73 82 100Z" fill="#59D6DA" />
        <path d="M82 61 Q96 56 102 66" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g stroke="#2B8A5E" strokeWidth="2.6" fill="none" strokeLinecap="round"><path d="M-2 4 Q10 6 16 16" /><path d="M-2 0 Q14 -1 24 8" /><path d="M-2 10 Q6 13 8 22" /></g>
      </>);
    case 'captain':
      return (<>
        <Cloud x={18} y={18} s={0.9} o={0.9} />
        <rect y="64" width="100" height="36" fill="#2A78BC" /><rect y="64" width="100" height="2.4" fill="#9ED8FF" opacity=".7" />
        <path d="M15.5 44 L15.5 62 L25 62Z" fill="#fff" /><path d="M14 49 L14 62 L7.5 62Z" fill="#FFCFC2" /><path d="M6 63.5 L26 63.5 L23 68 L9 68Z" fill="#fff" />
        <path d="M83 64 L84.5 44 L91.5 44 L93 64Z" fill="#fff" /><path d="M84.1 50 h7.8 l.4 5 h-8.6z" fill="#E0483E" />
        <rect x="83.5" y="40" width="9" height="4.4" rx="1" fill="#24345E" /><path d="M84.5 40 L88 35.5 L91.5 40Z" fill="#E0483E" /><rect x="86.4" y="40.8" width="3.2" height="2.8" fill="#FFE79A" />
        <path d="M76 68 h28 v-4 h-24z" fill="#5A6B7C" />
        <g stroke="#24345E" strokeWidth="1.2" fill="none" strokeLinecap="round"><path d="M66 20 q2.5 -3 5 0 q2.5 -3 5 0" /><path d="M79 28 q2 -2.4 4 0 q2 -2.4 4 0" /></g>
      </>);
    case 'parisian':
      return (<>
        <circle cx="20" cy="26" r="9" fill="#FFF6E0" opacity=".9" />
        <g fill="#A66A9B" opacity=".75"><path d="M0 100 L0 58 L5 53 L16 53 L20 58 L20 100Z" /><path d="M20 100 L20 66 L30 63 L30 100Z" /><path d="M72 100 L72 68 L78 68 L78 100Z" /></g>
        <g fill="#FFE8C4" opacity=".8"><rect x="4" y="62" width="3" height="4" /><rect x="11" y="62" width="3" height="4" /><rect x="4" y="71" width="3" height="4" /><rect x="11" y="71" width="3" height="4" /></g>
        <path d="M86 24 L88 24 L89.6 48 L96 82 L91.5 82 Q87 66 82.5 82 L78 82 L84.4 48Z" fill="#7C4F86" />
        <path d="M82.6 50 h8.8 M80.6 64 h12.8" stroke="#7C4F86" strokeWidth="2" /><path d="M87 18 v6" stroke="#7C4F86" strokeWidth="1.2" />
      </>);
    case 'diamond':
      return (<>
        <path d="M-8 84 L16 42 L38 84Z" fill="#F6FDFF" opacity=".9" /><path d="M16 42 L38 84 L24 84 L19 62Z" fill="#A5DBF1" opacity=".85" />
        <path d="M60 84 L86 38 L112 84Z" fill="#F6FDFF" opacity=".9" /><path d="M86 38 L112 84 L95 84 L90 60Z" fill="#A5DBF1" opacity=".85" />
        <path d="M0 84 Q50 76 100 84 L100 100 L0 100Z" fill="#fff" opacity=".85" />
        <g fill="#fff"><path d={`M14 14 ${SPARK}`} /><path d={`M90 16 ${SPARK}`} /><circle cx="68" cy="9" r="1.2" /><circle cx="32" cy="10" r="1" /><circle cx="6" cy="40" r="1" /></g>
      </>);
    case 'aurora':
      return (<>
        <path d="M-5 30 C20 10 40 34 60 18 S95 14 105 6 L105 30 C85 36 70 44 52 36 S15 44 -5 52 Z" fill="#2FD39A" opacity=".6" />
        <path d="M-5 44 C25 30 45 48 70 34 S100 32 105 26 L105 40 C80 48 60 56 40 48 S10 56 -5 62 Z" fill="#8652E0" opacity=".5" />
        <g fill="#fff"><circle cx="18" cy="12" r="1.3" /><circle cx="84" cy="50" r="1" /><circle cx="92" cy="12" r="1.1" /><circle cx="40" cy="8" r="0.9" /><circle cx="8" cy="64" r="0.9" /></g>
        <path d="M0 82 Q30 70 55 80 T100 74 L100 100 L0 100Z" fill="#081421" />
      </>);
    case 'pioneer':
      return (<>
        <circle cx="78" cy="28" r="22" fill="#FFD27A" opacity=".22" />
        <path d="M0 76 L0 60 L9 60 L11 54 L22 54 L24 62 L33 64 L35 100 L0 100Z" fill="#3E1B4D" opacity=".55" />
        <path d="M100 78 L100 62 L92 62 L90 56 L82 56 L80 64 L72 66 L70 100 L100 100Z" fill="#3E1B4D" opacity=".5" />
        <g fill="#FFF3C8"><path d={`M20 22 ${SPARK}`} /><path d={`M84 40 ${SPARK}`} /><path d={`M79 60 ${SPARK}`} /><circle cx="10" cy="46" r="1.1" /><circle cx="90" cy="14" r="1.2" /><circle cx="66" cy="8" r="1" /><circle cx="34" cy="8" r="1" /></g>
      </>);
    default:
      return null;
  }
}

/** The cowboy hat, in a member's colour or a Pioneer's gold; `children` is what sits on it (a stud, a star). */
function CowboyHat({ fill, band, sh, children }: { fill: string; band: string; sh: string; children?: ReactNode }) {
  return (<>
    <Shaded d="M10 41 Q13 32 27 37 Q50 45.5 73 37 Q87 32 90 41 Q84 50.5 50 50.5 Q16 50.5 10 41Z" fill={fill} sh={sh} />
    <path d="M14 44.5 Q50 54 86 44.5 Q80 50.5 50 50.5 Q20 50.5 14 44.5Z" fill="#000" opacity=".2" />
    <Shaded d="M31 42 Q28 21 39 16.5 Q50 21.5 61 16.5 Q72 21 69 42 Q50 47 31 42Z" fill={fill} sh={sh} />
    <path d="M43 19 Q50 27 57 19" stroke="#000" strokeOpacity=".2" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M30.8 37.3 Q50 42.8 69.2 37.3 L69.4 42 Q50 47.2 30.6 42Z" fill={band} />
    {children}
    <path d="M35 36.5 Q33.5 25 40 20.5" stroke="#fff" strokeOpacity=".32" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </>);
}

function Bandana({ fill, fold, sh }: { fill: string; fold: string; sh: string }) {
  return (<>
    <Shaded d="M33 77 Q50 85.5 67 77 Q62 86 50 97.5 Q38 86 33 77Z" fill={fill} sh={sh} />
    <path d="M39 80.5 Q50 86.5 61 80.5" stroke={fold} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <g fill="#fff" opacity=".6"><circle cx="45" cy="87" r="1" /><circle cx="55" cy="87" r="1" /><circle cx="50" cy="91.5" r="1" /></g>
  </>);
}

type Gear = { back?: ReactNode; body: ReactNode; top: ReactNode };

// What each traveller wears: `back` sits behind the head, `body` on the
// shoulders, `top` over the face. `c` is the member's seeded colour, `d` its
// lighter partner, `hat` their hat brown; `u` prefixes this avatar's gradients.
function outfit(kind: string, c: string, d: string, hat: string, u: string): Gear {
  const sh = `url(#${u}g)`;
  const lens = `url(#${u}x)`;
  switch (kind) {
    case 'pioneer':
      return {
        body: (<><Shaded d={BODY} fill="#3A2140" sh={sh} /><Bandana fill={`url(#${u}au)`} fold="#B9821F" sh={sh} /></>),
        top: (
          <CowboyHat fill={`url(#${u}au)`} band="#A8741A" sh={sh}>
            <path d="M50 23.5 l2.3 4.7 5.1 .7 -3.7 3.6 .9 5.1 -4.6 -2.4 -4.6 2.4 .9 -5.1 -3.7 -3.6 5.1 -.7 Z" fill="#FFF6D6" />
          </CowboyHat>
        ),
      };
    case 'backpacker':
      return {
        back: <Shaded d="M21 100 L21 78 Q21 69 30 69 L70 69 Q79 69 79 78 L79 100Z" fill="#2F6B55" sh={sh} />,
        body: (<>
          <Shaded d={BODY} fill={d} sh={sh} />
          <Both><Shaded d="M30.5 78.6 Q33 90 32 100 L39.5 100 Q40.5 88 37.6 77Z" fill="#4E3320" sh={sh} /></Both>
          <path d="M37 92 L63 92" stroke="#4E3320" strokeWidth="2.6" /><rect x="46.5" y="90" width="7" height="4" rx="1.2" fill="#2B2F3A" />
        </>),
        top: (<>
          <Shaded d="M28.5 45 Q26 21.5 50 21 Q74 21.5 71.5 45 Q50 39.5 28.5 45Z" fill={c} sh={sh} />
          <path d="M50 21 L50 40.5 M39 23.5 Q36.5 33 37 42.4 M61 23.5 Q63.5 33 63 42.4" stroke="#000" strokeOpacity=".13" strokeWidth="1.1" fill="none" />
          <circle cx="50" cy="32" r="3.4" fill="none" stroke="#fff" strokeWidth="1.7" />
          <path d="M36 43.6 Q56 38.4 84 46.5 Q88 48 86.5 50.6 Q68 49 52 49.6 Q42 49.6 36 43.6Z" fill={c} />
          <path d="M36 43.6 Q56 38.4 84 46.5 Q88 48 86.5 50.6 Q68 49 52 49.6 Q42 49.6 36 43.6Z" fill="#000" opacity=".24" />
          <circle cx="50" cy="21.4" r="2" fill={d} />
        </>),
      };
    case 'pilot':
      return {
        body: (<>
          <Shaded d={BODY} fill="#7A4A24" sh={sh} /><path d="M50 90 L50 100" stroke="#D8B36A" strokeWidth="1.6" />
          <Shaded d="M27 86 Q28 75 41 76.5 Q48 78 50 85 Q52 78 59 76.5 Q72 75 73 86 Q62 94 50 90.5 Q38 94 27 86Z" fill="#F6E7CC" sh={sh} />
          <path d="M32 83 q2 -2 4 0 M40 86.5 q2 -2 4 0 M56 86.5 q2 -2 4 0 M64 83 q2 -2 4 0" stroke="#D2BC92" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </>),
        top: (<>
          <Shaded d="M27.5 63 Q22 23 50 22.5 Q78 23 72.5 63 Q70 66.5 67 62 Q69.5 38 50 37 Q30.5 38 33 62 Q30 66.5 27.5 63Z" fill="#8A552B" sh={sh} />
          <path d="M50 22.5 L50 31" stroke="#000" strokeOpacity=".18" strokeWidth="1.2" />
          <path d="M27.6 37 Q50 29.5 72.4 37 L72.8 43.2 Q50 35.6 27.2 43.2Z" fill="#3a2a20" />
          <Both><circle cx="41" cy="38.6" r="7.3" fill={lens} stroke="#D8B36A" strokeWidth="2.2" /></Both>
          <path d="M36.8 36.4 Q38.6 33.4 42.4 33.2 M54.8 36.4 Q56.6 33.4 60.4 33.2" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M48.3 38.6 h3.4" stroke="#D8B36A" strokeWidth="2.2" />
        </>),
      };
    case 'explorer':
      return {
        body: (<>
          <Shaded d={BODY} fill="#D2B981" sh={sh} /><path d="M30 79 L62 100 L69 100 L34.5 77.6Z" fill="#7A4A24" />
          <Both><path d="M39 76.5 L50 87 L43.5 92.5 L35 79.5Z" fill="#E6D2A0" /></Both>
          <Shaded d="M45 84.5 Q50 88.5 55 84.5 L52.8 93 L47.2 93Z" fill={c} sh={sh} />
        </>),
        top: (<>
          <Shaded d="M14 43 Q16 36 30 38.5 Q50 43 70 38.5 Q84 36 86 43 Q80 51 50 51 Q20 51 14 43Z" fill="#DCC78F" sh={sh} />
          <path d="M18 46 Q50 54 82 46 Q78 51 50 51 Q22 51 18 46Z" fill="#000" opacity=".16" />
          <Shaded d="M30.5 42 Q29 15.5 50 15 Q71 15.5 69.5 42 Q50 47 30.5 42Z" fill="#EAD9AA" sh={sh} />
          <path d="M30.4 36.3 Q50 41.8 69.6 36.3 L69.6 41.6 Q50 47 30.4 41.6Z" fill={c} /><ellipse cx="50" cy="15.8" rx="3.2" ry="1.4" fill="#C9B277" />
          <g fill="#000" opacity=".18"><circle cx="38" cy="27" r="1" /><circle cx="62" cy="27" r="1" /></g>
          <path d="M35 35.5 Q34 23 41 18.6" stroke="#fff" strokeOpacity=".4" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>),
      };
    case 'skier':
      return {
        body: (<>
          <Shaded d={BODY} fill={c} sh={sh} />
          <path d="M18.5 90 Q50 84 81.5 90 M16.5 97 Q50 91 83.5 97" stroke={d} strokeWidth="2.2" fill="none" opacity=".85" />
          <Shaded d="M35.5 80 Q50 73 64.5 80 L64.5 88 Q50 81.5 35.5 88Z" fill={d} sh={sh} />
          <path d="M50 78 L50 100" stroke="#fff" strokeOpacity=".75" strokeWidth="1.4" />
        </>),
        top: (<>
          <Shaded d="M28 46 Q25.5 20 50 19.5 Q74.5 20 72 46Z" fill={d} sh={sh} />
          <path d="M50 20 L50 38 M41 21.5 Q38.5 30 38.5 38 M59 21.5 Q61.5 30 61.5 38 M33.5 26 Q31.5 32 31.6 38 M66.5 26 Q68.5 32 68.4 38" stroke="#000" strokeOpacity=".12" strokeWidth="1.2" fill="none" />
          <Shaded d="M27 39.5 Q50 35.5 73 39.5 Q74.5 44 73 48.5 Q50 44.5 27 48.5 Q25.5 44 27 39.5Z" fill={c} sh={sh} />
          <path d="M34 39.4 v7.6 M42 38.3 v7.4 M50 38 v7.2 M58 38.3 v7.4 M66 39.4 v7.6" stroke="#000" strokeOpacity=".14" strokeWidth="1.1" />
          <circle cx="50" cy="14.5" r="7.4" fill="#E9EEF6" /><circle cx="48.2" cy="12.8" r="5" fill="#fff" />
          <path d="M26.8 28.5 Q50 24 73.2 28.5 L73.5 34.5 Q50 30 26.5 34.5Z" fill="#2B2F3A" />
          <path d="M33 26.6 Q50 23.4 67 26.6 Q70.4 27.6 70 32 Q69.6 36.6 66 37.2 Q57 38.2 53 35.4 Q50 33.8 47 35.4 Q43 38.2 34 37.2 Q30.4 36.6 30 32 Q29.6 27.6 33 26.6Z" fill={lens} stroke="#2B2F3A" strokeWidth="1.8" />
          <path d="M35 29.4 Q42 27.2 50 27.3" stroke="#fff" strokeOpacity=".75" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>),
      };
    case 'surfer':
      return {
        back: <path d="M25 60 Q18 30 38 25 Q50 15 64 23 Q84 28 75 60 Q72 66 70 58 L30 58 Q28 66 25 60Z" fill="#C98A2B" />,
        body: (<>
          <Shaded d={BODY} fill={c} sh={sh} /><path d="M42 76 L50 89 L58 76Z" fill="#E3A57C" />
          <path d="M42.5 78.5 Q50 88 57.5 78.5" stroke="#fff" strokeWidth="1.5" fill="none" strokeDasharray="0.1 2.5" strokeLinecap="round" />
          {[[28, 92], [70, 90], [62, 97], [36, 98]].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
              <g fill="#fff" opacity=".9"><circle cx="0" cy="-2" r="1.5" /><circle cx="1.9" cy="-.6" r="1.5" /><circle cx="1.2" cy="1.6" r="1.5" /><circle cx="-1.2" cy="1.6" r="1.5" /><circle cx="-1.9" cy="-.6" r="1.5" /></g>
              <circle r="1" fill="#FFD166" />
            </g>
          ))}
        </>),
        top: (<>
          <path d="M28.5 53 Q24 31 40 28 Q49 19 61 26 Q78 29 71.5 53 Q70 43 63 39 Q57 43 50 38.5 Q43 44 35.5 40 Q30 44 28.5 53Z" fill={`url(#${u}h)`} />
          <path d="M40 28.5 Q44 33 50 38.5 M61 26.5 Q60 33 63 39 M32 36 Q33 39 35.5 40" stroke="#fff" strokeOpacity=".4" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M33.5 55.5 L29.6 56.5 M66.5 55.5 L70.4 56.5" stroke="#1E1433" strokeWidth="1.8" strokeLinecap="round" />
          <Both>
            <rect x="33.4" y="51.2" width="14.8" height="10.4" rx="4.6" fill={lens} stroke="#1E1433" strokeWidth="1.4" />
            <path d="M36.4 54.4 Q39 52.8 42.5 52.8" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </Both>
          <path d="M48.2 55 Q50 53.4 51.8 55" stroke="#1E1433" strokeWidth="1.8" fill="none" />
        </>),
      };
    case 'captain':
      return {
        body: (<>
          <Shaded d={BODY} fill="#1F2A4D" sh={sh} /><path d="M42 76 L50 89 L58 76Z" fill="#fff" />
          <path d="M48.3 80 L51.7 80 L52.7 88.5 L50 92 L47.3 88.5Z" fill="#111827" />
          <Both>
            <path d="M42 76 L50 89 L44 96 L33.5 79Z" fill="#2B3A6B" /><path d="M20.5 87 Q27 81 34 79 L35.3 82.8 Q28.5 84.8 22.2 90.6Z" fill="#111B3A" />
            <path d="M22.4 86 l2.6 3.2 M25.6 83.8 l2.4 3.2 M28.8 82 l2.2 3.2" stroke="#F0C048" strokeWidth="1.1" /><circle cx="43" cy="97" r="1.7" fill="#F0C048" />
          </Both>
        </>),
        top: (<>
          <Shaded d="M24.5 38 Q22 20 50 18.5 Q78 20 75.5 38 Q50 32 24.5 38Z" fill="#FFFFFF" sh={sh} stroke="#D3DAE6" />
          <path d="M28.5 37 Q50 32 71.5 37 L71.3 44.6 Q50 39.6 28.7 44.6Z" fill="#1F2A4D" /><path d="M29 42.6 Q50 37.6 71 42.6" stroke="#F0C048" strokeWidth="1.3" fill="none" />
          <path d="M29.5 44.3 Q50 39.5 70.5 44.3 Q66 52.6 50 51.6 Q34 52.6 29.5 44.3Z" fill="#0F1424" />
          <path d="M35 46.4 Q50 42.8 65 46.4" stroke="#fff" strokeOpacity=".28" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="30.6" r="5.2" fill="#1F2A4D" stroke="#F0C048" strokeWidth="1.4" />
          <path d="M50 28.4 v5.2 M47.4 31.6 Q50 35 52.6 31.6 M48.5 29.8 h3" stroke="#F0C048" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </>),
      };
    case 'parisian':
      return {
        back: <path d="M27 67 Q21 34 50 31 Q79 34 73 67 Q71 71 68 66 L32 66 Q29 71 27 67Z" fill="#4A2F22" />,
        body: (<>
          <clipPath id={`${u}c`}><path d={BODY} /></clipPath>
          <path d={BODY} fill="#FAF7F2" />
          <g clipPath={`url(#${u}c)`} stroke="#24345E" strokeWidth="2.4" fill="none"><path d="M10 82 Q50 77 90 82" /><path d="M10 87.5 Q50 82.5 90 87.5" /><path d="M10 93 Q50 88 90 93" /><path d="M10 98.5 Q50 93.5 90 98.5" /></g>
          <path d={BODY} fill={sh} />
          <Shaded d="M35 77.5 Q50 86 65 77.5 Q64 84.5 50 88 Q36 84.5 35 77.5Z" fill={c} sh={sh} />
          <path d="M52 84.5 Q58.5 86.5 57.5 98 L51.5 96 Q53 89.5 50 87Z" fill={d} /><circle cx="51" cy="86.4" r="2.7" fill={c} />
        </>),
        top: (<>
          <path d="M29.8 52 Q29 35 50 34.5 Q71 35 70.2 52 Q67 44 58 42.5 Q44 41 36 46 Q32 48.5 29.8 52Z" fill={HAIR} />
          <g transform="rotate(-9 47 33.5)">
            <ellipse cx="47" cy="33.5" rx="27.5" ry="10.5" fill={c} /><ellipse cx="47" cy="33.5" rx="27.5" ry="10.5" fill={sh} /><ellipse cx="37" cy="29.5" rx="10" ry="3" fill="#fff" opacity=".22" />
          </g>
          <path d="M48 23 Q47.4 19.5 50 18.4" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>),
      };
    default: // the cowboy
      return {
        body: (<>
          <Shaded d={BODY} fill="#4A6FA5" sh={sh} />
          <Both><path d="M24 88 L30 100" stroke="#2F4C7A" strokeWidth="1.2" opacity=".6" /></Both>
          <Bandana fill={c} fold={d} sh={sh} />
        </>),
        top: <CowboyHat fill={hat} band={c} sh={sh}><circle cx="50" cy="42.6" r="2.1" fill="#F4C64B" /></CowboyHat>,
      };
  }
}

/** One finished avatar: the scene, the gear and the shared face, under one light. */
function Figure({ kind, scene, c, d, hat, size, gem }: { kind: string; scene: string; c: string; d: string; hat: string; size: number; gem?: 'diamond' | 'aurora' }) {
  const u = `av${useId().replace(/:/g, '')}`;
  const sky = SCENE_SKY[scene] || SCENE_SKY.cowboy;
  const lens = LENS[kind] || ['#1E1433', '#4B5FC0'];
  const gear = outfit(kind, c, d, hat, u);
  const cowboy = kind === 'cowboy' || kind === 'pioneer';
  const brim = cowboy || kind === 'backpacker' || kind === 'explorer' || kind === 'captain';
  const shades = kind === 'surfer';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id={`${u}b`} x1="0" y1="0" x2={scene === 'pioneer' || scene === 'aurora' ? 1 : 0} y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
        <linearGradient id={`${u}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".26" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" /></linearGradient>
        <radialGradient id={`${u}s`} cx=".38" cy=".3" r=".8"><stop offset="0" stopColor="#FFE0C2" /><stop offset=".55" stopColor="#F5C6A0" /><stop offset="1" stopColor="#E2A27A" /></radialGradient>
        <radialGradient id={`${u}l`} cx=".28" cy=".16" r=".75"><stop offset="0" stopColor="#fff" stopOpacity=".3" /><stop offset=".6" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${u}v`} x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stopColor="#1A0F2E" stopOpacity="0" /><stop offset="1" stopColor="#1A0F2E" stopOpacity=".22" /></linearGradient>
        <linearGradient id={`${u}x`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={lens[0]} /><stop offset="1" stopColor={lens[1]} /></linearGradient>
        <linearGradient id={`${u}h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBDD8C" /><stop offset="1" stopColor="#D9952C" /></linearGradient>
        <linearGradient id={`${u}au`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE79A" /><stop offset=".5" stopColor="#F4C64B" /><stop offset="1" stopColor="#D9982A" /></linearGradient>
        <clipPath id={`${u}f`}><path d={HEAD} /></clipPath>
      </defs>
      <rect width="100" height="100" fill={`url(#${u}b)`} />
      <Scene kind={scene} />
      {gear.back}
      <path d="M42.5 68 L42.5 84 Q50 89 57.5 84 L57.5 68Z" fill="#E7AC84" />
      {gear.body}
      <ellipse cx="50" cy="79.6" rx="8.6" ry="2.8" fill="#A8623A" opacity=".4" />
      <Both><circle cx="29.6" cy="58" r="4.3" fill="#F0BC94" /><circle cx="29.9" cy="58.2" r="2" fill="#DB9C74" /></Both>
      <path d={HEAD} fill={`url(#${u}s)`} />
      {brim && <ellipse cx="50" cy="44" rx="25" ry="9" fill="#A8623A" opacity=".34" clipPath={`url(#${u}f)`} />}
      {brim && <Both><path d="M29.6 54.5 Q28.6 46 32.6 44 L34.6 47.5 Q32.3 49.6 32.1 55Z" fill={HAIR} /></Both>}
      <Both><ellipse cx="36.4" cy="64.4" rx="4.2" ry="2.7" fill="#FF8473" opacity={kind === 'skier' ? 0.5 : 0.34} /></Both>
      {!shades && <Both><path d="M38.4 51.4 Q42 49.5 45.6 51.1" stroke={HAIR} strokeWidth="1.7" fill="none" strokeLinecap="round" /></Both>}
      {!shades && <Both><ellipse cx="42" cy="56.8" rx="2.5" ry="3.1" fill="#2E2019" /><circle cx="42.9" cy="55.6" r=".95" fill="#fff" /></Both>}
      <path d="M48.6 62.2 Q50 63.6 51.4 62.2" stroke="#C98A62" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M43.4 66.4 Q50 72.6 56.6 66.4" stroke="#5A2B22" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {gear.top}
      {gem && <path d={cowboy ? 'M50 23.5 l4.6 4.6 -4.6 6.6 -4.6 -6.6 Z' : 'M84 10 l5 5 -5 7 -5 -7 Z'} fill={gem === 'aurora' ? '#2FD39A' : '#FFFFFF'} stroke={gem === 'aurora' ? '#B9FFE4' : '#2B8FB8'} strokeWidth="1.2" />}
      <rect width="100" height="100" fill={`url(#${u}l)`} /><rect width="100" height="100" fill={`url(#${u}v)`} />
    </svg>
  );
}

function Traveller({ seed, level, size, kind }: { seed: string; level: string | null; size: number; kind: string }) {
  const h = hashStr(seed.trim().toLowerCase() || 'ringo');
  const diamond = level === 'diamond';
  const aurora = level === 'aurora';
  const who = TRAVELLERS.some((t) => t.id === kind) ? kind : 'cowboy';
  const hat = aurora ? '#1E1433' : diamond ? '#5CC4E8' : HAT[(h >>> 5) % HAT.length];
  const band = aurora ? ['#2FD39A', '#8652E0'] : diamond ? ['#2B8FB8', '#7FD3F0'] : BANDANA[(h >>> 9) % BANDANA.length];
  return <Figure kind={who} scene={aurora ? 'aurora' : diamond ? 'diamond' : who} c={band[0]} d={band[1]} hat={hat} size={size} gem={aurora ? 'aurora' : diamond ? 'diamond' : undefined} />;
}

// The ultra-rare Pioneer avatar of July 2026 (0a02585): a golden cowboy on a
// deep founder-dusk sky, gold hat with a star, gold bandana and sparkles.
// The gold founder badge sits outside the circle (see PioneerMedallion) so it
// is never clipped.
export function PioneerAvatar({ size }: { size: number }) {
  return <Figure kind="pioneer" scene="pioneer" c="#F4C64B" d="#B9821F" hat="#F4C64B" size={size} />;
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
      aria-label={pioneer ? t('Your Ringo Pioneer avatar') : t('Your avatar')}
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

/**
 * The travellers as a big grid (owner 2026-10-26): the onboarding pick and the
 * sheet behind a tap on the avatar. The pick sticks on this phone; the one
 * just picked hops.
 */
export function TravellerGrid({ userId, seed, level, pioneer = false, tile = 84, onPick }: { userId: string; seed: string; level: string | null; pioneer?: boolean; tile?: number; onPick?: (id: string) => void }) {
  const photo = avatarPhoto.use(userId);
  const kind = avatarTraveller.use(userId);
  const current = photo ? null : kind;
  const [hop, setHop] = useState<string | null>(null);
  return (
    <div role="radiogroup" aria-label={t('Pick your traveller')} style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${tile + 8}px, 1fr))`, gap: 14 }}>
      {TRAVELLERS.map((t) => {
        const on = current === t.id;
        return (
          <button
            key={t.id} type="button" role="radio" aria-checked={on} aria-label={tr(t.name)} className="press"
            onClick={() => {
              // A photo lives only on this phone: never thrown away by one stray tap.
              if (photo && !window.confirm(tr('Use this traveller instead of your photo? Your photo will be removed from this phone.'))) return;
              hapticSelection(); avatarPhoto.clear(userId); avatarTraveller.set(userId, t.id); setHop(t.id); onPick?.(t.id);
            }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 0', borderRadius: 20, border: `2px solid ${on ? RC.orangeInk : RC.line}`, background: on ? '#FFF1E8' : '#fff', cursor: 'pointer' }}
          >
            <span key={hop === t.id ? `hop-${t.id}` : t.id} className={hop === t.id ? 'hop' : undefined} style={{ width: tile, height: tile, borderRadius: '50%', overflow: 'hidden', display: 'block' }}>
              {pioneer && t.id === 'cowboy' ? <PioneerAvatar size={tile} /> : <Traveller seed={seed} level={level} size={tile} kind={t.id} />}
            </span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: on ? 700 : 600, color: on ? RC.ink : RC.ink2, whiteSpace: 'nowrap' }}>{tr(t.name)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A tap on the avatar: change the traveller, or use a photo. */
export function TravellerSheet({ userId, seed, level, pioneer = false, onClose }: { userId: string; seed: string; level: string | null; pioneer?: boolean; onClose: () => void }) {
  const titleId = useId();
  // On document.body, so it sits over the tab bar and outside the screen's own stacking.
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,15,46,0.46)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'ringoFadeIn 0.24s ease both' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="rise"
        style={{ width: '100%', maxWidth: 560, maxHeight: 'calc(86vh - var(--kb, 0px))', overflowY: 'auto', boxSizing: 'border-box', background: RC.paper, borderRadius: '24px 24px 0 0', padding: '20px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div id={titleId} style={{ fontFamily: 'var(--font)', fontSize: 22, fontWeight: 800, color: RC.ink }}>{t('Your traveller')}</div>
          <button type="button" className="press" onClick={onClose} style={{ border: 'none', background: RC.cream, borderRadius: 999, padding: '10px 16px', fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: RC.ink, cursor: 'pointer' }}>{t('Done')}</button>
        </div>
        <TravellerGrid userId={userId} seed={seed} level={level} pioneer={pioneer} tile={72} />
        <div style={{ marginTop: 18 }}>
          <PhotoLinks userId={userId} pioneer={pioneer} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** "Add a photo" / "Use my Ringo avatar": the photo stays on this phone. */
function PhotoLinks({ userId, pioneer }: { userId: string; pioneer: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const photo = avatarPhoto.use(userId);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <input ref={input} type="file" accept="image/*" hidden aria-hidden
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void avatarPhoto.set(userId, f).then((ok) => setFailed(!ok)); }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 24, rowGap: 8 }}>
        <TextLink align="left" onClick={() => { setFailed(false); input.current?.click(); }}>{photo ? t('Change photo') : t('Use a photo instead')}</TextLink>
        {photo && <TextLink align="left" color={RC.ink2} onClick={() => avatarPhoto.clear(userId)}>{pioneer ? t('Use my golden avatar') : t('Use my Ringo avatar')}</TextLink>}
      </div>
      {failed && <div role="alert" style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 15, color: RC.error }}>{t('That photo could not be used. Try another one.')}</div>}
    </div>
  );
}
