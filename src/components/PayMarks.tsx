// PayMarks: what a buyer sees around the Pay button so the payment reads as
// safe (owner 2026-10-27, "that does not look secure"): a padlock and the ways
// to pay. The payment provider itself is never named to buyers.

export function Lock({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill={color} />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const chip = { width: 40, height: 26, display: 'block', flexShrink: 0 } as const;
const frame = <rect x="0.5" y="0.5" width="39" height="25" rx="5" fill="#fff" stroke="rgba(26,15,46,0.16)" />;

function ApplePay() {
  return (
    <svg viewBox="0 0 40 26" style={chip} role="img" aria-label="Apple Pay">
      <rect width="40" height="26" rx="5" fill="#000" />
      <g transform="translate(6.5 7.2) scale(0.48)" fill="#fff">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </g>
      <text x="19" y="17.6" fill="#fff" fontSize="10.5" fontWeight="600" fontFamily="inherit">Pay</text>
    </svg>
  );
}

function Visa() {
  return (
    <svg viewBox="0 0 40 26" style={chip} role="img" aria-label="Visa">
      {frame}
      <text x="20" y="17.4" textAnchor="middle" fill="#1A1F71" fontSize="11" fontWeight="800" fontStyle="italic" letterSpacing="0.3" fontFamily="inherit">VISA</text>
    </svg>
  );
}

function Mastercard() {
  return (
    <svg viewBox="0 0 40 26" style={chip} role="img" aria-label="Mastercard">
      {frame}
      <defs><clipPath id="mc-left"><circle cx="16.5" cy="13" r="7" /></clipPath></defs>
      <circle cx="16.5" cy="13" r="7" fill="#EB001B" />
      <circle cx="23.5" cy="13" r="7" fill="#F79E1B" />
      <circle cx="23.5" cy="13" r="7" fill="#FF5F00" clipPath="url(#mc-left)" />
    </svg>
  );
}

function Amex() {
  return (
    <svg viewBox="0 0 40 26" style={chip} role="img" aria-label="American Express">
      <rect width="40" height="26" rx="5" fill="#006FCF" />
      <text x="20" y="16.8" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800" letterSpacing="0.4" fontFamily="inherit">AMEX</text>
    </svg>
  );
}

/** The ways to pay, under the button (owner 2026-10-27: no extra lines of text). */
export function PayMethods() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
      <ApplePay /><Visa /><Mastercard /><Amex />
    </div>
  );
}
