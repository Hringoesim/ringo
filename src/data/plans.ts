import type { Plan } from './types';

// The real Ringo lineup: Essentials $19, Plus $35, Pro $59, Unlimited $89.
export const PLANS: Plan[] = [
  {
    id: 'essentials', name: 'Essentials', price: 19, highspeed: '15 GB',
    tagline: 'For light trips & backups', current: true,
    feats: ['15 GB high-speed, then unlimited standard', '180+ countries', '1 number included'],
  },
  {
    id: 'plus', name: 'Plus', price: 35, highspeed: '50 GB',
    tagline: 'For regular travelers',
    feats: ['50 GB high-speed', '180+ countries', '2 numbers included', 'Personal hotspot'],
  },
  {
    id: 'pro', name: 'Pro', price: 59, highspeed: '150 GB',
    tagline: 'For digital nomads', popular: true,
    feats: ['150 GB high-speed', '180+ countries', '3 numbers included', 'Priority 5G/4G+'],
  },
  {
    id: 'unlimited', name: 'Unlimited', price: 89, highspeed: 'Unlimited',
    tagline: 'No caps, ever',
    feats: ['Truly unlimited 5G — no throttle', '180+ countries', '5 numbers included', 'Always-on hotspot'],
  },
];
