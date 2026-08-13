# ARCHITECTURE — "Vintavia" (an MM6-class homage)

Single-file deliverable: `dist/index.html`, built by `node build.js` which
concatenates `src/*.js` in filename order into an HTML shell. No external
assets, no network calls, no `Math.random` — all randomness through the
seeded RNG registry.

## Module map (one owner per file)

| File | Owns |
|---|---|
| `src/00_core.js` | RNG registry (`RNG.get(name)`), math helpers, palette (256 colors), event bus, game clock model |
| `src/01_rules.js` | PURE rules: attributes, classes, skills, derived stats, combat math, economy math, leveling, resting, conditions |
| `src/02_spells.js` | PURE spell definitions: 9 schools, costs, effects as data + pure resolvers |
| `src/03_items.js` | PURE item + monster definitions; item generation; name→id resolution tables (shared by art & data) |
| `src/04_world.js` | Map generation (town, outdoor 96×96, dungeon 3 levels), quest definitions, NPC/dialog data |
| `src/05_engine.js` | Software raycaster (walls, floor/sky casting, billboard sprites, z-buffer), adaptive render scale |
| `src/06_art.js` | ALL procedural art baking: wall/floor textures, creature sprites + corpses, portraits, paperdolls, carved-stone UI tiles, item icons |
| `src/07_audio.js` | WebAudio synth: single MusicDirector (adaptive tracks), SFX bank, master limiter |
| `src/08_ui.js` | HUD + every screen (chargen, inventory, spellbook, quest log, shops, dialog, rest, save/load). Glue ONLY — calls rules, never re-implements them |
| `src/09_game.js` | Game state singleton, main loop, input bindings + consumers, entity updates, save/load serialization |
| `src/10_debug.js` | `window.__game` / `window.__session` harness, `?debug` on-device diagnostic overlay with COPY REPORT |
| `build.js` | Concatenate + wrap into `dist/index.html` |
| `test/systems.test.js` | Systems test harness (node). Must pass before any commit |

## Canonical data shapes (single writer each — declared here, imported everywhere)

- **Clock**: `{min}` — total game minutes since Day 1 00:00. Derived getters
  only via `Clock.parts(min)`. No second clock anywhere.
- **Inventory**: each PC: `{items: [itemInstance|null × 64], gold: (party-level)}`.
  Gold lives ONLY on `party.gold`. Item instance: `{id, ench?, charges?}`.
- **Equipment**: `pc.equip = {weapon, shield, armor, helm, boots, ring1, ring2, amulet}` (item instances or null).
- **Quest state**: `party.quests = {qid: {state: 'offered'|'active'|'done'|'turned', n?}}`. One container. UI reads via `Quests.status()` only.
- **Save**: `{v, seed, clock, party, mapId, px, py, ang, flags, monstersDelta, slotMeta}`.
  Two slots: `save_manual`, `save_auto` in localStorage — autosave NEVER writes `save_manual`.
- **Monster instance**: `{mid, x, y, hp, state, homeX, homeY, lastHitBy?}` — world owns spawn lists per map, deltas persisted in save.

## World units

- Grid cell = 1.0 unit ≈ 4 m. Player radius 0.30, monster radius 0.35.
- Move speed 3.2 u/s walk; turn 2.6 rad/s. Melee reach 1.3 u. Sprite scale: 1.0 = fills one cell height.
- Facing: radians, 0 = +X (east), CCW positive. `teleport(x, y, ang?)` takes CELL coordinates.

## Renderer + perf budgets

- Internal framebuffer 640×360 view region inside a 640×480 palettised UI frame; integer-upscaled to CSS pixels.
- Software raycaster: budget ≤ 8 ms/frame on iPhone at renderScale 1; auto-drops to 0.5 when frame avg > 14 ms.
- Palette: 256-entry fixed palette in `00_core.js`; ordered 4×4 Bayer dither for all art baking. No alpha blending in the 3D view except sprite keying.
- No WebGL, no shaders — software rendering sidesteps the WebKit shader-compile scar entirely.

## The law

1. Glue (08_ui, 09_game) may only CALL rules (01–03) — never re-implement
   formulas. `test/systems.test.js` includes divergence tests that fail if UI
   paths compute their own math.
2. Everything seeded: world layout from `worldSeed` only; runtime rolls from
   persistent named streams (`RNG.get('combat')`, `RNG.get('loot')`,
   `RNG.get('rest')`) that live for the session and are re-seeded from save.
3. Name→id resolution: `03_items.js` exports `MONSTERS`/`ITEMS` tables keyed
   by id; art bakes FROM those ids. A sprite with no stats row is a build error.
4. Every input binding in `09_game.js` BINDINGS has a consumer; the test
   harness asserts each action's synthetic keypress reaches its handler.

## Debug harness API (semantics matter)

- `__game.newGame(opts?)` — full new game via REAL chargen defaults (Recommended party) unless `opts.skipChargen`.
- `__game.teleport(x, y, ang?)` — cell coords, all args explicit.
- `__game.walk(ms)` — returns a Promise; simulates held forward for game-time ms (steps the sim directly, does not depend on real time).
- `__game.spawn(mid, dx?, dy?)`, `__game.setTime(min)`, `__game.press(action)`, `__game.save(slot)`, `__game.load(slot)`.
- `__session` — read-only live snapshot: party, clock, position, mapId, monsters in radius, fps, last 20 log lines.

## First-session design (contractual)

Spawn: deterministic, on Vintavia's signed main street facing the weapon
shop. Safe-arrival grace: no monster aggro until first input. Goblins (weak,
melee, singles) within 20 cells of town; casters only beyond the ridge.
First quest giver 6 cells from spawn; target a signposted 30-cell walk.
Defeat → respawn at temple, 1 hp party, autosave slot only — manual save untouched.
