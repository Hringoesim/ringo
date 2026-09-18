import { asc } from './asc.mjs';
const LOC = 'f4ed464e-afe8-4af8-870b-af2cd875ca82';
const promotionalText = 'Data eSIMs for 196 countries and every region: Global, Europe, the USA, Asia, Latin America, the Middle East. Pay with your Apple ID, install in one tap.';
const description = `Ringo is a data eSIM for your next trip. Pick where you are going, pay with your Apple ID, install in one tap, and you are connected the moment you land. Keep your own SIM for calls and texts; Ringo carries the data.

196 COUNTRIES, EVERY REGION
A Global plan for 133 countries, regional plans for Europe (37 countries), Asia, Latin America and the Middle East, and every country on a plan of its own, from the United States to Japan, Kenya to Iceland.

PLANS THAT FIT THE TRIP
10 or 20 GB for 30 days in one payment on every destination, or a monthly plan that renews, always cheaper per month than the one-payment plan. Europe, the USA and the regions also sell 2, 6 and 12 month terms, with the 12 month term the lowest. Unlimited data for 3, 7 or 30 days when you want to stop thinking about it (fair use applies, see the Terms of Use).

HOW IT WORKS
1. Choose a destination and a plan.
2. Confirm the purchase with your Apple ID.
3. Your eSIM appears in the app within a minute, with a copy in your email.
4. Tap Install. iOS adds the eSIM for you, no QR code to scan.
5. When you land, turn on Ringo data and roaming. Done.

WHILE YOU TRAVEL
See how much data is left, add 10 or 20 GB to the same eSIM, resend the install link, or report a problem and we open a case with the network for you.

YOUR PROFILE
Sign in with Apple or with a six-digit code sent to your email, no password. Your profile keeps a travel badge for every destination your Ringo eSIMs have taken you to, and your Ringo status (Amber, Coral, Crimson, Aurora) grows with every paid month: priority support, early access, a line to the founders. Bought on ringoesim.com before? Log in with the same email and your plan shows up, or restore your App Store purchases.

RENEWING PLANS
The monthly, 2, 6 and 12 month plans are auto-renewable subscriptions billed to your Apple ID. Payment is charged at confirmation of purchase. The subscription renews automatically at the same price unless auto-renew is turned off at least 24 hours before the end of the current period. Manage or cancel it any time in Settings, Apple ID, Subscriptions. One-payment plans never renew.

WORKS ON
iPhone XS, XR and every iPhone since, unlocked.

Terms of Use: https://ringoesim.com/terms
Privacy Policy: https://ringoesim.com/privacy
Ringo Ltd, London.`;
if (promotionalText.length > 170 || description.length > 4000) throw new Error(`too long ${promotionalText.length} ${description.length}`);
const r = await asc('PATCH', `/v1/appStoreVersionLocalizations/${LOC}`, { data: { type: 'appStoreVersionLocalizations', id: LOC, attributes: { description, promotionalText } } });
console.log('listing', r.status, promotionalText.length, description.length, JSON.stringify(r.json?.errors || '').slice(0, 200));
