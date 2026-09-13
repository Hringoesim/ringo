# In-app purchases

Every plan and top-up the app sells is an App Store product (owner ruling
2026-09-13: payment through Apple, not Stripe). The website's
`api/_apple-products.js` is the source of truth: it folds the Light
catalogue into products keyed by what a line delivers and costs
(`com.ringoesim.app.plan.rl_30.10gb.3999`, `…sub.rl_annual.20gb.59988`,
`…topup.top_10.3999`), and `/api/esim-plans` names the product on every
line as `apple_product_id`. The app shows Apple's price and never the
catalogue's.

After any catalogue change on the site:

```
SITE=/path/to/NEW-website node scripts/asc-iap.mjs --dry   # what would change
SITE=/path/to/NEW-website node scripts/asc-iap.mjs         # create / localize / price / availability / screenshot
node scripts/asc-sub-prices.mjs 30                         # subscriptions: a price in every territory
```

Products above Apple's $1,000 cap are skipped and the app hides them.
Subscription display names must be unique within the group, so they carry
the region ("Europe 10GB/mo 2mo"). The review screenshot is
`review-screenshot.png`.

Purchases are reported to `https://ringoesim.com/api/app-purchase` with the
signed transaction before they are finished; refunds and renewals arrive
at `https://ringoesim.com/api/appstore-notifications` (set as the
production and sandbox Server Notification URL in App Store Connect).
Sandbox purchases (App Review, TestFlight) are fulfilled from the carrier
test profiles and never reach a supplier.
