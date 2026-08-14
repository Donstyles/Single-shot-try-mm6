# QA Panel — Technical Fitness Review

**Judge:** technical QA lead (fresh eyes, dist/index.html judged as shipped, no rebuild)
**Date:** 2026-08-14
**Method:** headless Chromium (Playwright) driving the shipped `dist/index.html` over HTTP, using the `window.__game` / `window.__session` harness plus direct `Game`/`World`/`Rules`/`Engine` access. `page.on('pageerror')` + console-error monitoring active across every session.

## VERDICT: SHIP — 8.5/10

The core contract holds everywhere it matters: save/load round-trips are byte-honest under hostile conditions, defeat never touches the manual slot, storage failure and version mismatch are handled politely, the sim is fully deterministic, memory is flat over a 10-minute soak, and not one uncaught exception surfaced in any normal-play path. Four defects found — one MAJOR progression-bricking edge case (quest items destroyed when all 192 pack slots are full), one MINOR crash-loop on hand-tampered structurally-invalid saves, one MINOR unpruned-kill-data observation, one TRIVIAL suppressed hint. None is reachable in ordinary play.

---

## 1. Corruption hunt — CLEAN

Deep JSON diff of a full state dump (party, quests, flags, buffs, equipment, pack contents per slot, corpses, per-map monster rosters, opened doors, explored-bit counts, RNG seed, clock, position) captured synchronously at save time vs. synchronously at Continue time, with a **full page reload between every case**.

| Case | Result |
|---|---|
| Save mid-combat with a Fire Bolt projectile in flight (dun1, 2 chasers) | **CLEAN** — zero drift; in-flight projectile intentionally dropped on load (`load()` sets `projectiles=[]`), party/world state exact |
| Save inside dun1 / dun2 / dun3, reload page, Continue | **CLEAN** ×3 |
| Save with pc2 dead + pc3 poisoned (hp 7), 2 active quests (one at `done`), bless buff up | **CLEAN** — conds after load `ok,dead,poisoned,ok` (no resurrection), quest states `{main1:active, main2:done}` exact, buff `until` preserved |
| save → reload → Continue → save again, diff | **CLEAN** (only 0.01-cell monster wander between the two live captures — real-time drift, not corruption) |
| Die in dun1 / dun2 / dun3 (all unconscious) | **PASS** ×3 — fade plays, party wakes at temple (outdoor 33.5,39.2) at 1 hp/`ok`, 10% gold tithe taken, **autosave written, manual slot's raw localStorage string byte-identical before/after** (exact string compare) |
| Continue picks newest slot | **PASS** — `newestSlot()` correctly returns the newer autosave over the older manual (no time travel) |

Also verified: `serialize()` prunes looted corpses; doors/chest flags round-trip; explored map bits round-trip exactly through the 6-bit packing.

## 2. Edge cases

| Test | Result |
|---|---|
| Fill all 192 pack slots (4×48), then buy | **PASS** — "All packs are full.", gold untouched |
| Buy every path at gold 0 (item, spell, temple heal, donate, tavern rest, train, learn skill, bank over-withdraw) | **PASS** ×8 — every path refuses with a toast, `goldDelta` 0, no state change |
| Sell equipped weapon | **PASS** — equipped gear lives in `pc.equip`, sell grid only iterates `pc.items`; unequip with a full pack refuses ("Backpack is full."); `sellItem` with out-of-range index is a no-op |
| Sell quest item | UI never offers quest items (slot `quest` skipped in sell grid). Engine-level `Game.sellItem` would take one, but it is unreachable from the shipped UI. OK |
| Train at xp 999 / 1000 / 1001 (L2 needs 1000) | **PASS** — 999 refused "Not enough experience.", 1000 and 1001 train. Exact-threshold correct |
| Cast all 15 cleric + 18 sorcerer spells (skills maxed, sp 999, live target) | **PASS** — all 33 casts resolve, zero exceptions. Raise/cure/awaken with no eligible target refuse "No one needs that."; Raise with a dead ally works (cond `ok`, hp 1); dead caster refused "X cannot act" |
| Sigil door without sigil (dun3, door 13,2) | **PASS** — "A sigil-shaped hollow glows. Something is missing.", door stays shut; with sigil it opens ("The Vault Sigil flares") |
| Vault teleporter mid-combat (dun3 exit portal, chasing skel_guard adjacent) | **PASS** — walk-on transition is deferred ("Press Use to take the stairs — the fight rages on!"); a deliberate Use takes it, which is the documented design |
| Rest with chasing wolf adjacent | **PASS** — "Enemies are upon you — no rest now!", screen never opens; opens normally once the area is calm |
| Real chargen path (title → New Game → Begin! via taps) | **PASS** — lands in play with the recommended party |

