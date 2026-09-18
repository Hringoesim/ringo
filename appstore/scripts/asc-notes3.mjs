import { asc } from './asc.mjs';
const V = '41fd4b82-76ff-423b-a207-7ad0a0525eff';
const notes = `This submission replaces the one we cancelled on 18 September (it had been returned with a question about one price; the answer is repeated in point 7). It carries the app's in-app purchases: 235 one-time products (30-day plans, 3/7-day unlimited plans, top-ups) and 126 auto-renewable subscriptions in two groups, "Ringo Plan" (Global and the regions) and "Ringo Country Plan" (single countries). Every product has a review note saying where it is in the app.

1. SCREEN RECORDING: attached (physical iPhone, latest iOS): launch, browsing the plans, sign-in with an email code, a sandbox purchase, the eSIM ready with the Install button, Manage subscription, Delete my account.

2. PURPOSE AND AUDIENCE: Ringo eSIM sells prepaid mobile data eSIMs for travel. A traveller picks a destination (Global, Europe, Asia, Latin America, the Middle East, the USA, or any of 196 countries), pays with Apple In-App Purchase, and installs the eSIM on the iPhone in one tap; on arrival the phone has data without roaming charges. Audience: international travellers with an eSIM-capable iPhone.

3. SETUP AND ACCESS: the welcome screen offers Sign in with Apple or an email code (no password); "Browse plans first" opens the store without an account. To buy: open a destination, choose Data or Unlimited, a size, and a term (30 days in one payment, or a monthly / 2, 6, 12-month plan that renews), tap Continue, confirm the email that receives the activation code, confirm the App Store purchase. The eSIM appears under My eSIM within a minute with "Install on this iPhone" (opens the iOS Add eSIM flow). Demo account: review@ringoesim.com, code 246810 (the app accepts this code for that address). The Profile (top right of My eSIM) shows travel badges and the traveller's Ringo status, which is recognition only, no credit or discount.

4. EXTERNAL SERVICES: Apple In-App Purchase for all payments (consumables for one-payment plans and top-ups, auto-renewable subscriptions for renewing plans); our own backend at ringoesim.com (Vercel + Supabase), which verifies the App Store signed transaction, records the sale and issues the eSIM; eSIM provisioning by our carrier partners ConnectedYou (production) and Telna. Sign in with Apple uses the standard credential flow; the identity token is verified on our backend.

5. REGIONAL DIFFERENCES: none in features. Prices are the App Store's per storefront (euro prices set in Belgium as the base, US dollar prices set for the United States). The same destinations are listed everywhere. Single-country subscriptions are available in Belgium and the United States at submission time; the remaining storefronts are being priced and will be opened as the pricing completes.

6. REGULATED INDUSTRY: Ringo Ltd (England and Wales, company 16972659) resells mobile data eSIMs supplied by licensed carrier partners (ConnectedYou, Telna); we do not operate a network and need no telecom licence for resale. Destination photographs are our own site's (Wikimedia Commons / NASA, credited under Help > Photo credits).

7. PRICES: every price is intended as configured and matches ringoesim.com. The dearest is the Latin America 10 GB per month plan on a 2-month term at $91.99 (2 x $45.99), the same as EUR 79.98 on our site; Latin America is our most expensive region because of wholesale data costs there. Renewing plans are always cheaper per month than the one-payment plan of the same size.

Refunds are handled by Apple and cancel the plan on our side via App Store Server Notifications. Subscriptions: price, period, auto-renewal and where to cancel are stated on the purchase screen, with links to the Terms of Use (EULA) and Privacy Policy; Manage subscriptions and Restore purchases are under My eSIM and Help.`;
const rev = await asc('GET', `/v1/appStoreVersions/${V}/appStoreReviewDetail`);
const rid = rev.json.data.id;
const r = await asc('PATCH', `/v1/appStoreReviewDetails/${rid}`, { data: { type: 'appStoreReviewDetails', id: rid, attributes: { notes, demoAccountRequired: true, demoAccountName: 'review@ringoesim.com', demoAccountPassword: '246810' } } });
console.log('notes', r.status, notes.length, JSON.stringify(r.json?.errors || '').slice(0, 300));
