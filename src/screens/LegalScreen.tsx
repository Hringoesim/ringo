// LegalScreen — renders the Terms of Service or Privacy Policy.
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { BackBtn } from '../components/ui';
import { TERMS, PRIVACY, LEGAL_UPDATED } from '../data/legal';

export function LegalScreen({ doc, onBack }: { doc: 'terms' | 'privacy'; onBack: () => void }) {
  const title = doc === 'terms' ? 'Terms of Service' : 'Privacy Policy';
  const body = doc === 'terms' ? TERMS : PRIVACY;
  // Split into blocks; a **…** line is a heading, everything else is a paragraph.
  const blocks = body.split('\n\n');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title={title} leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 40px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: RC.ink, letterSpacing: -0.65, lineHeight: 1.15 }}>
          {title}
        </div>
        <div style={{ marginTop: 4, marginBottom: 8, fontFamily: 'var(--font)', fontSize: 12, color: RC.inkMute }}>
          Ringo Ltd · Last updated {LEGAL_UPDATED}
        </div>
        {blocks.map((block, i) => {
          const m = block.match(/^\*\*(.+?)\*\*\n?([\s\S]*)$/);
          if (m) {
            return (
              <div key={i} style={{ marginTop: 18 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: RC.ink, letterSpacing: -0.1 }}>{m[1]}</div>
                {m[2] && (
                  <div style={{ marginTop: 5, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.6 }}>{m[2]}</div>
                )}
              </div>
            );
          }
          return (
            <div key={i} style={{ marginTop: 10, fontFamily: 'var(--font)', fontSize: 13.5, color: RC.inkMute, lineHeight: 1.6 }}>{block}</div>
          );
        })}
      </div>
    </div>
  );
}
