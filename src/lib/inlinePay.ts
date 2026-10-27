// inlinePay.ts: the card field and the Apple Pay button on the Checkout page
// itself (owner 2026-10-27), drawn natively by InlinePayPlugin
// (PaymentSheetPlugin.swift) over an empty slot the page leaves for them. The
// page reports where each slot is every frame it moves (scroll, keyboard,
// layout), so the native view stays on top of its slot.
import { useEffect, useRef, type RefObject } from 'react';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface InlineResult { status: 'completed' | 'canceled' | 'failed'; message?: string }
type Kind = 'card' | 'applePay';

interface InlinePayPlugin {
  canApplePay(): Promise<{ available: boolean }>;
  place(o: { kind: Kind; x: number; y: number; width: number; height: number }): Promise<void>;
  setHidden(o: { hidden: boolean }): Promise<void>;
  unmount(): Promise<void>;
  confirmCard(o: { clientSecret: string; publishableKey: string; email?: string }): Promise<InlineResult>;
  payApple(o: { clientSecret: string; publishableKey: string; amount: number; currency: string; label: string; monthly?: boolean }): Promise<InlineResult>;
  addListener(event: 'cardChange', fn: (e: { complete: boolean }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'applePayTap', fn: () => void): Promise<PluginListenerHandle>;
}

export const InlinePay = registerPlugin<InlinePayPlugin>('InlinePay');
export const inlineAvailable = () => Capacitor.isNativePlatform();

/** Keeps a native view on top of the element in `ref` while `shown`. */
export function useNativeSlot(kind: Kind, ref: RefObject<HTMLElement>, shown: boolean) {
  const last = useRef('');
  useEffect(() => {
    if (!inlineAvailable() || !shown) return;
    let frame = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
        if (key !== last.current && r.width > 0) {
          last.current = key;
          void InlinePay.place({ kind, x: r.left, y: r.top, width: r.width, height: r.height });
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    void InlinePay.setHidden({ hidden: false });
    tick();
    return () => { window.cancelAnimationFrame(frame); last.current = ''; void InlinePay.setHidden({ hidden: true }); };
  }, [kind, ref, shown]);
}

/** Takes the native views away when the Checkout screen goes. */
export function useInlineCleanup() {
  useEffect(() => () => { if (inlineAvailable()) void InlinePay.unmount(); }, []);
}
