// Shared domain types for the Ringo app.

export interface Country {
  code: string;
  name: string;
  capital: string;
  flag: string;
  region: string;
  tier: 'A' | 'B';
  popular?: boolean;
  dial: number;
}

export interface PhoneNumber {
  id: string;
  flag: string;
  country: string;
  number: string;
  tag: string;
  active: boolean;
  /** True while a port is still being processed by the losing carrier. */
  porting?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  highspeed: string;
  tagline: string;
  popular?: boolean;
  current?: boolean;
  feats: string[];
}

export interface Tier {
  id: 'orange' | 'coral' | 'crimson' | 'aurora';
  name: string;
  min: number;
  c1: string;
  c2: string;
  glow: string;
  perk: string;
}

export type KycStatus = 'pending' | 'in_review' | 'verified';