### Defect QA-1 — MAJOR: quest items silently destroyed when all packs are full
- **Repro:** fill every pack slot (192× bread). (a) Open the censer chest in dun1 → chest is flagged opened (`flags.chests` set before loot is granted, dist line ~3650), gold is paid, the Silver Censer is **destroyed** — log says only "You find 18 gold."; reopening says "Empty." Quest *Silver for the Temple* is now permanently uncompletable. (b) Kill the necromancer with full packs and search the corpse → corpse marked `looted=true` first, log says "…(pack full: Vault Sigil left)" — but the corpse is gone from the world and the Sigil with it. **The message says "left"; nothing is left.** Main-quest chain bricked.
- **Why MAJOR not CRITICAL:** 192 slots across four heroes is enormous; hitting this requires deliberate hoarding, and `lootCorpse`/chest loot warn at least partially. But it destroys unique progression items with no recovery, and the "left" wording actively misleads.
- **Fix sketch:** never destroy `slot:'quest'` items — leave the corpse unlooted / chest unflagged, or force-overwrite a consumable, or drop the item at the party's feet.

### Defect QA-2 — TRIVIAL: stairs-deferred hint suppressed in first 3 s of page life
`checkPortal()` throttles the "Press Use to take the stairs" toast with `performance.now()-(this._stairNote||0)>3000`; on a freshly loaded page `performance.now()<3000` so the first hint is silently swallowed. The defer itself still works. One-line fix.

## 3. Storage abuse — CLEAN (one hardening gap)

| Test | Result |
|---|---|
| `Storage.prototype.setItem` throws (quota/blocked), manual save | **PASS** — returns false, toasts "Could not save (storage blocked).", no exception |
| Same, autosave path | **PASS** — silent, no crash |
| Corrupt save JSON (`{"v":3,"party":{oops`) + reload | **PASS** — `newestSlot()` swallows the parse error, no Continue button shown, title works, no crash |
| Save rewritten to `v:1` + reload + Continue | **PASS** — "That save is from an older build." at title; load path itself says "Save from an older build — starting fresh is safest." Game stays at title |

### Defect QA-3 — MINOR: structurally-hostile v3 save crashes load mid-write
- **Repro:** hand-write a *syntactically valid* save with `v:3` but garbage fields (`party:null, mapId:'nope', flags:null`) into `vintavia_manual`, reload, tap Continue → uncaught `TypeError: Cannot read properties of undefined (reading 'name')` at dist line 4012 (`World.maps[this.mapId].name`), thrown **after** `state='play'` and `party=null` were already assigned → ~60 pageerrors/sec crash loop (`Cannot read properties of undefined (reading 'doors')`), frozen screen. Measured 91 pageerrors in 1.5 s.
- **Why MINOR:** the game never writes such a save; version check + JSON.parse guard cover every organic corruption mode (truncation, old build). Only reachable by deliberate devtools tampering. Still, `load()` mutates live state before validating — a schema check or try/catch-with-rollback around `load()` would close it.

## 4. Memory / performance soak — PASS

~10 minutes of continuous simulated play: 5-spot rotation across all 4 maps each cycle, 3 spawned monsters killed per cycle via `press('attack')` + `Game.update` + Fireballs, every corpse looted, loot sold, and 8 screens (inventory, spellbook, quests, map, menu, weapon shop, guild, rest camp) opened/closed with real rendered frames every cycle.

**Totals:** 1,059 cycles, 8,472 screen open/closes, 2,974 monsters killed and looted, 5,050 game-minutes elapsed.

| Metric | Start (post-GC) | End (post-GC) | Verdict |
|---|---|---|---|
| `usedJSHeapSize` | 8.11 MB | 20.85 MB (+12.15 MB) | Flat once retained data is accounted for — see below |
| `Engine.frameAvg` | 15.1 ms (boot spike; steady-state ~2.5–3 ms by t=7s) | 2.8 ms | **No degradation** across 10 min and ~6,200 accumulated entities |
| `Engine.renderScale` | 1 | 1 | never downgraded |
| `Game.projectiles` | 0 | 0 (peak 2) | **bounded** — spliced on impact/ttl |
| `Game.corpses` | 0 | 2,974 (all looted, none pruned) | grows 1:1 with kills — see QA-4 |
| dead entries in `map.monsters` | 0 | 2,974 | grows 1:1 with kills — see QA-4 |
| `Log.lines` | 2 | 60 | **capped at 60** |
| uncaught errors during soak | — | **0** | clean |

