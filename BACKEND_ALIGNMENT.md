# Front-end ↔ Back-end alignment

This documents how the Ringo front end maps to the backend architecture
(Workstreams A/B/C). The UI talks **only** to `src/api/ringoApi.ts`, which is
organised to mirror the orchestration layers, so connecting the real backend is a
single `RingoAPI.configure({ mode: 'live', … })` call.

## Onboarding sequence (the order now matches the backend)

Backend canonical order (Workstream A, p2–8 & p22):

```
Account → KYC / Identity Management approval (GATE)
        → Number Management (allocate Ringo MSISDN | port-in via MNP)
        → Connectivity / RSP: eSIM SM-DP+ download → install (LPAd) → enable
        → Services live (data / voice / SMS)
```

Front-end screen flow (`src/App.tsx`):

| # | Backend step | Screen(s) |
|---|---|---|
| 1 | Account creation | `SplashScreen → OnboardScreen → SignUpScreen` (Apple or email+phone) |
| 2 | OTP (if phone) | `OtpScreen` |
| 3 | **Identity gate** (KYC → approval workflow) | `KycScreen` → `kycStatus: pending → in_review → verified` |
| 4 | **Number Management** (two journeys) | `NumberSetupScreen` → `AddNumberScreen` (allocate MSISDN) **or** `PortNumberScreen` (MNP) |
| 5 | eSIM RSP provisioning | `InstallScreen` (SM-DP+ / LPAd copy) |
| 6 | Activation | `ActivationScreen` → `home` |

KYC now comes **before** number assignment (it gates it), matching "identity
verification is required to activate".

## Orchestration layers → API namespaces

| Backend layer | `RingoAPI` namespace | Key calls |
|---|---|---|
| Auth | `RingoAPI.auth` | `appleSignIn`, `emailSignUp`, `verifyOtp` |
| Identity Layer (KYC + approval) | `RingoAPI.identity` | `submitKyc`, `getStatus` |
| Number Management (DID + MNP) | `RingoAPI.numbers` | `allocate`, `portIn`, `portStatus`, `setMain`, `release`, `list` |
| Connectivity Layer (CMP + SM-DP+) | `RingoAPI.connectivity` | `provisionEsim`, `activateEsim`, `enableCountry` |
| Communication Layer (voice/SMS) | `RingoAPI.communication` | `getVoiceRouting`, `getSmsThreads` *(FUTURE)* |
| BSS (Stripe) | `RingoAPI.billing` | `switchPlan`, `getUsage` |
| Catalog/Profile | `RingoAPI.catalog` | `getProfile`, `getTiers`, `getCountries`, `getPlans` |

Each method documents the REST endpoint it maps to in `live` mode. Wholesale
partners are wired **server-side** and surfaced via `RingoAPI.configure({ partners })`
(e.g. `mnp: '1global'`, `rsp: '<vendor>'`, `voice: 'telnyx'`).

## MNP (Mobile Number Portability) — Workstream A, p9–13

Number markets and their porting rules are encoded in `src/data/countries.ts`
(`mnp` profile) and drive the `PortNumberScreen` flow and SLAs:

| Market | Regulator | Flow | PAC needed | SLA |
|---|---|---|---|---|
| 🇬🇧 UK | Ofcom | donor-led | **yes (PAC)** | ~1 business day (PAC before 4pm) |
| 🇮🇪 Ireland | ComReg | recipient-led | no | ~2 hours |
| 🇪🇸 Spain | AOPM | recipient-led | no | ~1 business day (before 2pm) |
| 🇩🇪 Germany | Bundesnetzagentur | recipient-led | no | up to 6 business days |
| 🇳🇱 Netherlands | ACM | recipient-led | no | ~immediate |

A ported number enters the store with `status: 'porting'` and an ETA, then flips
to `active` — surfaced live in `NumbersScreen`.

## What's mock today vs. ready to wire

- **Mock**: in-memory fixtures + simulated latency + simulated MNP/KYC completion timers.
- **Ready to wire**: flip `mode: 'live'` and point `baseUrl` at the orchestration
  API. Request/response shapes are identical, so no screen changes are needed.
- **Marked FUTURE** (stubs present, per the backend roadmap): voice routing, SMS
  inbox, OTP service, entitlement server, OTA.
