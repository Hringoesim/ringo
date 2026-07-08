// ErrorBoundary — catches unhandled render errors anywhere in the tree so a
// single bad screen shows a friendly recovery card instead of a white screen.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { log } from '../lib/log';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('render', error, { componentStack: info.componentStack ?? undefined });
  }

  private reload = () => {
    this.setState({ hasError: false });
    if (typeof location !== 'undefined') location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, padding: '40px 32px',
          textAlign: 'center', background: 'var(--rc-bg, #FFF6EF)',
          fontFamily: 'var(--font, system-ui, -apple-system, sans-serif)',
        }}
      >
        <div style={{ fontSize: 40 }}>🧭</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--rc-ink, #241A22)' }}>
          Something went sideways
        </div>
        <div style={{ fontSize: 14, color: 'var(--rc-ink-mute, #7A6E75)', lineHeight: 1.5, maxWidth: 280 }}>
          Ringo hit an unexpected error. Reloading usually sorts it — your account and plan are safe.
        </div>
        <button
          onClick={this.reload}
          style={{
            marginTop: 6, height: 50, padding: '0 28px', borderRadius: 999, cursor: 'pointer',
            border: 'none', color: '#FFFDFB', fontSize: 15, fontWeight: 700,
            background: 'linear-gradient(120deg, #FF9A4D, #FF4D8D 55%, #A55BFF)',
          }}
        >
          Reload Ringo
        </button>
      </div>
    );
  }
}
