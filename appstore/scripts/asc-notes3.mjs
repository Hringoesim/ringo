import { asc } from './asc.mjs';
const V = '41fd4b82-76ff-423b-a207-7ad0a0525eff';
const notes = `This submission replaces the one returned on 16 September with "Information Needed" (Guideline 2.1). Answers below; the screen recording is attached. It also carries the app's in-app purchases (73 one-time products and one subscription group, "Ringo Plan", with 27 auto-renewable subscriptions), each with a review note saying exactly where it is in the app.

1. SCREEN RECORDING: attached (physical iPhone, latest iOS): launch, browsing the plans, log in with email and code, a sandbox purchase, the eSIM ready with the Install button, Manage subscription, Delete my account.

2. PURPOSE AND AUDIENCE: Ringo eSIM sells prepaid mobile data eSIMs for travel. A traveller picks a destination (Global, Europe, Asia, Latin America, Middle East, or one of 30 listed countries), pays, and installs the eSIM on the iPhone in one tap; on arrival the phone has data without roaming charges. Audience: international travellers with an eSIM-capable iPhone. Value: no physical SIM, no roaming bill, one plan for a whole region.

3. SETUP AND ACCESS: no account is needed to browse or buy. Tap "Browse eSIMs", open a destination, choose a size and term, tap Continue, enter an email (the activation code and receipt go there), confirm the App Store purchase. The eSIM appears under "My eSIM" within a minute with "Install on this iPhone" (opens the iOS Add eSIM flow). "Log in" (landing, store header, My eSIM, Help) sends a six-digit code to the email; demo account for review: review@ringoesim.com with code 246810 (no email needed). "Delete my account" is under Help > Account. Sandbox purchases receive a real test eSIM profile, so the Install button works; no carrier order is placed for them.

4. EXTERNAL SERVICES: Apple In-App Purchase (all payments; consumables for one-payment plans and top-ups, auto-renewable subscriptions for 2/6/12-month plans, group "Ringo Plan"); our own backend at ringoesim.com (Vercel + Supabase) which verifies the App Store signed transaction, records the sale and issues the eSIM; eSIM provisioning by our carrier partner ConnectedYou (production) and Telna test profiles (sandbox); transactional email via Resend; no analytics SDK, no ads SDK, no AI service, no third-party login.

5. REGIONAL DIFFERENCES: none in features. Prices are the App Store's per storefront. The same 35 destinations are listed everywhere.

6. REGULATED INDUSTRY: Ringo Ltd (England and Wales, company 16972659) resells mobile data eSIMs supplied by licensed carrier partners (ConnectedYou, Telna); we do not operate a network ourselves and need no telecom licence for resale. No protected third-party material is included; destination photographs are Wikimedia Commons / NASA with credits under Help > Photo credits.

Refunds are handled by Apple and cancel the plan on our side via App Store Server Notifications. Subscriptions: price, period, auto-renewal and where to cancel are stated on the purchase screen, with links to the Terms of Use (EULA) and Privacy Policy; Manage subscription and Restore purchases are under My eSIM and Help.`;
const rev = await asc('GET', `/v1/appStoreVersions/${V}/appStoreReviewDetail`);
const rid = rev.json.data.id;
const r = await asc('PATCH', `/v1/appStoreReviewDetails/${rid}`, { data: { type: 'appStoreReviewDetails', id: rid, attributes: { notes, demoAccountRequired: true, demoAccountName: 'review@ringoesim.com', demoAccountPassword: '246810' } } });
console.log('notes', r.status, notes.length, JSON.stringify(r.json?.errors || '').slice(0, 300));
