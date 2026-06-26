#!/usr/bin/env bash
# Bundle each API entry point into a self-contained .js file using esbuild.
# @vercel/node doesn't inline cross-file imports for ESM — so we do it ourselves.
set -euo pipefail

for f in api/health.ts api/jd/parse.ts api/jd/score.ts api/resume/tailor.ts api/resume/import.ts; do
  out="api/$(basename "${f%.ts}.js")"
  # Handle nested dirs: api/jd/parse.ts → api/jd/parse.js
  if [[ "$f" == api/*/* ]]; then
    dir=$(dirname "$f")
    out="${dir}/$(basename "${f%.ts}.js")"
  fi
  npx esbuild "$f" \
    --bundle \
    --platform=node \
    --format=esm \
    --target=node20 \
    --packages=external \
    --outfile="$out"
done
