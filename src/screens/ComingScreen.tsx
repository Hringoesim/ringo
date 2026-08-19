// ComingScreen — what Ringo does not sell yet, on its own page so it never
// sits in the way of buying. Reached from Settings.
import { RC } from '../theme';
import { RingoHeader } from '../components/Header';
import { BackBtn, SectionTitle } from '../components/ui';
import { ComingNext } from '../components/ComingNext';
import { useRingoState } from '../store/store';

export function ComingScreen({ onBack }: { onBack: () => void }) {
  const { state } = useRingoState();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <RingoHeader title="Coming next" leading={<BackBtn onClick={onBack} />} />
      <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 40px' }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 14, color: RC.inkMute, lineHeight: 1.5, marginBottom: 16 }}>
          Ringo Light is what we sell today. Tell us what you want next and we
          will let you know the day it is ready.
        </div>
        <SectionTitle>On the way</SectionTitle>
        <ComingNext signedIn={!!state.email} />
      </div>
    </div>
  );
}
