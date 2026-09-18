#!/bin/zsh
SP="$(cd "$(dirname "$0")" && pwd)"
cd "$HOME/ringo"
mkdir -p "$SP/shots"
i=0
for spec in "landing|Browse plans first" "store|From " "destination:europe|Continue" "destination:global|Continue" "install:Europe|Install on this iPhone" "help|Common questions"; do
  i=$((i+1)); port=$((5400+i))
  shot="${spec%%|*}"; probe="${spec#*|}"; name="${shot%%:*}"
  out="$SP/shots/$i-$name.png"; rm -f "$out"
  VITE_SHOT="$shot" npx vite --port $port --strictPort >/dev/null 2>&1 &
  vpid=$!
  for t in {1..40}; do curl -s -o /dev/null "http://localhost:$port" && break; sleep 0.5; done
  node "$SP/cdp-shoot.mjs" $port "$out" "$probe"
  pkill -P $vpid 2>/dev/null; kill $vpid 2>/dev/null
  sips -g pixelWidth -g pixelHeight "$out" 2>/dev/null | tail -2 | tr '\n' ' '; echo " <- $i-$name"
done
pkill -f "vite --port 540" 2>/dev/null
