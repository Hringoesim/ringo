// countries.ts: every ISO 3166-1 country and territory for the survey's
// pickers, as [ISO2, English name, dial code]. The first 199 are the
// website's own list (src/App.jsx COUNTRY_DATA_RAW, same names and dial
// codes); the remaining territories complete ISO 3166. The survey stores the
// ISO2 code only, never the name.
export interface Country {
  iso: string;
  name: string;
  dial: string;
  flag: string;
}

const RAW: [string, string, string][] = [
  ["AF", "Afghanistan", "+93"], ["AL", "Albania", "+355"], ["DZ", "Algeria", "+213"],
  ["AD", "Andorra", "+376"], ["AO", "Angola", "+244"], ["AG", "Antigua and Barbuda", "+1268"],
  ["AR", "Argentina", "+54"], ["AM", "Armenia", "+374"], ["AU", "Australia", "+61"],
  ["AT", "Austria", "+43"], ["AZ", "Azerbaijan", "+994"], ["BS", "Bahamas", "+1242"],
  ["BH", "Bahrain", "+973"], ["BD", "Bangladesh", "+880"], ["BB", "Barbados", "+1246"],
  ["BY", "Belarus", "+375"], ["BE", "Belgium", "+32"], ["BZ", "Belize", "+501"],
  ["BJ", "Benin", "+229"], ["BT", "Bhutan", "+975"], ["BO", "Bolivia", "+591"],
  ["BA", "Bosnia and Herzegovina", "+387"], ["BW", "Botswana", "+267"], ["BR", "Brazil", "+55"],
  ["BN", "Brunei", "+673"], ["BG", "Bulgaria", "+359"], ["BF", "Burkina Faso", "+226"],
  ["BI", "Burundi", "+257"], ["KH", "Cambodia", "+855"], ["CM", "Cameroon", "+237"],
  ["CA", "Canada", "+1"], ["CV", "Cape Verde", "+238"], ["CF", "Central African Republic", "+236"],
  ["TD", "Chad", "+235"], ["CL", "Chile", "+56"], ["CN", "China", "+86"],
  ["CO", "Colombia", "+57"], ["KM", "Comoros", "+269"], ["CG", "Congo", "+242"],
  ["CD", "Congo (DRC)", "+243"], ["CR", "Costa Rica", "+506"], ["CI", "Côte d’Ivoire", "+225"],
  ["HR", "Croatia", "+385"], ["CU", "Cuba", "+53"], ["CY", "Cyprus", "+357"],
  ["CZ", "Czech Republic", "+420"], ["DK", "Denmark", "+45"], ["DJ", "Djibouti", "+253"],
  ["DM", "Dominica", "+1767"], ["DO", "Dominican Republic", "+1809"], ["EC", "Ecuador", "+593"],
  ["EG", "Egypt", "+20"], ["SV", "El Salvador", "+503"], ["GQ", "Equatorial Guinea", "+240"],
  ["ER", "Eritrea", "+291"], ["EE", "Estonia", "+372"], ["SZ", "Eswatini", "+268"],
  ["ET", "Ethiopia", "+251"], ["FJ", "Fiji", "+679"], ["FI", "Finland", "+358"],
  ["FR", "France", "+33"], ["GA", "Gabon", "+241"], ["GM", "Gambia", "+220"],
  ["GE", "Georgia", "+995"], ["DE", "Germany", "+49"], ["GH", "Ghana", "+233"],
  ["GR", "Greece", "+30"], ["GD", "Grenada", "+1473"], ["GT", "Guatemala", "+502"],
  ["GN", "Guinea", "+224"], ["GW", "Guinea-Bissau", "+245"], ["GY", "Guyana", "+592"],
  ["HT", "Haiti", "+509"], ["HN", "Honduras", "+504"], ["HK", "Hong Kong", "+852"],
  ["HU", "Hungary", "+36"], ["IS", "Iceland", "+354"], ["IN", "India", "+91"],
  ["ID", "Indonesia", "+62"], ["IR", "Iran", "+98"], ["IQ", "Iraq", "+964"],
  ["IE", "Ireland", "+353"], ["IL", "Israel", "+972"], ["IT", "Italy", "+39"],
  ["JM", "Jamaica", "+1876"], ["JP", "Japan", "+81"], ["JO", "Jordan", "+962"],
  ["KZ", "Kazakhstan", "+7"], ["KE", "Kenya", "+254"], ["KI", "Kiribati", "+686"],
  ["KW", "Kuwait", "+965"], ["KG", "Kyrgyzstan", "+996"], ["LA", "Laos", "+856"],
  ["LV", "Latvia", "+371"], ["LB", "Lebanon", "+961"], ["LS", "Lesotho", "+266"],
  ["LR", "Liberia", "+231"], ["LY", "Libya", "+218"], ["LI", "Liechtenstein", "+423"],
  ["LT", "Lithuania", "+370"], ["LU", "Luxembourg", "+352"], ["MO", "Macau", "+853"],
  ["MG", "Madagascar", "+261"], ["MW", "Malawi", "+265"], ["MY", "Malaysia", "+60"],
  ["MV", "Maldives", "+960"], ["ML", "Mali", "+223"], ["MT", "Malta", "+356"],
  ["MH", "Marshall Islands", "+692"], ["MR", "Mauritania", "+222"], ["MU", "Mauritius", "+230"],
  ["MX", "Mexico", "+52"], ["FM", "Micronesia", "+691"], ["MD", "Moldova", "+373"],
  ["MC", "Monaco", "+377"], ["MN", "Mongolia", "+976"], ["ME", "Montenegro", "+382"],
  ["MA", "Morocco", "+212"], ["MZ", "Mozambique", "+258"], ["MM", "Myanmar", "+95"],
  ["NA", "Namibia", "+264"], ["NR", "Nauru", "+674"], ["NP", "Nepal", "+977"],
  ["NL", "Netherlands", "+31"], ["NZ", "New Zealand", "+64"], ["NI", "Nicaragua", "+505"],
  ["NE", "Niger", "+227"], ["NG", "Nigeria", "+234"], ["KP", "North Korea", "+850"],
  ["MK", "North Macedonia", "+389"], ["NO", "Norway", "+47"], ["OM", "Oman", "+968"],
  ["PK", "Pakistan", "+92"], ["PW", "Palau", "+680"], ["PS", "Palestine", "+970"],
  ["PA", "Panama", "+507"], ["PG", "Papua New Guinea", "+675"], ["PY", "Paraguay", "+595"],
  ["PE", "Peru", "+51"], ["PH", "Philippines", "+63"], ["PL", "Poland", "+48"],
  ["PT", "Portugal", "+351"], ["PR", "Puerto Rico", "+1787"], ["QA", "Qatar", "+974"],
  ["RO", "Romania", "+40"], ["RU", "Russia", "+7"], ["RW", "Rwanda", "+250"],
  ["KN", "Saint Kitts and Nevis", "+1869"], ["LC", "Saint Lucia", "+1758"], ["VC", "Saint Vincent and the Grenadines", "+1784"],
  ["WS", "Samoa", "+685"], ["SM", "San Marino", "+378"], ["ST", "São Tomé and Príncipe", "+239"],
  ["SA", "Saudi Arabia", "+966"], ["SN", "Senegal", "+221"], ["RS", "Serbia", "+381"],
  ["SC", "Seychelles", "+248"], ["SL", "Sierra Leone", "+232"], ["SG", "Singapore", "+65"],
  ["SK", "Slovakia", "+421"], ["SI", "Slovenia", "+386"], ["SB", "Solomon Islands", "+677"],
  ["SO", "Somalia", "+252"], ["ZA", "South Africa", "+27"], ["KR", "South Korea", "+82"],
  ["SS", "South Sudan", "+211"], ["ES", "Spain", "+34"], ["LK", "Sri Lanka", "+94"],
  ["SD", "Sudan", "+249"], ["SR", "Suriname", "+597"], ["SE", "Sweden", "+46"],
  ["CH", "Switzerland", "+41"], ["SY", "Syria", "+963"], ["TW", "Taiwan", "+886"],
  ["TJ", "Tajikistan", "+992"], ["TZ", "Tanzania", "+255"], ["TH", "Thailand", "+66"],
  ["TL", "Timor-Leste", "+670"], ["TG", "Togo", "+228"], ["TO", "Tonga", "+676"],
  ["TT", "Trinidad and Tobago", "+1868"], ["TN", "Tunisia", "+216"], ["TR", "Turkey", "+90"],
  ["TM", "Turkmenistan", "+993"], ["TV", "Tuvalu", "+688"], ["UG", "Uganda", "+256"],
  ["UA", "Ukraine", "+380"], ["AE", "United Arab Emirates", "+971"], ["GB", "United Kingdom", "+44"],
  ["US", "United States", "+1"], ["UY", "Uruguay", "+598"], ["UZ", "Uzbekistan", "+998"],
  ["VU", "Vanuatu", "+678"], ["VA", "Vatican City", "+39"], ["VE", "Venezuela", "+58"],
  ["VN", "Vietnam", "+84"], ["YE", "Yemen", "+967"], ["ZM", "Zambia", "+260"],
  ["ZW", "Zimbabwe", "+263"], ["AI", "Anguilla", "+1264"], ["AQ", "Antarctica", "+672"],
  ["AS", "American Samoa", "+1684"], ["AW", "Aruba", "+297"], ["AX", "Åland Islands", "+358"],
  ["BL", "Saint Barthélemy", "+590"], ["BM", "Bermuda", "+1441"], ["BQ", "Caribbean Netherlands", "+599"],
  ["BV", "Bouvet Island", "+47"], ["CC", "Cocos (Keeling) Islands", "+61"], ["CK", "Cook Islands", "+682"],
  ["CW", "Curaçao", "+599"], ["CX", "Christmas Island", "+61"], ["EH", "Western Sahara", "+212"],
  ["FK", "Falkland Islands", "+500"], ["FO", "Faroe Islands", "+298"], ["GF", "French Guiana", "+594"],
  ["GG", "Guernsey", "+44"], ["GI", "Gibraltar", "+350"], ["GL", "Greenland", "+299"],
  ["GP", "Guadeloupe", "+590"], ["GS", "South Georgia and the South Sandwich Islands", "+500"], ["GU", "Guam", "+1671"],
  ["HM", "Heard Island and McDonald Islands", "+672"], ["IM", "Isle of Man", "+44"], ["IO", "British Indian Ocean Territory", "+246"],
  ["JE", "Jersey", "+44"], ["KY", "Cayman Islands", "+1345"], ["MF", "Saint Martin", "+590"],
  ["MP", "Northern Mariana Islands", "+1670"], ["MQ", "Martinique", "+596"], ["MS", "Montserrat", "+1664"],
  ["NC", "New Caledonia", "+687"], ["NF", "Norfolk Island", "+672"], ["NU", "Niue", "+683"],
  ["PF", "French Polynesia", "+689"], ["PM", "Saint Pierre and Miquelon", "+508"], ["PN", "Pitcairn Islands", "+64"],
  ["RE", "Réunion", "+262"], ["SH", "Saint Helena", "+290"], ["SJ", "Svalbard and Jan Mayen", "+47"],
  ["SX", "Sint Maarten", "+1721"], ["TC", "Turks and Caicos Islands", "+1649"], ["TF", "French Southern Territories", "+262"],
  ["TK", "Tokelau", "+690"], ["UM", "U.S. Outlying Islands", "+1"], ["VG", "British Virgin Islands", "+1284"],
  ["VI", "U.S. Virgin Islands", "+1340"], ["WF", "Wallis and Futuna", "+681"], ["YT", "Mayotte", "+262"],
];

