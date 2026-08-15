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

## Content inventory (and the scale gap)

Four playable 3D maps:

| Map | Size | Contents |
|---|---|---|
| `outdoor` "Vintavia Coast" | 96×96 (9,216 cells) | town, wilderness, coast, roads, camps, all 8 shop fronts, 4 wandering NPCs |
| `dun1` The Crypt | 30×16 | entered from the outdoor crypt door |
| `dun2` The Catacombs | 30×16 | |
| `dun3` The Vault | 30×8 | endgame |

Plus 8 building interiors that are **UI screens, not 3D maps**, and 6 quests (4 main, 2 side).

That is one region and three small dungeons. MM6 shipped roughly thirty outdoor regions and dozens
of dungeons. Content volume is therefore a *third* axis of the gap, independent of renderer and art
— and it is the one the discriminator will never measure, because a screenshot cannot show how much
world is behind it. Do not let single-screenshot parity hide it.

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

### Terrain features, and the one that breaks the model

A heightfield is a *function* `h(x,y)` — one surface height per point. Six of the seven features
below fall straight out of that. **Bridges do not**: a bridge deck and the ravine floor beneath it
are two surfaces over the same `(x,y)`, which a single-valued heightmap cannot express. Decide this
before writing the march loop, not after.

- **Bridges, gate arches, aqueducts, cave mouths** — all four are *one* primitive, so build it once
  and build it properly: a sparse per-cell **overhead span** `{lo, hi, tex}` — an interval of solid
  matter floating above the terrain, empty in almost every cell. The walk surface is the terrain when
  the party is below `lo`, and `hi` when it is above. That single rule covers everything:
  - *bridge* — you walk on `hi`, and the ravine floor is visible in the gap beneath it;
  - *gate arch* — you walk on the terrain and pass **under** `lo`, with the wall solid overhead;
  - *aqueduct* — both at once: arches you walk under, and a water channel running along `hi`;
  - *cave mouth* — a span forming the cliff overhang above a tunnel entrance, so the dungeon portal
    reads as a dark opening in rock instead of a door standing in a field.

  The march draws the span band in the same pass as the terrain column. Front-to-back with a single
  "filled to y" marker breaks here, because a span can occupy screen rows above ground already
  filled — either track two fill regions per column or draw spans back-to-front (painter's). Decide
  that when writing the loop; it is the one place the cheap trick does not survive contact.
  Collision needs a headroom test under `lo`; the party is ~1.6 units tall. Same primitive later
  gives second-storey walkways and city gatehouses for free.
- **Ravines / canyons** — carved along a spline with steep walls and a flat floor. Their job is
  *routing*: they make bridges and fords load-bearing rather than decorative, and they give the
  vertical drama that makes a screenshot read as MM6 rather than as a lawn. Steep sides also let the
  slope limit do the fencing.
- **Rivers** — carve a channel along a spline, then a water surface per segment. On a slope a river
  needs stepped pools (each with its own flat water level) rather than one tilted plane; the steps
  read as small falls. Reuse the existing animated water tiles (`Art.tick`) on the water plane, plus
  a foam band where `|h − waterLevel|` is small.
- **Oceans** — a global sea level plus the same water plane. The requirement is that the *map edge is
  never visible*: sea has to run out into the distance haze. Vintavia is already a coast, so the
  shoreline is the first place to prove the water/foam/haze stack.
- **Mountains** — ridged fbm above a snow-line ramp. Their real function is to bound the playable
  valley with terrain instead of an invisible wall you bump into, which is a large perceived-quality
  win on its own. Mostly seen at distance, so they lean on draw distance (below).
- **Hills** — the fbm base layer. Roads grade over them; camps and clearings get local flattening.
- **Draw distance** — mountains are only worth having if the march reaches them. Grow the step size
  with distance (standard voxel-space trick): ~96 steps then covers ~200 cells, with far detail
  collapsing into haze exactly where we want it to anyway.

Author all of it from splines + noise under `RNG.world('terrain')` — never from a generated image, or
determinism dies. Build a top-down debug heightmap view early (`?debug`): it is the artifact the
critique loop reads to catch unreachable pockets and silly landforms before they cost render time.

## Meta-production — the loops

The systems in this game were not the hard part. The hard part was *knowing what was actually wrong*
while being the same entity that built it. Everything below is machinery for that. It is the most
reusable thing in this repo — more reusable than any of the game code.

### The five loops, and what each one is actually for

**L1 — Build fan-out.** Parallel agents writing code. The only rule that matters: **one owner per
file.** Two agents editing one file is not a merge conflict, it is silent semantic corruption — one
of them re-implements a rule the other already owns. ARCHITECTURE.md exists to make ownership
declarable ("pure rules modules; glue never re-implements formulas"). Fan-out on *files*, never on
*features*, because features cut across files. When a feature genuinely spans owners, one agent
writes the rule and the others call it.

**L2 — State-dump playtest.** The cheapest and most under-rated loop. `window.__game` drives the sim
(`teleport/gotoMap/walk/press/tap/give/gold/setTime/save/load`) and `window.__session` dumps state.
The loop is: script a play sequence → dump → assert invariants → repeat. Three variants earned their
keep:
- *Invariant assertions*: run a sequence, then check things that must always hold (hp within bounds,
  no item in two places, quest flags monotonic).
- *Conservation probes*: the reported "item duplication bug" was disproved by a 400-operation probe
  that counted every item in the world before and after. A probe is how you refuse to chase a ghost.
- *Determinism diffs*: run the same seeded sequence twice, diff the dumps. Any difference is a bug
  you have not found yet. This is why the RNG registry is serialized into saves.

**L3 — Screenshot critique.** Vision agents reading captures. This only produces signal if the shots
are *the same shots every round*: a fixed shot list — canonical camera positions, fixed seed, fixed
clock time — captured from a **pinned build**. Same shots each round is what separates "we improved"
from "we got a luckier frame". Round N's captures live beside round N's findings; nothing is ever
overwritten.

**L4 — Fresh-eyes panel.** Zero-context agents given the built artifact and a role (veteran of the
genre / first-time impression / QA / aesthete), who have not seen the code or the plan. Context is
the enemy here: an agent that watched the thing get built will grade the effort, not the result. The
panel is why the round-1 veteran score was a 6 while the builder's self-assessment was much higher.
Run at least two rounds — round 2 finds what round 1's fixes broke, and it found exactly that (the
quest-item-loss fix moved the bug rather than removing it).

