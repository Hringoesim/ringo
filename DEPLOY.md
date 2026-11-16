# Deploying the web build

This file covers the web build only. The web build is a browser preview of
the app: sign-in by email code and browsing can work there, payment does not
(see "Platforms" in `README.md`). For the iOS and Android apps see
`NATIVE.md`.

Which web host is the canonical one is not confirmed by anything in this
repository. Two are configured.

## 1. GitHub Pages (workflow in the repository)

`.github/workflows/deploy.yml` runs on every push to `main` and on manual
dispatch:

1. `npm ci`, `npm run lint`, `npm test`.
2. `npm run build` with `GH_PAGES=1`, which sets the base path to `/ringo/`
   (`vite.config.ts`).
3. Uploads `dist/` and deploys it with `actions/deploy-pages`.

The repository's Pages source must be set to "GitHub Actions" for this to
publish. If lint or a test fails, nothing is deployed.

The workflow passes `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
`VITE_GOOGLE_CLIENT_ID` from repository variables to the build. No code
reads them any more, so they have no effect.

## 2. Vercel (configuration only)

`vercel.json` tells Vercel this is a Vite project: build with
`npm run build`, serve `dist/`, and rewrite every path to `/index.html`. The
base path is `/` because `GH_PAGES` is not set there.

Whether a Vercel project is connected to this repository is not visible here
(`.vercel/` is ignored by git). If one is, Vercel builds on its own and does
not run the lint and test steps of the GitHub workflows.

To connect one: import the repository at https://vercel.com/new and accept
the detected settings (framework Vite, build command `npm run build`, output
directory `dist`, root directory `./`). Or use the CLI from the repository
root:

```bash
npm i -g vercel
vercel          # first run links or creates the project and deploys a preview
vercel --prod   # production deploy
```

## Check before pushing

```bash
npm run lint && npm test && npm run build && npm run preview
```

## Notes

- No environment variables are needed for a web deploy. The backend URL is
  fixed in `src/api/light.ts`.
- The phone frame in a desktop browser is intended. On a phone-sized screen,
  an installed PWA or the native app, `src/Host.tsx` already renders full
  screen. No switch is needed.
- The site only answers browser requests from origins it allows. That list
  is in the site's repository. A new web address may need to be added there
  before the preview can load plans.