/** The flag emoji of an ISO2 code (two regional indicator letters). */
export function flagFromIso(iso: string): string {
  const cc = String(iso || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

/** A to Z by English name, one flat list (no "popular" tier, as on the site). */
export const COUNTRIES: Country[] = RAW
  .map(([iso, name, dial]) => ({ iso, name, dial, flag: flagFromIso(iso) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

export function countryByIso(iso: string | null | undefined): Country | null {
  return iso ? BY_ISO.get(String(iso).toUpperCase()) ?? null : null;
}

/** A stored country (ISO2, or a legacy full name) as ISO2, '' when unknown. */
export function isoOrEmpty(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  const up = raw.toUpperCase();
  if (BY_ISO.has(up)) return up;
  const low = raw.toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === low)?.iso ?? '';
}

/** Same for a stored list (unknowns dropped, duplicates removed). */
export function isoArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(isoOrEmpty).filter(Boolean))];
}

/** Countries whose name, code or dial code matches what was typed. */
export function searchCountries(q: string, exclude: Iterable<string> = []): Country[] {
  const skip = new Set(exclude);
  const s = q.trim().toLowerCase();
  const list = COUNTRIES.filter((c) => !skip.has(c.iso));
  if (!s) return list;
  const digits = s.replace(/[^0-9]/g, '');
  const starts: Country[] = [];
  const contains: Country[] = [];
  for (const c of list) {
    const n = c.name.toLowerCase();
    if (n.startsWith(s) || c.iso.toLowerCase() === s) starts.push(c);
    else if (n.includes(s) || (digits && s.startsWith('+') && c.dial.replace('+', '').startsWith(digits))) contains.push(c);
  }
  return [...starts, ...contains];
}
