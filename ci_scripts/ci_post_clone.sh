#!/bin/sh
# Xcode Cloud post-clone: build the Capacitor web app and sync it into iOS
# before Xcode archives. Without this the cloud checkout has no dist/ (it is
# gitignored) and the app would package empty.
set -e

echo "▸ ci_post_clone: preparing Ringo web bundle"

# Node isn't preinstalled on Xcode Cloud images — install via Homebrew if absent.
if ! command -v node >/dev/null 2>&1; then
  echo "▸ installing node via Homebrew"
  brew install node
fi
echo "▸ node $(node -v), npm $(npm -v)"

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "▸ npm ci"
npm ci

echo "▸ npm run build"
npm run build

echo "▸ npx cap sync ios"
npx cap sync ios

echo "✓ web bundle ready in ios/App/App/public"