The 12 MB heap delta is dominated by the retained corpse/dead-monster entries my spawner created (≈6,000 small objects plus loot items); mid-run samples tracked kill count linearly and GC sawtoothed normally (14→24 MB oscillation). No screen-churn leak: 8,472 UI open/closes left nothing behind.

### Defect QA-4 — MINOR: looted corpses and dead monsters are never pruned in-session
`Game.corpses` entries (even after looting) and dead entries in `map.monsters` live until the next load/newGame; both are iterated every frame by `buildEntities`/`updateMonsters`. Growth is 1:1 with kills — **unbounded relative to kills, but bounded in real play** because the monster population is fixed (~62 seeded + occasional 2-wolf/2-skeleton ambush spawns; no respawns), and even 3,000 dead entities cost only ~3 ms frames and a few MB. Worth a `filter` pass on loot/kill before any respawn feature is added.

## 5. Error monitor — CLEAN

`page.on('pageerror')` + console-error capture across **every** session above (boot, chargen, combat, save/load ×10+, dungeon deaths ×3, 33 spell casts, full soak): **zero uncaught exceptions, zero console errors** in all normal-play paths. The only exceptions ever observed came from the deliberately hand-tampered v3 save (QA-3). One cosmetic note: the page declares no favicon, so hosts serve a 404 for `/favicon.ico` (network noise only, not a script error).

## 6. Determinism — PASS

Two fresh pages, identical synchronous action script (`newGame` → 40 attack/step rounds vs a seeded goblin → 25 Fire Bolts in dun1 → chest loot incl. trap roll → `doRest()` gamble): **byte-identical state dumps including the full combat log, loot ("You find 20 gold, Studded Leather, Silver Censer."), trap outcome, and the rest-ambush roll ("Bone scrapes stone…")**. World seed is fixed (`vintavia-1`), RNG streams are named, serialized in saves, and restored on load — reload cannot reroll outcomes.

## 7. ?debug overlay — PASS

Loads on `?debug`: overlay present with COPY REPORT / REFRESH / CLOSE. Report data verified honest against ground truth: UA, screen/dpr, canvas CSS size + scale, "software raycaster (no WebGL/shaders)" (true — it is), renderScale/frameAvg (live values), audio state, `storage: ok` (probed via real setItem), game state/map/pos (updates correctly after starting a game), safe-area insets, `errors: none`. **COPY REPORT works** — clipboard received the full 466-char report, and the pre pane confirms "(copied to clipboard)".

## Observations (no action required)

- Dead monsters stay in `map.monsters` (hp 0) and **are serialized**: 200 artificial kills grew the save 10.6 KB → 41.7 KB and all 200 dead entries round-trip. In real play the monster set is fixed (~62 + occasional ambush spawns), so this is bounded (~10–15 KB saves), but a respawn feature added later would make saves grow without limit.
- `turnBased` mode is not serialized — Continue always resumes in real-time mode. Defensible; worth knowing.
- In-flight projectiles are dropped by save/load (by design, `projectiles=[]` on load) — a shot fired before saving vanishes on reload. Cosmetic.
- Engine-level `Game.buySpell`/`sellItem` don't re-validate what the UI filters (duplicate spells, quest items), but no shipped UI path reaches them with bad arguments.

## Score rationale

| Area | Grade |
|---|---|
| Save/load integrity under hostile conditions | 10/10 |
| Defeat/autosave isolation | 10/10 |
| Purchase/econ edge handling | 9/10 |
| Spell/target edge handling | 10/10 |
| Storage failure handling | 9/10 (QA-3) |
| Memory/perf | 9/10 (QA-4, harmless at real scales) |
| Uncaught exceptions | 10/10 in reachable play |
| Loot-with-full-pack | 4/10 (QA-1 destroys quest items) |

**8.5/10 — SHIP.** QA-1 should be patched in the first follow-up (it bricks the main quest, even if only for deliberate hoarders), and QA-3 is a cheap hardening win. Nothing found blocks shipping to real players.
