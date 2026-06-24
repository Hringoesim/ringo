# Editing Ringo live on your Mac

Run the app on your own machine so it updates **the instant you save a change**,
and edit each screen in plain English with an AI editor. ~10 minutes one-time.

## One-time setup

### 1. Install the tools
- **Node.js** — go to https://nodejs.org → download the "LTS" version → install.
  (Check it worked: open **Terminal** and type `node -v` — you should see a number.)
- **Cursor** (an AI code editor — like a text editor that edits code for you when
  you describe what you want) — https://cursor.com → download → install.

### 2. Get the app onto your Mac
Open **Terminal** and paste these one at a time:
```bash
git clone https://github.com/Hringoesim/ringo.git
cd ringo/app
npm install
```

### 3. Start the live preview
```bash
npm run dev
```
Terminal prints a link like **http://localhost:5173/** — open it in your browser.
That's your app. **Leave this Terminal window running.**

## Editing a screen

1. Open **Cursor** → **File → Open Folder** → choose the `ringo` folder.
2. Each screen is one file in **`app/src/screens/`**:

   | Screen you see | File to open |
   | --- | --- |
   | Sunset landing page | `LandingScreen.tsx` |
   | Create account / Log in | `SignUpScreen.tsx` |
   | Home dashboard | `HomeScreen.tsx` |
   | Browse countries | `BrowseScreen.tsx` |
   | A country's detail | `CountryScreen.tsx` |
   | Your numbers | `NumbersScreen.tsx` |
   | Add / port a number | `AddNumberScreen.tsx` / `PortNumberScreen.tsx` |
   | Plan & add-ons | `PlanScreen.tsx` |
   | Install / activate eSIM | `InstallScreen.tsx` / `ActivationScreen.tsx` |
   | ID check | `KycScreen.tsx` |
   | Settings | `SettingsScreen.tsx` |

3. Open a screen file, press **Cmd+K** (or **Cmd+L** to chat), and type what you
   want in plain English, e.g. *"make the heading bigger and change the button to
   say Get started."* Cursor edits the file.
4. **Save** (Cmd+S) → your browser preview updates instantly. No rebuild needed.

## When you're happy — make it live for everyone
Back in the Terminal (open a second tab so the preview keeps running):
```bash
cd ~/ringo/app
git add -A
git commit -m "Edited the home screen"
git push
```
About 1–2 minutes later the public site + your phone's app update automatically.

## Good to know
- **No login hassle locally:** on your Mac the app runs in demo mode — Create
  account with any email/password drops you straight in, so you can click through
  every screen freely. The *live deployed* site uses the real Supabase accounts.
- **You can't break anything permanently** — the live site only changes when you
  `git push`. Experiment freely; if a local edit goes wrong, run `git checkout .`
  to undo all unsaved-to-git changes.
- Stuck on any step? Paste the Terminal message to me and I'll tell you exactly
  what to do.
