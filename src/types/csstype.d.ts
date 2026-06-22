// Allow a few modern CSS properties used throughout the inline styles that
// aren't yet in the bundled csstype definitions.
import 'csstype';

declare module 'csstype' {
  interface Properties {
    textWrap?: 'wrap' | 'nowrap' | 'balance' | 'pretty' | 'stable';
  }
}
