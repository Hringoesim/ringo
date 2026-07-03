#!/bin/sh
# Xcode Cloud post-clone — runs after checkout, BEFORE dependency resolution.
# Capacitor's SPM packages live in node_modules/@capacitor/* (see CapApp-SPM/
# Package.swift), and dist/ + public/ are gitignored, so we must create them
# here or the archive fails with "package … doesn't exist in file system".
set -e

REPO="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/.." && pwd)}"
echo "▸ ci_post_clone starting in: $REPO"
cd "$REPO"

# node_modules already present (e.g. script ran from the other location)? skip.
if [ -d node_modules/@capacitor/haptics ] && [ -d ios/App/App/public ]; then
  echo "✓ node_modules + web bundle already present — nothing to do"
  exit 0
fi

# Ensure Node is available (Xcode Cloud images don't ship it).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo "▸ installing node via Homebrew"
  brew install node
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi
echo "▸ using node $(node -v), npm $(npm -v)"

echo "▸ installing JS dependencies (creates node_modules the SPM packages need)"
npm ci || npm install

echo "▸ building the web app"
npm run build

echo "▸ npx cap sync ios (regenerates public/, capacitor.config.json, config.xml)"
npx cap sync ios

echo "✓ ci_post_clone done — node_modules + web bundle ready"
