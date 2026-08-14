# Vintavia — Cycle 2: Mobile + Systems re-audit

Method: live `dist/index.html` (rebuilt deterministically from current src) in Playwright chromium
(`/opt/pw-browsers/chromium`). Mobile: 932×430, dpr 3, `isMobile:true, hasTouch:true`, iOS 17 UA, real
`touchscreen.tap`. Systems: direct `Game`/`Rules`/`Spellcraft` evaluates against the live page.
Harness: scratchpad `mobile_audit.js`, `systems_audit.js`, `systems_audit2.js`, `ff2.js`, `ko_launder.js`;
raw JSON `mobile_out.json` / `systems_out.json`. Screenshots: `test/shots/mobile2/`.

Repo suites (required):
- `node test/systems.test.js` → exit 0, tail: **`2777 passed, 0 failed`**
- `timeout 300 node test/e2e.test.js` → exit 0, tail: **`E2E: 66 passed, 0 failed`**

---

## Verification table — MOBILE (cycle-1 findings)

| # | Cycle-1 finding | Status | Evidence (live, cycle 2) |
|---|---|---|---|
| M1 | BLOCKER: inventory unreachable by touch | **FIXED** | Two touch paths now exist. DOM `Pack` pad present (`Game._pads[4].textContent==='Pack'`, taps it → `screen:'inventory'`). Tapping the *active* portrait opens that PC's pack (`tapRect` at 08_ui.js:95; tap at game (280,377) → `screen:'inventory'`, shot `04_inventory.png`). HUD also gained an on-canvas `Pack (I)` button (08_ui.js:101). |
| M2 | MAJOR: canvas tap targets below 44 CSS px | **FIXED (mitigated)** | Buttons grew (right panel 146×28, bottom row 66×36, chargen ± 28×22 game px) and `UI.tap` gained a 7 game-px fat-finger magnetize pass (08_ui.js:16-24). Verified live: taps 3 px outside the Quests button edge (left/right/top), 3 px below Menu, and the 4.2 px-out corner all trigger; 8 px out correctly does not. Strict CSS sizes are still <44 px (right panel ≈131×25 CSS), but the practical failure — dead taps at edges/gaps — is gone. Residual noted below (N-M1). |
| M3 | Attack/Use/Cast pads (test artifact, was fine) | **CONFIRMED GOOD** | Attack pad taps killed a spawned goblin in 5 taps; Use pad looted (`"Searched the goblin: 2 gold"`). |
| M4 | MINOR: font missing glyphs; "?" labels, `:`→`;` | **FIXED** | `bakeFont` EXTRA set now includes `— – ◄ ► − ✓ · × …` + fallback map (06_art.js:240,261). Chargen shows real `◄ ►` and `−` button labels, "Roderic — Knight", "Name: Roderic", "Gold: 202" (shots `03_chargen.png`, `04_inventory.png`, colon crop verified at 4x zoom — both dots render). |
| M5 | MINOR: pads ignore bottom safe-area | **FIXED** | Every pad's `style.bottom` is `calc(env(safe-area-inset-bottom, 0px) + N px)` (N=18/76/134/192; joystick 18) — read live off all 5 pads (09_game.js:103,114). |
| M6 | MINOR: pads visible on title/chargen/screens | **FIXED** | `padVisibility` gated on `state==='play' && !UI.screen` in the main loop (09_game.js:166-167). Live: all 5 pads `display:none` on title, `''` (visible) in play, `none` while the quest screen is open. |
| M7 | POLISH: no rotate hint in portrait | **FIXED** | 430×932 → "Turn your phone sideways ⟳" overlay `display:flex`; back to 932×430 → `none` (shot `02_portrait_hint.png`). Layout nit below (N-M2). |
| M8 | POLISH: debug overlay `--sat` bogus var; CLOSE <44px | **FIXED / PARTIAL** | Safe-area line now measures real `env()` paddings via a probe div (10_debug.js:55-58); reads `safe-area L/R/B: 0px / 0px / 0px` (correct — Playwright reports no insets), no `--sat` anywhere. CLOSE button is still ≈35 px tall (padding 8px, font 12px) — under the 44 px bar it should model. |
| M9 | POLISH: joystick nub center `+59` vs 61 | **NOT FIXED** | 09_game.js:111 still `r.left+59`; border-box is 122 px, center 61. Imperceptible 2 px dead-zone bias, unchanged. |

Thumb-only session (g): title `New Game` tap → chargen (point-buy taps worked: might 14→16, pool 14→10)
→ `Begin! ►` → play → joystick pads visible → Attack pad killed spawned goblin (5 taps) → Use pad looted
→ active-portrait tap opened inventory → gave dagger, tapped cell, tapped `Equip` (weapon slot updated) →
`Close` → `Pack` pad reopened inventory → `Close` → right-panel `Rest (R)` → `Rest 8 hours` → clock 08:06→16:06,
party 44/44 35/35 27/27 20/20. **Zero stuck points.**

