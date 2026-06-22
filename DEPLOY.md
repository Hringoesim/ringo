# Deploying Ringo to Vercel

This directory is its **own git repository** — push it to GitHub as a new repo
and it's the project root, so there's nothing special to configure: Vercel
auto-detects Vite, and `vercel.json` already pins the build command, output
folder, and SPA rewrites.

---

## Recommended: GitHub → Vercel dashboard

### 1. Push to a new GitHub repo

The initial commit is already made on the `main` branch. Create an empty repo
on **github.com** (no README/.gitignore — keep it empty), then:

```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Import it on Vercel

1. Go to **https://vercel.com/new** and sign in with GitHub.
2. **Import** your repo.
3. In the project setup screen everything auto-detects:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `./` (leave as default — the repo root is the app)
4. Click **Deploy**.

You'll get a live URL like `https://<project>.vercel.app` in ~1 minute. Every
push to `main` redeploys automatically; pull requests get preview URLs.

---

## Alternative: Vercel CLI (no GitHub needed)

```bash
npm i -g vercel
vercel          # first run: links/creates the project, then deploys a preview
vercel --prod   # promote to production
```

When the CLI asks "In which directory is your code located?", keep it as `./`.

---

## Notes

- **Custom domain:** Project → Settings → Domains → add your domain.
- **This is the web mockup phase.** The iPhone frame is intentional here. When
  you later wrap with Capacitor for the App Store, you'll switch to a frameless
  mode in `src/Host.tsx` so the UI fills the device screen.
- **Local sanity check before deploying:**
  ```bash
  cd app && npm run build && npm run preview
  ```
