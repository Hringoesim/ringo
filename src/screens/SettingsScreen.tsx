// SettingsScreen — tiny stub reached from the avatar tap.
import { RC } from '../theme';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ flex: 1, padding: '80px 24px 40px', color: RC.ink }}>
      <button
        onClick={onBack}
        style={{ border: 'none', background: 'transparent', color: RC.inkStrong, fontFamily: 'Poppins', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
      >
        ← Back
      </button>
      <div style={{ marginTop: 16, fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Profile</div>
      <div style={{ marginTop: 6, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute }}>Settings live here in the full app.</div>
    </div>
  );
}