The panel roster is worth keeping by name, and the **MM6 veteran is the single most valuable seat**
— it produced the harshest and most actionable round-1 review (`critique/panel/veteran.md`, 6/10,
every finding real). It is now a durable agent definition at `.claude/agents/mm6-veteran.md`, so it
survives sessions: spawn it with `Agent(subagent_type: 'mm6-veteran')`. Its whole worth is that it
has no project context — **never brief it on intent, never let it read `src/`, `critique/` or this
file.** The moment it knows what we meant to build, it starts grading effort instead of result.
The other seats (first impression, QA, aesthete) are worth promoting to definitions too.

**L5 — Discriminator.** The ship gate, not a critique. Real MM6 screenshots shuffled with ours,
fresh vision judges labelling real/fake. Ship when accuracy approaches chance. Everything else is
opinion; this is a measurement. **Build it before making more art** — without it, "better" is a
feeling and every fix wave is a guess.

### Invariants every loop needs

1. **Pin the artifact.** Never rebuild `dist/` while judges are mid-run. Findings that reference a
   build that no longer exists cannot be verified or dismissed.
2. **The grader must not be the builder.** No self-grading of subjective quality, ever. The builder
   can grade *tests*; it cannot grade *wow*.
3. **Every finding gets a written disposition.** Accepted-and-fixed, rejected-with-reason, or
   deferred-with-reason — see `critique/panel/round1_disposition.md`. Undisposed findings quietly
   evaporate, and the same one comes back three rounds later.
4. **Verify the fix on screen, not in the diff.** A fix that only exists in code review is a claim.
5. **Ask for methods, not adjectives.** "Make it wow" produced nothing. "Capture these 6 shots, name
   the three specific tells that break the illusion, ranked" produced the entire fix list.
6. **Agents are wrong sometimes.** Two of the loudest reported bugs (item dupe, poison laundering)
   needed probes before fixing — one was real, one was not. Reproduce before you repair.

### Anti-patterns, paid for in full

- **`.catch(()=>{})` in a test is a lie.** The crypt-portal softlock — a hard game-breaker — was
  invisible for hours because an E2E test swallowed the error it was there to catch. Ban silent
  catches and tolerance windows in tests; a test that can't fail isn't one.
- **Grading in the same context that built.** Produces inflated scores and defensive dispositions.
- **Findings without a shot list.** Unreproducible art criticism cannot be closed.
- **Unbounded loops.** Each round costs real budget; see below.

### Loop economics

Budget is a design constraint, not an afterthought — this project ran into a usage ceiling at 96%
with work still queued, which is *why* HANDOFF.md exists. So: decide the round count before starting,
checkpoint (commit + push) at every round boundary, and keep the continuation plan current enough
that a fresh session loses nothing but context. Prefer many small verifiable rounds to one heroic
pass; a round that ends without a commit is a round that may not have happened.

### What to build first next time

Order matters more than effort. Build the harness (L2) before the systems, the shot list and the
discriminator (L3/L5) before the art, and the panel (L4) before believing anything is done.

## Constraints & scars (don't relearn these)

- Environment egress: default-Trusted walls everything but package registries. api.openai.com needs
  the environment's Network access set to Full or Custom allowlist. Config applies to NEW sessions only.
- No MM6 asset rips — reference for comparison only; style parity, original content.
- ARCHITECTURE.md is law: palette discipline, seeded RNG, glue-calls-rules, portal tx/ty test, etc.
- three.js has no UMD build — foundry shims `three.cjs` onto window.THREE.
- Playwright: launch with executablePath '/opt/pw-browsers/chromium'; never `playwright install`.
- Rebuild dist only when no judge agents are mid-run on it.
