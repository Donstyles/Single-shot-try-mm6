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
2. **Renderer parity**: heightfield terrain (see below), variable building heights + pitched roofs,
   real fog, painted sky dome, 128px structured textures, exact MM6 HUD proportions.
3. **Image generation** (once network open): OpenAI `gpt-image-1` for textures/portraits/UI ornament/
   sky. Key: user pastes it; store OUTSIDE the repo (scratchpad), never commit. Quantize everything
   through the game palette (`palDither` in src/00_core.js).
4. **Discriminator harness** (the ship metric): collect ~50 real MM6 screenshots (reference only,
   never shipped), shuffle with ours, fresh vision agents label real/fake; iterate until accuracy
   approaches chance. Judges' stated tells drive each next fix wave.

## Heightfield terrain — the outdoor-parity plan

MM6's outdoor maps (`.odm`) *are* a heightmap: a grid of terrain vertices with per-tile textures,
with buildings as separate models standing on it. Our outdoor map is a flat plane, so every outdoor
screenshot has a dead-level horizon at exactly mid-screen and zero elevation anywhere. That single
fact is the loudest "not MM6" tell we have; no amount of better wall texture fixes it.

**Approach: extend the per-column march to a heightfield (Comanche/voxel-space with per-cell
extrusion), replacing the floor caster.**

- Today `render3D` does floor/ceiling casting (`src/05_engine.js:133`) — a full 640×480 texel walk —
  then a separate DDA wall pass. The heightfield version merges both: for each screen column, step
  the ray outward through cells; at each step read terrain height `H(x,y)` (bilinear over a vertex
  grid), project the ground point to a screen y, and fill the column from the previous y down. A
  solid cell extrudes a prism from `H` to `H + wallHeight`, giving buildings *and* variable heights
  and roofs from the same loop.
- Cost is roughly a wash: ~640 columns × ~96 steps ≈ 60k steps beats the 307k texel writes the floor
  caster does now, and front-to-back with a per-column "filled-to" y lets a column early-out.
- Compositing: march front-to-back keeping the `ybuf`; keep writing `zb[x]` for the *nearest* solid
  hit so existing billboard code still works, but sprite feet must be placed at `H(x,y)` instead of
  a constant ground plane (touches sprite y in `05_engine.js` and the engine-drawn ground shadows).
- Pitch: MM6's look-up/down is a horizon shear, not a real rotation. `horizon` is already a variable
  (`05_engine.js:90`, currently just head-bob) — feed a pitch term into it and free-look is free.
  A heightfield makes that shear read as real terrain instead of a wobbling floor.

**Heightmap authoring** — deterministic, same discipline as everything else: `RNG.world('terrain')`
fbm noise, then authored overrides. Constraints that are non-negotiable: building footprints and the
town plaza are flat plateaus; roads are graded ribbons (walkable slope) that carve through hills;
water is "below level"; a ridge line frames the valley so there is always something on the horizon.
The ASCII grid stays the authority for solid/walkable; the heightmap is a parallel float array.

**Gameplay ripples** (budget for these, they are where the bugs will be): camera eye = `H(px,py) +
eyeHeight`; a max-climb-slope rule means terrain can trap the party — `test/campaign.test.js` is the
gate, plus a new reachability test that walks the quest route over the generated heightmap. Monster
spawns, camp props and corpses all need ground snapping.

**Sequencing**: do terrain *before* wiring the sprite manifest into the engine, otherwise sprite
placement gets written twice.

**Cheap fallback if terrain slips**: a painted mountain-ridge backdrop composited at the horizon
with parallax. ~10% of the work for a real fraction of the impact, and it's worth having anyway —
real terrain should still have a painted far range behind it.

## Constraints & scars (don't relearn these)

- Environment egress: default-Trusted walls everything but package registries. api.openai.com needs
  the environment's Network access set to Full or Custom allowlist. Config applies to NEW sessions only.
- No MM6 asset rips — reference for comparison only; style parity, original content.
- ARCHITECTURE.md is law: palette discipline, seeded RNG, glue-calls-rules, portal tx/ty test, etc.
- three.js has no UMD build — foundry shims `three.cjs` onto window.THREE.
- Playwright: launch with executablePath '/opt/pw-browsers/chromium'; never `playwright install`.
- Rebuild dist only when no judge agents are mid-run on it.
