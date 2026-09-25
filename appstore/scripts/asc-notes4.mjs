// Review notes, round of 25 September: the two holds Apple placed on this
// app were both "confirm these prices" (Guideline 3). The notes now open
// with the price table so the reviewer has the answer before asking.
import { asc } from './asc.mjs';
const V = '41fd4b82-76ff-423b-a207-7ad0a0525eff';
const notes = `Build 67 answers the hold of 22 September (Guideline 3, price verification) and carries every fix from our own review. This submission holds the app version plus 199 of the 358 in-app purchases (App Store Connect's 200-item limit); the remaining single-country renewing plans and top-ups follow in a second submission once this one is approved. The app only shows plans the App Store returns as on sale, so nothing is offered that is not approved.

1. PRICES, CONFIRMED. Every price is intended and equals ringoesim.com. Regional plans cost more than Europe because wholesale data costs more there; a term is billed once for the whole term. The eight you asked about on 22 September: LatAm 10GB/mo 6mo $259.00 per 6 months (6 x $43.16); Asia Unlimited 6mo $589.00 per 6 months (6 x $97.99); LatAm Unlimited 2mo $264.99 per 2 months (2 x $132.99); Mid. East Unlimited 6mo $659.00 per 6 months (6 x $109.99); USA 20GB/mo 2mo $71.99 per 2 months (2 x $35.99); USA 20GB/mo 12mo $359.00 per year (12 x $29.99); Unlimited eSIM, 30 days $109.99 (one payment, 30 days, sold for 13 countries such as Brazil and South Africa); 20 GB eSIM, 30 days $82.99 (one payment, 30 days, sold for 13 countries such as Brazil and the UAE). Renewing plans are always cheaper per month than the one-payment plan of the same size. Consumable names carry the US price because one product serves every destination sold at that price.

2. PURPOSE: Ringo eSIM sells prepaid mobile data eSIMs for travel. Pick a destination (Global, Europe, Asia, Latin America, the Middle East, the USA, or any of 196 countries), pay with In-App Purchase, install the eSIM in one tap; on arrival the phone has data without roaming charges.

3. ACCESS: the welcome screen offers Sign in with Apple or an email code (no password); "Browse plans first" opens the store without an account. Review account: email review@ringoesim.com, then tap "I already have a code" and enter 246810 (a fixed code; nothing is emailed). To buy: open a destination, choose Data or Unlimited, a size and a term, Continue, confirm the email, confirm the App Store purchase. The eSIM appears under My eSIM within a minute with "Install on this iPhone" (a sandbox purchase attaches a carrier test profile and orders nothing from a supplier). Install, restore purchases, Manage subscription (opens Apple's sheet) and Delete my account are under My eSIM and Help. Terms of Use, Privacy Policy and Contact open in a sheet without the website's navigation, so no other payment path is reachable from the app.

4. SERVICES: Apple In-App Purchase for every payment (consumables for one-payment plans and top-ups, auto-renewable subscriptions for renewing plans; two subscription groups, "Ringo Plan" for regions and "Ringo Country Plan" for single countries); our backend at ringoesim.com; eSIM profiles from licensed carrier partners (ConnectedYou, Telna). Ringo Ltd (England and Wales, 16972659) resells data; no telecom licence is needed for resale. Prices are the App Store's per storefront (euro base set in Belgium, US dollar prices set for the United States).

5. SUBSCRIPTIONS: price, period, auto-renewal, that there is no minimum term, and where to cancel are stated on the purchase screen before the buy button, with links to the Terms of Use (EULA) and Privacy Policy. Refunds are Apple's and cancel the plan on our side via App Store Server Notifications. Photographs are our site's (Wikimedia Commons and NASA, credited under Help > Photo credits).`;
console.log('length', notes.length);
if (notes.length > 4000) { console.error('too long'); process.exit(1); }
const rev = await asc('GET', `/v1/appStoreVersions/${V}/appStoreReviewDetail`);
const rid = rev.json.data.id;
const r = await asc('PATCH', `/v1/appStoreReviewDetails/${rid}`, { data: { type: 'appStoreReviewDetails', id: rid, attributes: { notes, demoAccountRequired: true, demoAccountName: 'review@ringoesim.com', demoAccountPassword: '246810' } } });
console.log('notes', r.status, JSON.stringify(r.json?.errors || '').slice(0, 300));