## Verification table — SYSTEMS (cycle-1 findings)

| # | Cycle-1 finding | Status | Evidence (live, cycle 2) |
|---|---|---|---|
| S1 | HIGH: XP curve starved (~467/PC after camps+quests, L2=1000) | **MOSTLY FIXED — borderline** | Monster/quest xp roughly 2.1x'd (goblin 30→75, bandit 220, skeleton 250, boss 750; main1 500→800, side_goblins →500). Camps+both turn-ins now 977/PC vs 467 — but still **23 xp short of level 2** at the exact "both camps + turn-ins" milestone. Full numbers below. |
| S2 | HIGH: rest launders poison via overnight KO | **FIXED on the specified path; one variant remains** | `advanceMinutes` no longer converts sick PCs to unconscious ("sickness grinds hp to the floor but never converts", 09_game.js:777-781). Live: poisoned hp=5, `RNG.get('rest').state=1`, `doRest()` → **cond `poisoned`, hp 27/44** (=ceil(0.6·44), partial not full); `advanceMinutes(360)` ground hp to 0 with cond **still `poisoned`**; rest at 0 hp → still poisoned, 27/44; tavernRest same; diseased → still diseased, 22/44. Variant: see N-S1. |
| S3 | MEDIUM: sorcerer's Torch Light never castable | **FIXED** | `Spellcraft.starting('sorcerer')` is now `['fire_bolt','air_spark']`; `canCast` → `{ok:true}` for both on the fresh L1 sorcerer, and `Game.castFromBook` actually fired both (4 SP deducted total). All six classes' starting spells verified `ok`. |
| S4 | MEDIUM: spongy early mobs (bandit 11, skeleton 11-15 volleys) | **FIXED** | HP shaved (bandit 26→23, skeleton 24→20, wolf 16). Cycle-1 method (press+900 ms step, heal-only): goblin **3**, wolf **5**, bandit **9** (bar ≤9 ✓), skeleton **5** (bar ≤10 ✓). Optimal-recovery play: goblin 2, wolf 3, bandit 4, skeleton 4. |
| S5 | LOW: constant worldSeed, zero replay variance | **NOT FIXED** | `RNG.worldSeed:'vintavia-1'` (00_core.js:21) unchanged. Acknowledged design trade-off; unchanged. |
| S6 | LOW: `__game.give` skips quest checks | **FIXED** | `give()` now calls `Game.onQuestItemsChanged()` (10_debug.js:119). Also exercised the real path: boss corpse loot flipped main1 `active→done` immediately. |
| S7 | INFO: price params unvalidated; attackBonus dead conditional; buySpell no dup check | **FIXED / FIXED / NOT FIXED** | `buyItem`/`sellItem`/`buySpell` take no price parameter anymore — price is always recomputed from Rules (09_game.js:700-718). `Rules.damageRange` now correctly branches bow→accuracy / melee→might; `attackBonus` documented accuracy-only. `buySpell` still has no duplicate/class-school check (UI filters; console-only). |

## New-check results (task checklist)

| Check | Result |
|---|---|
| (d) `Game.buyItem('dagger', 1)` | Charged **23g** = `Rules.buyPrice(15, merchant 0)`; extra arg ignored. Sell side: gained 6g = `Rules.sellPrice`, extra arg ignored. **PASS** |
| (e) starter armor equipped at newGame | knight/paladin/cleric: `padded` equipped + weapon; custom party: archer `shortbow`+`padded` ✓. **PASS** for all four named classes. Sorcerer/druid: see N-S2. |
| (f) trainer `learnSkill` | knight+`axe`: −100g, skill 1 ✓; unknown `xyzzy`: refused, no gold moved ✓; illegal `fire` (knight): refused ✓; already-known `sword`: no-op, no charge ✓; 50g poor: refused, gold intact ✓. **PASS** |
| (g) volley bars | bandit 9 ≤ 9 ✓, skeleton 5 ≤ 10 ✓ (cycle-1 method). **PASS** |

## New findings (cycle 2)

### N-S1 — MEDIUM (exploit variant): combat KO still erases `poisoned`, so rest launders it
The poison-tick path is fixed, but `damagePc`'s KO branch (src/09_game.js:400) still does
`pc.cond='unconscious'` unconditionally, overwriting `poisoned`/`diseased`. Live repro: poisoned PC at
1 hp, goblin beats them down → cond `unconscious`; `doRest()` → **cond `ok`, 44/44 hp, free** (temple
charges 40g for this cure). A player can deliberately let a doorstep goblin KO a poisoned PC and rest it
off. Narrower than cycle-1's S2 (needs an actual monster hit, not just sleeping), but the same laundering.
- Fix direction: preserve the ailment on KO (e.g. `if(pc.cond==='ok') pc.cond='unconscious'` plus a
  separate downed flag, or store `pc.ailment` orthogonally to consciousness); `Rules.restResult` then
  keeps honoring it. Files: src/09_game.js:400, src/01_rules.js `restResult`.

