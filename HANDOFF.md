# HANDOFF — continue the MM6-indistinguishability push

Everything a fresh session needs to resume this work with nothing lost but conversation context.
Branch: `claude/mm6-single-prompt-guide-49ivfb`. No PR is open; none should be opened unless asked.

Read this file, then `ARCHITECTURE.md` (which is law), then start at
**[First hour of the next session](#first-hour-of-the-next-session)**.

---

## 1. Where the project stands

**Vintavia** is a complete, beatable, phone-playable MM6-class party RPG in a single self-contained
`dist/index.html` — 640×480 palettised software raycaster, Canvas2D, no WebGL, no external assets.
Game doc: `VINTAVIA.md`.

| | |
|---|---|
| Tests | `test/systems.test.js` (2,808 checks) · `test/e2e.test.js` (66) · `test/campaign.test.js` (23 — beats the whole game) |
| Critique history | `critique/` — 3 specialist cycles, 2 fresh-eyes panel rounds, with written dispositions |
| Round-2 panel scores | QA 8.5 (findings fixed) · first impression 7.5 · aesthete 7.0 · veteran 6 from round 1, all findings fixed |
| Published build | https://claude.ai/code/artifact/b49a3924-9f7f-40eb-9cd2-9aa4aced5658 — private, owner must be signed in. Republish `dist/index.html` from the owning conversation, or pass that URL as `url` from any other. |

**The mandate that supersedes everything else**: screenshots that expert judges cannot tell from real
MM6 — "could pass as an unreleased MM6 expansion". The current build reads as a competent 1998
*budget* raycaster. **The gap is assets, renderer features and content volume — not systems.** The
systems are the part that is done.

## 2. Repo map

| Path | What it is |
|---|---|
| `README.md` | the original single-prompt guide (the user's document — do not restructure it) |
| `ARCHITECTURE.md` | **law.** Module map, canonical data shapes, world units, perf budgets, harness semantics |
| `VINTAVIA.md` | game design doc: classes, spells, quests, economy |
| `src/00_core.js` | RNG registry, palette (`PAL`, `palIdx`, `palDither`), `Clock`, `Bus`, `Log` |
| `src/01_rules.js` | pure rules: stats, classes, skills, hit chance, XP, economy, rest, traps |
| `src/02_spells.js` | 27 spells, 9 schools, `Spellcraft.canCast/resolve` |
| `src/03_items.js` | items, 17 monsters, loot tiers |
| `src/04_world.js` | ASCII maps, world build, portals, quests, NPCs, shop stock |
| `src/05_engine.js` | the renderer — DDA walls, floor/ceiling casting, sprites, fog, lightmap |
| `src/06_art.js` | procedural textures, sky, font, UI frame |
| `src/06b_sprites.js` | sprite/portrait/paperdoll/icon painters |
| `src/07_audio.js` | WebAudio music director + SFX |
| `src/08_ui.js` | HUD and every screen |
| `src/09_game.js` | game loop, input, turn-based combat, save/load, interaction |
| `src/10_debug.js` | boot, `?debug` overlay, `__game`/`__session` harness |
| `build.js` | concatenates `src/*.js` in sorted order → `dist/index.html` |
| `tools/foundry.js`, `tools/creatures.js` | 3D sprite foundry (see §5) |
| `assets/manifest.json` | foundry output — currently the goblin only |
| `critique/SHOTLIST.md` | **the canonical shot list.** Every critique round captures exactly these |
| `critique/cycle1,2/`, `critique/panel,panel2/` | past findings + dispositions |
| `.claude/agents/mm6-veteran.md` | the durable veteran reviewer agent |

**Commands**

```bash
node build.js                                    # src/*.js -> dist/index.html
node test/systems.test.js                        # pure-rules suite
node test/e2e.test.js                            # headless browser suite
node test/campaign.test.js                       # plays the game to completion
node tools/foundry.js [creatureId ...]           # render sprites -> assets/manifest.json
```

Playwright: always launch with `executablePath:'/opt/pw-browsers/chromium'`. Never run
`playwright install`.

## 3. Content inventory (and the scale gap)

Four playable 3D maps:

| Map | Size | Contents |
|---|---|---|
| `outdoor` "Vintavia Coast" | 96×96 (9,216 cells) | town, wilderness, coast, roads, camps, all 8 shop fronts, 4 wandering NPCs |
| `dun1` The Crypt | 30×16 | entered from the outdoor crypt door |
| `dun2` The Catacombs | 30×16 | mid-game |
| `dun3` The Vault | 30×8 | endgame |

Plus 8 building interiors that are **UI screens, not 3D maps**, and 6 quests (4 main, 2 side).

That is one region and three small dungeons. MM6 shipped roughly thirty outdoor regions and dozens of
dungeons. Content volume is a *third* axis of the gap, independent of renderer and art — and it is the
one the discriminator will never measure, because a screenshot cannot show how much world is behind
it. Do not let single-screenshot parity hide it.

## 4. Definition of done

"Perfect MM6" is not one goal, it is three, and they fail independently. Write the verdict for each
separately or the good axis will hide the bad one:

1. **Systems** — MM6-shaped rules that hold under abuse. *Done when*: all three suites green, the
   campaign test beats the game, a determinism diff over a scripted session is byte-identical, and the
   veteran panel reports no defect it would have phoned a tipline about.
2. **Presentation** — the screenshot axis. *Done when*: discriminator accuracy over the full shot list
   approaches chance (~50–60%), and judges' stated tells are aesthetic preferences rather than
   structural ones ("the trees repeat" is a fix; "this is a raycaster" is a failure).
3. **Volume** — how much world is behind the screenshot. *Done when*: enough regions and dungeons that
   a player can get lost. **No screenshot measures this**, which is exactly why it will be the axis
   quietly skipped. Give it a number up front and hold to it.

### Measure MM6, do not remember it

Every "MM6 was like this" claim made from memory during this project that mattered turned out to need
checking. Before the next art wave, take reference screenshots and **measure**, recording results in
`critique/MM6_REFERENCE.md`: 3D viewport pixel dimensions inside the 640×480 frame, HUD band height,
portrait size and spacing, wall texture resolution, typical sprite height in pixels at one cell and at
ten, horizon position relative to viewport centre, fog onset distance in cells, the palette's actual
ramp structure, font cap-height. Numbers, not adjectives.

**That file does not exist yet and it is the highest-leverage missing artifact in this repo**, because
every art decision downstream is currently a guess calibrated against a feeling.

Reference for measurement only — no asset rips, ever. Style parity, original content.

## 5. The plan

1. **Sprite foundry** — WORKING (`tools/foundry.js` + `tools/creatures.js`). Three.js in headless
   Chromium renders low-poly primitive-built creature models under a 1998 render-farm light rig, into
   palette-quantized multi-facing sprite frames. Goblin proven (`test/shots/foundry_goblin2.png`).
   **TODO**: model the other 16 creatures + 3 NPC kinds (parallel agents, vision-iterate each);
   integrate the manifest into the build (base64 in `build.js`, facing-aware selection in
   `05_engine.js` — pick facing from entity-vs-camera angle, mirror for 3/8ths).
2. **Renderer parity** — heightfield terrain (§6), variable building heights + pitched roofs, real
   fog, painted sky dome, 128px structured textures, exact MM6 HUD proportions.
3. **Image generation** — once network is open: OpenAI `gpt-image-1` for textures, portraits, UI
   ornament, sky. The user pastes the key; store it OUTSIDE the repo (scratchpad, `chmod 600`), never
   commit it, never put it in an environment variable. Quantize every output through the game palette
   (`palDither`).
4. **Discriminator harness** — the ship metric. ~50 real MM6 screenshots (reference only, never
   shipped) shuffled with ours; fresh vision judges label real/fake; iterate until accuracy approaches
   chance. The judges' stated tells drive each next fix wave.

### 5.1 Art production — the bill of materials

Nobody has ever counted the art this game needs, which is why "asset volume" kept being discussed as
a feeling. Counted from the current source:

| Class | Count | Source | Notes |
|---|---|---|---|
| Creature sprite frames | **~336** | foundry | 17 monsters + ~4 NPC kinds × (idle/walk/attack × 5 facings + corpse) |
| Item icons | 36 | image-gen or hand | one per entry in `ITEMS` |
| Portraits | ~30 | image-gen | 11 named NPCs + party faces + pain variants |
| Paperdoll pieces | ~15 | image-gen or foundry | must register to one body rig |
| Wall textures | 10 now → ~24 | image-gen | target 128px, structured (courses, joints, wear) |
| Floor / ceiling textures | ~12 | image-gen | tiling, per-level |
| Sky bands | ~6 | image-gen | one per time bucket |
| Decor sprites | 14 | foundry | tree, rock, tent, brazier, fountain, shrine, sign, lamp… |
| Spell sigils + school gems | ~36 | procedural or image-gen | 27 spells, 9 schools |
| UI ornament | ~30 | image-gen | frame, rosettes, buttons, tabs, crest |

**Roughly 500 discrete assets, ~340 of them foundry frames.** One creature is done. That is the real
scale of the presentation axis, and it should be planned as a production run — batched, with a
per-batch review gate — not as an open-ended polish pass.

### 5.2 Which generator makes what

Route by what each tool is actually good at, and do not mix routes within an asset class:

- **Foundry (3D → quantized frames)** — anything needing consistent lighting across many facings and
  frames: creatures, NPCs, decor props, paperdoll pieces. It is the only route that gives *coherence
  for free*, because the light rig is fixed and the geometry is the same object seen from angles.
- **Image generation** — flat, single-view surfaces where a model's eye for material beats a
  primitive-built mesh: wall and floor textures, portraits, sky, UI ornament.
- **Procedural (existing `06_art.js` code)** — anything that must animate or vary per-cell: water
  frames, fire, lightmap glow, the font. Keep it; do not regenerate what already works.

### 5.3 The consistency problem, which is the whole problem

Generating one good texture is easy and proves nothing. Generating four hundred assets that look like
they came from **one 1998 art department** is the entire difficulty, and it has exactly three levers:

1. **The palette is the great unifier.** Every asset — foundry, generated, procedural — is quantized
   through `palDither` into the same 256-index ramp structure before it enters the build. This alone
   removes most style drift, and it is non-negotiable: nothing enters the game as RGB.
2. **One style anchor per class.** Approve a single reference asset per class first (one wall, one
   portrait, one icon), commit it, and pass it as the visual reference for every sibling. Never
   generate a class's assets from independent prompts.
3. **Batch review, not per-asset review.** Judge a full contact sheet of a class side by side. Drift
   is invisible one asset at a time and obvious in a grid of twenty. The odd one out gets regenerated,
   not accepted because it is "good on its own".

Fixed prompt preamble for every generated asset: 1998 pre-rendered CRPG, 256-colour, hard warm key
light from upper-left, no modern shading, no text, no signature, flat background for masking.

### 5.4 Acceptance criteria — how an asset is allowed into the build

Reject on any of these; regeneration is cheap and drift is not:

- **Palette-legal**: every pixel is a valid index; transparency is index 0 and *only* index 0.
- **Readable at target size**: creature sprites are judged at their on-screen size at 3–10 cells, not
  zoomed. If the silhouette does not read at 40px tall, the model is wrong — no texture fixes that.
- **Silhouette test**: fill the sprite solid black. It must still be identifiable as its creature.
  This is the single best predictor of whether it reads as MM6.
- **Lighting agrees**: key from upper-left, matching the rig in `tools/foundry.js`. A generated
  texture lit from the right will fight every sprite in the frame.
- **Outlined**: 1px dark outline on sprites (the foundry already does this) — it is what separates
  1998 pre-rendered from a modern render pasted on a background.
- **Tiles cleanly**: textures checked as a 3×3 grid, with no seam and no obvious repeat feature.

### 5.5 Storage, determinism, and the size budget — read before generating anything

**Generated art is not deterministic and must never be produced at build time.** Every asset is
generated once, reviewed, quantized, and **committed to the repo** as baked data. `build.js` only
embeds what is already on disk. Break this and the build stops being reproducible, the shot list
stops being comparable between rounds, and the discriminator's measurements become meaningless.

The size budget is real and currently violated in miniature: `dist/index.html` is **241 KB**, while
`assets/manifest.json` — **one goblin** — is **273 KB** of JSON number arrays. At that rate the ~21
actors alone would add roughly 5.7 MB to a file meant to load instantly on a phone over mobile data.

So before any bulk foundry run, fix the encoding: RLE the palette bytes, or write indexed PNGs and
embed those as base64 (the browser decodes them for free). Either is a 4–8× reduction and turns the
sprite payload into something a phone loads without complaint. Set a hard ceiling — **2 MB for the
whole single-file build** is a sane target — and check it in a test, so it fails loudly rather than
being discovered on a phone at the end.

## 6. Heightfield terrain — the outdoor-parity plan

MM6's outdoor maps (`.odm`) *are* a heightmap: a grid of terrain vertices with per-tile textures, with
buildings as separate models standing on it. Our outdoor map is a flat plane, so every outdoor
screenshot has a dead-level horizon at exactly mid-screen and zero elevation anywhere. That single
fact is the loudest "not MM6" tell we have; no amount of better wall texture fixes it.

**Approach: extend the per-column march to a heightfield (Comanche/voxel-space with per-cell
extrusion), replacing the floor caster.**

- Today `render3D` does floor/ceiling casting (`src/05_engine.js:133`) — a full 640×480 texel walk —
  then a separate DDA wall pass. The heightfield version merges both: for each screen column, step the
  ray outward through cells; at each step read terrain height `H(x,y)` (bilinear over a vertex grid),
  project the ground point to a screen y, and fill the column from the previous y down. A solid cell
  extrudes a prism from `H` to `H + wallHeight`, giving buildings *and* variable heights and roofs
  from the same loop.
- Cost is roughly a wash: ~640 columns × ~96 steps ≈ 60k steps beats the 307k texel writes the floor
  caster does now, and front-to-back with a per-column "filled-to" y lets a column early-out.
- Compositing: keep writing `zb[x]` for the nearest solid hit so existing billboard code still works,
  but sprite feet must sit at `H(x,y)` instead of a constant ground plane (touches sprite y in
  `05_engine.js` and the engine-drawn ground shadows).
- Pitch: MM6's look up/down is a horizon shear, not a real rotation. `horizon` is already a variable
  (`05_engine.js:90`, currently just head-bob) — feed a pitch term into it and free-look is nearly
  free. A heightfield makes that shear read as real terrain instead of a wobbling floor.

**Heightmap authoring** — deterministic like everything else: `RNG.world('terrain')` fbm noise, then
authored overrides. Non-negotiable constraints: building footprints and the town plaza are flat
plateaus; roads are graded ribbons that carve through hills; water is "below level"; a ridge line
frames the valley so there is always something on the horizon. The ASCII grid stays the authority for
solid/walkable; the heightmap is a parallel float array.

**Gameplay ripples** (budget for these — they are where the bugs will be): camera eye =
`H(px,py) + eyeHeight`; a max-climb-slope rule means terrain can trap the party, so
`test/campaign.test.js` is the gate plus a new reachability test that walks the quest route over the
generated heightmap. Monster spawns, camp props and corpses all need ground snapping.

**Sequencing**: terrain *before* wiring the sprite manifest into the engine, or sprite placement gets
written twice.

**Cheap fallback if terrain slips**: a painted mountain-ridge backdrop composited at the horizon with
parallax — ~10% of the work for a real fraction of the impact, and worth having anyway, since real
terrain still wants a painted far range behind it.

### 6.1 Terrain features, and the one that breaks the model

A heightfield is a *function* `h(x,y)` — one surface height per point. Most features fall straight out
of that. **Bridges do not**: a bridge deck and the ravine floor beneath it are two surfaces over the
same `(x,y)`. Decide this before writing the march loop, not after.

- **Bridges, gate arches, aqueducts, cave mouths** — all four are *one* primitive, so build it once
  and build it properly: a sparse per-cell **overhead span** `{lo, hi, tex}`, an interval of solid
  matter floating above the terrain, empty in almost every cell. The walk surface is the terrain when
  the party is below `lo`, and `hi` when above. That single rule covers everything:
  - *bridge* — walk on `hi`, ravine floor visible in the gap beneath;
  - *gate arch* — walk on terrain, pass **under** `lo`, wall solid overhead;
  - *aqueduct* — both at once: arches you walk under, water channel running along `hi`;
  - *cave mouth* — a span forming the cliff overhang above a tunnel entrance, so a dungeon portal
    reads as a dark opening in rock instead of a door standing in a field.

  The march draws the span band in the same pass as the terrain column. Front-to-back with a single
  "filled to y" marker **breaks here**, because a span can occupy screen rows above ground already
  filled — either track two fill regions per column, or draw spans back-to-front (painter's). It is
  the one place the cheap trick does not survive contact. Collision needs a headroom test under `lo`;
  the party is ~1.6 units tall. The same primitive later gives second-storey walkways and gatehouses.
- **Ravines / canyons** — carved along a spline, steep walls, flat floor. Their job is *routing*: they
  make bridges and fords load-bearing rather than decorative, and they give the vertical drama that
  makes a screenshot read as MM6 rather than as a lawn. Steep sides let the slope limit do the fencing.
- **Rivers** — carve a channel along a spline, then a water surface per segment. On a slope a river
  needs stepped pools (each with its own flat level) rather than one tilted plane; the steps read as
  small falls. Reuse the animated water tiles (`Art.tick`), plus a foam band where `|h − waterLevel|`
  is small.
- **Oceans** — a global sea level and the same water plane. The requirement is that the *map edge is
  never visible*: sea must run out into the distance haze. Vintavia is already a coast, so the
  shoreline is where the water/foam/haze stack gets proven first.
- **Mountains** — ridged fbm above a snow-line ramp. Their real function is to bound the playable
  valley with terrain instead of an invisible wall you bump into, which is a large perceived-quality
  win by itself.
- **Hills** — the fbm base layer. Roads grade over them; camps and clearings get local flattening.
- **Draw distance** — mountains only matter if the march reaches them. Grow step size with distance
  (standard voxel-space trick): ~96 steps then covers ~200 cells, far detail collapsing into haze
  exactly where we want it anyway.

Author all of it from splines + noise under `RNG.world('terrain')` — never from a generated image, or
determinism dies. Build a top-down debug heightmap view early (`?debug`): it is the artifact the
critique loop reads to catch unreachable pockets and silly landforms before they cost render time.

## 7. Meta-production — the loops

The systems were not the hard part. The hard part was *knowing what was actually wrong* while being
the same entity that built it. Everything below is machinery for that, and it is the most reusable
thing in this repo — more reusable than any of the game code.

### 7.1 The five loops

**L1 — Build fan-out.** Parallel agents writing code. The only rule that matters: **one owner per
file.** Two agents editing one file is not a merge conflict, it is silent semantic corruption — one of
them re-implements a rule the other already owns. `ARCHITECTURE.md` exists to make ownership
declarable. Fan out on *files*, never on *features*, because features cut across files; when a feature
genuinely spans owners, one agent writes the rule and the others call it.

**L2 — State-dump playtest.** The cheapest and most under-rated loop. `window.__game` drives the sim
(`teleport/gotoMap/walk/press/tap/give/gold/setTime/save/load`), `window.__session` dumps state. Script
a sequence → dump → assert → repeat. Three variants earned their keep:
- *Invariant assertions* — things that must always hold (hp in bounds, no item in two places, quest
  flags monotonic).
- *Conservation probes* — the reported "item duplication bug" was disproved by a 400-operation probe
  that counted every item in the world before and after. A probe is how you refuse to chase a ghost.
- *Determinism diffs* — run the same seeded sequence twice, diff the dumps. Any difference is a bug
  you have not found yet. This is why the RNG registry is serialized into saves.

**L3 — Screenshot critique.** Vision agents reading captures. Signal only exists if the shots are *the
same shots every round*: `critique/SHOTLIST.md`, fixed seed, fixed clock, captured from a **pinned
build**. That is what separates "we improved" from "we got a luckier frame". Round N's captures live
beside round N's findings; nothing is ever overwritten.

**L4 — Fresh-eyes panel.** Zero-context agents given the built artifact and a role (genre veteran /
first impression / QA / aesthete), who have not seen the code or the plan. Context is the enemy: an
agent that watched the thing get built grades the effort, not the result. The panel is why the round-1
veteran said 6 while the builder's self-assessment was much higher. Run at least two rounds — round 2
finds what round 1's fixes broke, and it did exactly that (the quest-item-loss fix moved the bug
rather than removing it).

The **MM6 veteran is the single most valuable seat** — harshest and most actionable review of the
project (`critique/panel/veteran.md`, 6/10, every finding real). It is now a durable agent at
`.claude/agents/mm6-veteran.md`: spawn with `Agent(subagent_type:'mm6-veteran')`. Its entire worth is
having no project context — **never brief it on intent, never let it read `src/`, `critique/`, or this
file.** The moment it knows what we meant to build, it grades effort instead of result. The other
three seats are worth promoting to definitions too.

**L5 — Discriminator.** The ship gate, not a critique. Real MM6 screenshots shuffled with ours, fresh
vision judges labelling real/fake. Ship when accuracy approaches chance. Everything else is opinion;
this is a measurement. **Build it before making more art** — without it, "better" is a feeling and
every fix wave is a guess.

### 7.2 Invariants every loop needs

1. **Pin the artifact.** Never rebuild `dist/` while judges are mid-run. Findings against a build that
   no longer exists can be neither verified nor dismissed.
2. **The grader must not be the builder.** The builder can grade *tests*; it cannot grade *wow*.
3. **Every finding gets a written disposition** — fixed, rejected-with-reason, or deferred-with-reason
   (see `critique/panel/round1_disposition.md`). Undisposed findings evaporate and return three rounds
   later.
4. **Verify the fix on screen, not in the diff.** A fix that exists only in code review is a claim.
5. **Ask for methods, not adjectives.** "Make it wow" produced nothing. "Capture these 6 shots, name
   the three specific tells that break the illusion, ranked" produced the entire fix list.
6. **Agents are wrong sometimes.** Two of the loudest reported bugs needed probes before fixing — one
   was real, one was not. Reproduce before you repair.

### 7.3 Anti-patterns, paid for in full

- **`.catch(()=>{})` in a test is a lie.** The crypt-portal softlock — a hard game-breaker — stayed
  invisible for hours because an E2E test swallowed the exact error it existed to catch. Ban silent
  catches and tolerance windows; a test that cannot fail is not one.
- **Grading in the same context that built.** Inflated scores, defensive dispositions.
- **Findings without a shot list.** Unreproducible art criticism cannot be closed.
- **Unbounded loops.** Every round costs real budget.

### 7.4 Loop economics

Budget is a design constraint, not an afterthought — this project hit a usage ceiling at 96% with work
still queued, which is *why* this file exists. Decide the round count before starting, checkpoint
(commit + push) at every round boundary, and keep this document current enough that a fresh session
loses nothing but conversation. Prefer many small verifiable rounds to one heroic pass. A round that
ends without a commit is a round that may not have happened.

### 7.5 Order of construction

Build the harness (L2) before the systems, the shot list and discriminator (L3/L5) before the art, and
the panel (L4) before believing anything is done.

## 8. First hour of the next session

In order, before writing a line of game code. These prevent the two failure modes that actually
happened here — building on an unverified base, and grading yourself.

1. `node test/systems.test.js && node test/e2e.test.js && node test/campaign.test.js` — confirm the
   base is green before touching it. If it is red, that is the whole first task.
2. `node build.js`, then capture the full shot list into `critique/shots/r0/` with the commit SHA
   recorded. That is the "before" everything else is measured against, and it takes minutes.
3. Build `critique/MM6_REFERENCE.md` by measuring reference screenshots (§4).
4. Spawn `mm6-veteran` on the r0 build, cold, unbriefed. Read its verdict *before* choosing work — the
   plan in this file is a hypothesis and the veteran is the test of it.
5. Only now pick the work. Terrain first (it moves shots s03/s04/s05 and blocks sprite placement),
   then the foundry backlog, then image-gen textures.
6. Commit and push at every round boundary.

## 9. Backlog

- [ ] `critique/MM6_REFERENCE.md` — measured reference numbers (blocks all art work)
- [ ] Heightfield terrain + overhead-span primitive (§6)
- [ ] Terrain reachability test over the generated heightmap
- [ ] Sprite encoding + size budget test (see §5.5) — **do this before any bulk foundry run**
- [ ] Foundry: 16 remaining creatures + 3 NPC kinds + 14 decor props
- [ ] Manifest integration: base64 in `build.js`, facing-aware sprite selection in `05_engine.js`
- [ ] Variable building heights + pitched roofs
- [ ] Painted sky dome; 128px structured textures; MM6 HUD proportions
- [ ] Style anchors: approve one wall, one portrait, one icon before generating their classes (§5.3)
- [ ] Image-gen pass for textures/portraits/ornament (needs open network + user's key re-pasted)
- [ ] Discriminator harness + first measured round
- [ ] Promote first-impression / QA / aesthete panel seats to `.claude/agents/`
- [ ] Content volume: more regions and dungeons (pick a target number first)

## 10. Honest odds

Nothing in this document guarantees a perfect MM6, and a handoff claiming otherwise would be the least
useful kind. What is here removes the *avoidable* failures: unverified bases, self-grading,
unreproducible criticism, findings that evaporate, context lost between sessions.

What remains genuinely hard, in order: **asset volume** (hundreds of textures, sprites and portraits
at consistent quality — the foundry is the answer, but it has produced one creature out of twenty),
**content volume** (four maps against MM6's dozens, invisible to every metric we have), and **the last
10% of the renderer**, where each remaining tell costs more than the one before it. Budget
accordingly, and prefer finishing one axis convincingly over advancing three halfway.

## 11. Constraints & scars (don't relearn these)

**Environment**
- Egress: default-Trusted blocks everything but package registries. `api.openai.com` needs the
  environment's Network access set to Full or a Custom allowlist. **Config applies to NEW sessions
  only.** A 403 on CONNECT is a policy denial — do not retry it, and never disable TLS verification or
  unset `HTTPS_PROXY`.
- Playwright: launch with `executablePath:'/opt/pw-browsers/chromium'`; never `playwright install`.
- three.js ships no UMD build — the foundry shims `three.cjs` onto `window.THREE`.
- Rebuild `dist/` only when no judge agents are mid-run against it.

**Legal**
- No MM6 asset rips, ever. Reference for measurement and comparison only; style parity with original
  content.

**Code**
- `ARCHITECTURE.md` is law: palette discipline, seeded RNG, glue-calls-rules, canonical data shapes,
  one owner per file.
- `bakePix` must keep palette index 0 verbatim. Remapping 0→240 turned the UI frame's viewport hole
  into an opaque black plate and blacked out the whole game.
- Every portal needs `tx`/`ty` landing coordinates, placed *beside* the reciprocal stairs, never on
  them. Missing coords softlock the game; landing on the return portal bounces the player. There are
  tests asserting both — keep them.
- Sprite pixel writes must clamp the shade nibble: `(pi&240)|(s<0?0:s>15?15:s)`.
- In `page.evaluate`, `const` globals are not on `window` — guard with `typeof Game!=='undefined'`.
- Quest items must sort first when looting, or mundane loot consumes the last pack slot and the quest
  item is destroyed.
- Save loading must sniff the schema *before* mutating state, and roll back on failure — a hostile
  save previously caused a 91-error crash loop.
- Turn-based combat: an order must always grant a full round, or the budget drains and recoveries
  never tick (deadlock).

**Process**
- The user's bar is the panel's verdict, not the builder's. Report ceilings honestly and early; the
  most damaging moment of this project was shipping a link that did not meet the stated bar.
