// Shared domain types for the Ringo app.
// These mirror the backend orchestration model (Workstream A): Identity Layer
// (KYC + Number Management/DID inventory), Communication Layer (voice/SMS),
// Connectivity Layer (CMP + SM-DP+ RSP).

/** Mobile Number Portability profile for a number-market, per Workstream A (p9–13). */
export interface MnpProfile {
  regulator: string; // e.g. Ofcom (UK), AOPM (ES), Bundesnetzagentur (DE)
  flow: 'donor-led' | 'recipient-led';
  /** Donor-led markets (UK) require a PAC from the losing carrier. */
  needsPac: boolean;
  /** Human-readable porting SLA shown in the UI. */
  sla: string;
}

export interface Country {
  code: string;
  name: string;
  capital: string;
  flag: string;
  region: string;
  tier: 'A' | 'B';
  popular?: boolean;
  dial: number;
  /** True where Ringo can allocate/port a local MSISDN (UK launch + EU markets). */
  numberMarket?: boolean;
  mnp?: MnpProfile;
}

/** A number's provisioning lifecycle, mirroring Number Management states. */
export type NumberStatus = 'active' | 'porting' | 'pending';

export interface PhoneNumber {
  id: string;
  flag: string;
  country: string;
  number: string;
  tag: string;
  active: boolean;
  /** 'ringo' = allocated MSISDN, 'ported' = brought in via MNP. */
  source?: 'ringo' | 'ported';
  status?: NumberStatus;
  /** Serving network the eSIM is currently attached to (e.g. 'EE'). */
  network?: string;
  /** Radio tech on that network (e.g. '5G', '4G+'). */
  ran?: string;
  /** Set while a port (MNP) is in flight. */
  porting?: boolean;
  portEta?: string;
  /** Scheduled to be released at the next renewal (a downgrade freed fewer
   *  number slots than the account currently holds). Kept live until then. */
  scheduledRelease?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  highspeed: string;
  tagline: string;
  popular?: boolean;
  current?: boolean;
  /** Max phone numbers this plan includes (matches the "N numbers" feature). */
  maxNumbers: number;
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

/** Identity Management approval workflow (orchestration layer, fed by KYC). */
export type KycStatus = 'pending' | 'in_review' | 'verified';