### N-S2 — LOW/MEDIUM (content bug): sorcerer & druid start bare-handed — their starter weapon is silently discarded
`newGameFrom`'s starter table gives sorcerer `['dagger']` and druid `['club']` (src/09_game.js:43-44),
but `canEquip` requires the matching weapon skill and sorcerer's startSkills have `staff` (not `dagger`)
while druid's have `dagger` (not `mace`, which the club needs). The starter loop only equips on
`canEquip` and never falls back to the backpack, so the item vanishes: live fresh party shows sorcerer
`weapon:null, armor:null`, druid `weapon:null, armor:null` (all four armored classes fine). Mireth
punches goblins for 1 all through the early game, and neither class gets the padded armor the other four
get (sorcerer could legally wear it — leather skill, armor list includes leather-class).
- Fix: swap starter weapons to match skills (sorcerer `quarterstaff`, druid `dagger`) and add `padded`
  (or a robe) for both. File: src/09_game.js starter table vs src/01_rules.js CLASSES.startSkills.

### N-S3 — LOW (feel): a poisoned PC ground to 0 hp stays fully active
Side effect of the S2 fix: sickness now floors hp at 0 without KO, and the combat filter admits
`poisoned` PCs regardless of hp (src/09_game.js:499), so a 0-hp poisoned PC still swings a sword until
an enemy lands one hit. Flooring the grind at 1 hp (or KO-with-ailment per N-S1) would read better.

### N-M1 — LOW (residual): canvas buttons still visually below 44 CSS px
The magnetize pass fixes edge mis-taps, but at cssScale 0.896 the right-panel buttons are ~131×25 CSS
and chargen ± ~25×20 CSS; effective hit zones with the 7 game-px magnet reach ~38-45 px. Functionally
verified fine; strict Apple-HIG sizing still not met. Same class: debug overlay CLOSE ≈35 px tall (M8).

### N-M2 — POLISH: portrait-rotate hint lays out as a single flex row
The hint container is `display:flex` and its children (text node, `<br>`, span) become row flex items, so
"Turn your phone sideways ⟳" and the subtitle render side-by-side spanning the full 430 px width instead
of stacked (shot `02_portrait_hint.png`). Wrap the copy in one inner `<div>`. src/09_game.js:126-130.

## Perf numbers (932×430, dpr 3, renderScale pinned 1, 5 s each)

| Scenario | frameAvg | renderScale after | Bar |
|---|---|---|---|
| 6 goblins chasing, adjacent | **3.71 ms** | 1 | <16 ms ✓ |
| 23:30 night, town main street between both lamps (lightmap path) | **4.09 ms** | 1 | <16 ms ✓ |
| Inside dun1 (The Crypt) | **3.52 ms** | 1 | <16 ms ✓ |

(Host CPU, not an A16; ~4x headroom + the 0.5x adaptive fallback make on-device 60 fps very likely.)

## Pacing numbers (live, fresh party, real `killMonster`/quest paths)

- `Rules.xpForLevel(2)` = 1000, `(3)` = 3000. Quest/kill xp shared ÷4 (ceil).
- Goblin camp (5 goblin + warrior + shaman = 725 xp): **183/PC**.
- Bandit camp (3 bandit + 2 archer + captain = 2170 xp): **+469 → 652/PC**.
- `side_goblins` turn-in (500): +125. `main1` turn-in (800): +200 → **977/PC** after both camps + both
  turn-ins. Strictly camps + main1 only: **852/PC**.
- **Verdict: still level 1 at the stated milestone — 23 xp short of L2.** The 8 remaining road/doorstep
  goblins push it to 1129/PC → L2 (trainable, 25g), and any wolf adds 28/PC, so real sessions hit L2
  right around the bandit camp — but the letter of the target ("level 2-3 after both camps + main1")
  misses by a hair. One more nudge (main1 800→900+ xp, or goblin camp quest 500→600) closes it exactly.
- Volleys to kill (cycle-1 method / optimal): goblin 3/2, wolf 5/3, bandit 9/4, skeleton 5/4.

## Scores

- **Mobile: 9/10.** Every cycle-1 blocker/major is verifiably fixed; the full thumb-only session runs
  start-to-rest with zero stuck points; fat-finger magnetize works exactly as specced; pads are
  safe-area-aware and state-gated; perf has 4x headroom in the worst scenes. Held from 10 by the strict
  sub-44 px visual sizes (N-M1), the hint layout nit (N-M2), and the two unchanged polish items (M8 CLOSE,
  M9 nub bias).
- **Systems: 8/10.** Economy is now tamper-proof end-to-end (prices recomputed server-side), the
  documented poison-rest exploit is closed on both rest paths, starting spells and starter armor are
  honest, learnSkill is exact, mob sponginess is in-band, and both repo suites pass (2777 + 66). Held
  from higher by the surviving combat-KO laundering variant (N-S1), the 23-xp near-miss on the pacing
  target (S1 borderline), and sorcerer/druid starting bare-handed (N-S2).
