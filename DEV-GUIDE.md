# Editing Ringo on your Mac

A short guide for changing how a screen looks or reads, without an
engineering background. One-time setup takes about ten minutes.

## One-time setup

1. Install **Node.js**: go to https://nodejs.org, download the "LTS" version,
   install it. To check, open **Terminal** and type `node -v`. You should see
   a version number.
2. Install a code editor. Any editor works.
3. Get the app. In Terminal, one line at a time:
   ```bash
   git clone https://github.com/Hringoesim/ringo.git
   cd ringo
   npm install
   ```

## Start the live preview

```bash
npm run dev
```

Terminal prints a link like `http://localhost:5173/`. Open it in your
browser. Leave the Terminal window running. When you save a file, the
preview updates by itself.

Things to know about the preview:

- It shows the app inside a phone frame.
- It uses the real Ringo website for plans, prices and accounts. There is no
  demo mode. If you sign in with an email code, that is a real account.
- You cannot pay in the preview. Payment only works in the iPhone app.
- The Apple and Google buttons only appear in the iPhone app.

## Which file is which screen

Open the `ringo` folder in your editor. Each screen is one file in
`src/screens/`:

| Screen you see | File |
| --- | --- |
| Welcome and sign-in | `LandingScreen.tsx` |
| Email and code | `LoginScreen.tsx` |
| Pick your traveller | `TravellerScreen.tsx` |
| Turn on notifications | `NotifyScreen.tsx` |
| Store, the "eSIMs" tab | `StoreScreen.tsx` |
| One destination and its plans | `DestinationScreen.tsx` |
| Checkout | `CheckoutScreen.tsx` |
| My eSIM tab | `EsimScreen.tsx` |
| Install the eSIM | `InstallScreen.tsx` |
| Report a problem | `ReportScreen.tsx` |
| "How much data do I need?" quiz | `QuizScreen.tsx` |
| Rewards tab and profile | `RewardsScreen.tsx` |
| Help tab | `HelpScreen.tsx` |
| Waitlist for the full Ringo service | `WaitlistScreen.tsx` |

The tab bar is `src/components/TabBar.tsx`. Colours and text sizes are in
`src/theme.ts`.

If you change English text, the other 13 languages in `src/i18n/` still hold
the old sentence and will fall back to your new English until someone
translates it.

## Before you publish

Run the three checks. All three must pass:

```bash
npm run lint
npm test
npm run build
```

## Publish

```bash
git status                      # see which files you changed
git add src/screens/StoreScreen.tsx     # add each changed file by name
git commit -m "Store: shorter heading"
git push
```

Add files by name. Do not use `git add -A` or `git add .`: they can pick up
files that should not be published.

What a push to `main` does:

- GitHub runs the checks, then updates the web preview on GitHub Pages.
- It does **not** update the iPhone app. A new iPhone version has to be
  built in Xcode and sent to Apple. See `NATIVE.md`.

## If something goes wrong

- To undo a change you have not committed: `git checkout -- path/to/file`.
- Nothing is public until you `git push`.
- If Terminal shows an error, copy the whole message when you ask for help.
