# HANDOFF — continue the MM6-indistinguishability push

Context for any session resuming this work on branch `claude/mm6-single-prompt-guide-49ivfb`.

## Where the project stands

- **Complete, playable, tested game** ("Vintavia"): see VINTAVIA.md. Suites: `node test/systems.test.js`
  (2,808), `node test/e2e.test.js` (66), `node test/campaign.test.js` (23 — beats the whole game).
  Published artifact (owner-only URL): https://claude.ai/code/artifact/b49a3924-9f7f-40eb-9cd2-9aa4aced5658
  — republish `dist/index.html` from the owning conversation, or pass that URL as `url` from another one.
- **Critique history**: `critique/` — 3 specialist cycles, 2 fresh-eyes shipping panel rounds with
  dispositions. Round-2 scores: QA 8.5→(fixed), first impression 7.5, aesthete 7.0, veteran (round-1) 6
  with all findings fixed.
- **New mandate**: user wants screenshots that expert judges cannot distinguish from real MM6
  ("could pass as an unreleased MM6 expansion"). Current build reads as a competent 1998 *budget*
  raycaster — the gap is assets and renderer features, not systems.

## The plan (agreed with user)

1. **Sprite foundry** (WORKING — `tools/foundry.js` + `tools/creatures.js`): Three.js in headless
   Chromium renders low-poly primitive-built creature models with a 1998 render-farm light rig into
   palette-quantized multi-facing sprite frames (`assets/manifest.json`). Goblin proven
   (test/shots/foundry_goblin2.png). TO DO: model the other 16 creatures + 3 NPC kinds (parallel
   agents, vision-iterate each), integrate manifest into the game (base64 in build.js, facing-aware
   sprite selection in 05_engine.js — pick facing from entity-vs-camera angle, mirror for 3/8ths).
2. **Renderer parity**: heightfield terrain (voxel-space columns), variable building heights +
   pitched roofs, real fog, painted sky dome, 128px structured textures, exact MM6 HUD proportions.
3. **Image generation** (once network open): OpenAI `gpt-image-1` for textures/portraits/UI ornament/
   sky. Key: user pastes it; store OUTSIDE the repo (scratchpad), never commit. Quantize everything
   through the game palette (`palDither` in src/00_core.js).
4. **Discriminator harness** (the ship metric): collect ~50 real MM6 screenshots (reference only,
   never shipped), shuffle with ours, fresh vision agents label real/fake; iterate until accuracy
   approaches chance. Judges' stated tells drive each next fix wave.

## Constraints & scars (don't relearn these)

- Environment egress: default-Trusted walls everything but package registries. api.openai.com needs
  the environment's Network access set to Full or Custom allowlist. Config applies to NEW sessions only.
- No MM6 asset rips — reference for comparison only; style parity, original content.
- ARCHITECTURE.md is law: palette discipline, seeded RNG, glue-calls-rules, portal tx/ty test, etc.
- three.js has no UMD build — foundry shims `three.cjs` onto window.THREE.
- Playwright: launch with executablePath '/opt/pw-browsers/chromium'; never `playwright install`.
- Rebuild dist only when no judge agents are mid-run on it.
