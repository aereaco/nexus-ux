@echo off
deno run -A scripts/git/manifest.ts
git add site/_pages/manifest.json
