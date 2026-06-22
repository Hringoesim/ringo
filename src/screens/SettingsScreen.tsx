// SettingsScreen — profile + appearance, reached from the avatar tap.
import { RC } from '../theme';
import { RingoCard } from '../components/Card';

interface SettingsScreenProps {
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSignOut: () => void;
}

export function SettingsScreen({ onBack, theme, onToggleTheme, onSignOut }: SettingsScreenProps) {
  const isDark = theme === 'dark';
  return (
    <div className="no-bar" style={{ flex: 1, overflowY: 'auto', padding: '70px 24px 40px', color: RC.ink }}>
      <button
        onClick={onBack}
        style={{ border: 'none', background: 'transparent', color: RC.inkStrong, fontFamily: 'Poppins', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
      >
        ← Back
      </button>
      <div style={{ marginTop: 16, fontFamily: 'Poppins', fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Profile</div>
      <div style={{ marginTop: 6, fontFamily: 'Poppins', fontSize: 14, color: RC.inkMute }}>Settings live here in the full app.</div>

      <div style={{ marginTop: 24, fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        Appearance
      </div>
      <RingoCard style={{ marginTop: 10, padding: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['dark', 'light'] as const).map((t) => {
            const on = theme === t;
            return (
              <button
                key={t}
                onClick={() => { if (!on) onToggleTheme(); }}
                style={{
                  flex: 1, height: 44, borderRadius: 14, cursor: 'pointer', border: 'none',
                  background: on ? RC.grad : 'transparent',
                  color: on ? '#FFFFFF' : RC.ink,
                  fontFamily: 'Poppins', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>{t === 'dark' ? '🌙' : '☀️'}</span>
                {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            );
          })}
        </div>
      </RingoCard>
      <div style={{ marginTop: 10, fontFamily: 'Poppins', fontSize: 12, color: RC.inkMute, lineHeight: 1.5 }}>
        {isDark ? 'Dark matches ringoesim.com.' : 'Warm light theme.'} You can switch any time.
      </div>

      <div style={{ marginTop: 24, fontFamily: 'Poppins', fontSize: 11, fontWeight: 600, color: RC.inkMute, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        Account
      </div>
      <button
        onClick={onSignOut}
        style={{
          marginTop: 10, width: '100%', height: 50, borderRadius: 14, cursor: 'pointer',
          border: `1.5px solid ${RC.lineStrong}`, background: 'transparent', color: RC.inkStrong,
          fontFamily: 'Poppins', fontSize: 14, fontWeight: 600,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
