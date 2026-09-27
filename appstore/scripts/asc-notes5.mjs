// Review notes, build 68 (27 September). The app's plan model changed: every
// plan is a one-off trip (2 weeks or 30 days) or a top-up, and Global is the
// only auto-renewable subscription (monthly). Apple's two earlier holds were
// both price confirmations, so the notes open with the prices.
import { asc } from './asc.mjs';
const V = '41fd4b82-76ff-423b-a207-7ad0a0525eff';
const notes = `1. PRICES ARE INTENDED. Every price in this app is deliberate and equals the price of the same plan on ringoesim.com. Apple's two previous holds on this app were price confirmations, so we state it up front. Prices differ by destination because wholesale data costs differ: for example 2 weeks with 10 GB costs $14.99 in the United States, $18.99 in Europe, $26.99 for Asia and $29.99 for Latin America, while Kiribati, where wholesale data is very expensive, costs $354.99 for 2 weeks with 10 GB and $709.00 for 30 days with 20 GB. These are correct.

2. PURPOSE. Ringo eSIM sells prepaid mobile data eSIMs for travel. Pick a destination (Global, a region such as Europe or Asia, or one of 196 countries), pay with In-App Purchase, and install the eSIM in one tap. On arrival the phone has data without roaming charges.

3. SIGN IN. The welcome screen offers Sign in with Apple or an email code (no password). "Browse plans first" opens the store without an account. Review account: enter review@ringoesim.com, tap "I already have a code" and enter 246810 (a fixed code; nothing is emailed).

4. HOW TO BUY. Open a destination, choose a plan, tap Continue, confirm the email, then confirm the App Store purchase. The eSIM appears under My eSIM within a minute with "Install on this iPhone". A sandbox purchase attaches a carrier test profile and orders nothing from a supplier.

5. PLAN MODEL. One-off trips are consumables: 2 weeks or 30 days of data, paid once, no renewal (a few countries, such as Afghanistan, also offer other sizes and 3, 7 or 30 days of unlimited data, also paid once). Top-ups (10 GB) are consumables that add data to an eSIM already bought. Global is the only auto-renewable subscription: $49.99 a month for 10 GB or $126.99 a month for 20 GB, in the subscription group "Ringo Plan". The price, the monthly period, auto-renewal and how to cancel are shown before the buy button, with links to the Terms of Use (EULA) and Privacy Policy. Manage subscriptions (Help) opens Apple's sheet.

6. REFUNDS. App Store purchases are refunded by Apple; a refund cancels the plan on our side through App Store Server Notifications. Otherwise, as our Terms and the in-app Help state, there is no refund once the eSIM has been issued.

7. LINKS AND ACCOUNT. Terms of Use, Privacy Policy and Contact open in a sheet without the website's navigation, so no other payment path is reachable from the app. Account deletion: Help, then Delete my account (shown when signed in); it removes the email and details from Ringo.

8. SERVICES. Apple In-App Purchase for every payment; our backend at ringoesim.com; eSIM profiles from licensed carrier partners. Ringo Ltd (England and Wales, 16972659) resells data. Photographs are credited under Help.`;
console.log('length', notes.length);
if (notes.length > 4000) { console.error('too long'); process.exit(1); }
if (/[–—]|\s-\s/.test(notes)) { console.error('dash in notes'); process.exit(1); }
const rev = await asc('GET', `/v1/appStoreVersions/${V}/appStoreReviewDetail`);
const rid = rev.json.data.id;
const r = await asc('PATCH', `/v1/appStoreReviewDetails/${rid}`, { data: { type: 'appStoreReviewDetails', id: rid, attributes: { notes, demoAccountRequired: true, demoAccountName: 'review@ringoesim.com', demoAccountPassword: '246810' } } });
console.log('notes', r.status, JSON.stringify(r.json?.errors || '').slice(0, 300));
