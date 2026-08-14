# Vintavia — Systems & Economy Critique, Cycle 1

Method: every check below was run against the LIVE game (`dist/index.html` in headless Chromium via Playwright,
`__game.newGame({skipChargen:true})`, state read through `window.__session` and direct `Game`/`Rules` evaluates).
Not the unit tests. Harness scripts: scratchpad `audit.js` / `audit2.js`; raw JSON in `audit-out.json` / `audit2-out.json`.

Verdict up front: the ledger is honest — every gold movement I could produce matches `Rules` to the coin, refusals
never leak money, save/load round-trips byte-perfect, and the rest-ambush RNG stream cannot be re-rolled by screen
fiddling. The two real problems are progression pacing (the XP curve is starved ~2x) and a condition-laundering
exploit in rest (getting KO'd by poison overnight cures you for free).

---

## Findings

### S1 — HIGH (pacing): XP curve is starved — a full clear of the entire overworld still leaves the party level 1
- **Description:** `Rules.xpForLevel(2)` = 1000 per PC. Measured supply in the live world (xp shared /4, ceil):
  - Goblin camp (7 mobs, `group=gobcamp`): 75/PC. + `side_goblins` quest: 75/PC → **150/PC**.
  - Bandit camp (3 bandit + 2 bandit_bow + boss = 760 xp): 192/PC. + `main1`: 125/PC.
  - **Goblin camp + bandit camp + both quests = 467/PC — less than half a level.**
  - Clearing **every monster on the outdoor map** (34 mobs incl. 4 direwolves, 3 apprentices) plus all three
    overworld quests = **925/PC. Still level 1.** The first training only becomes possible partway into dun1.
  - Whole-game supply: mobs 625+239+476+555 = 1895/PC + all quests 2100/PC ≈ **3995/PC → the party finishes the
    Lich fight at level 3** (L4 needs 6000). The trainer's 5-skill-points-per-level system effectively never engages
    (~10-15 points across the whole campaign), and the "Someone is ready to train" nudge in `killMonster` can't fire
    for the entire first hour.
- **Repro:** `__game.newGame({skipChargen:true})`; sum `Monsters.def(m.mid).xp` over `World.maps.outdoor.monsters`,
  share via `Rules.xpShare`; compare `Rules.xpForLevel(2)`.
- **Fix direction:** either halve the curve (`lv*(lv-1)*250`) or ~2.5x monster/quest xp. Target: first level-up
  around finishing the goblin camp + first quest turn-in (~20-30 min), L3-4 entering dun2, L6-8 for the Lich.
- **Suspected file:** src/01_rules.js (`xpForLevel`) vs src/03_items.js (MONSTERS xp column) and src/04_world.js (QUESTS xp).

### S2 — HIGH (exploit): rest launders poison/disease into a free full heal if the ticks KO you
- **Description:** `doRest`/`tavernRest` call `advanceMinutes(480)` FIRST. Poison ticks during the night can drop
  hp to 0, which converts `cond:'poisoned'` → `'unconscious'`. `Rules.restResult` then sees an unconscious PC
  (neither dead nor poisoned/diseased), returns `{cond:'ok', hp:max}` — poison AND disease cured, full hp, zero cost.
  Meanwhile a poisoned PC healthy enough to survive the night keeps the condition and wakes at 60% hp. Nearly dying
  overnight is strictly better than surviving. Live results:
  - poisoned, full hp, doRest → still `poisoned`, 36/44 (correct)
  - poisoned, hp=4, doRest → **`ok`, 44/44** (cured free; temple charges 40g for this)
  - diseased, hp=4, doRest → **`ok`, 44/44** (temple charges 40g)
  - poisoned, hp=4, tavernRest → **`ok`, 44/44** (same hole via the paid path, undercutting the temple)
- **Repro:** `pc.cond='poisoned'; pc.hp=4; RNG.get('rest').state=1; Game.doRest();` — cond is `'ok'`, hp full.
- **Fix direction:** carry the pre-KO condition through: in `advanceMinutes` keep a `pc.condBeforeKO`, or in
  doRest/tavernRest snapshot conds before advancing time, or make `restResult` treat `unconscious` as "restore hp
  but keep the stored ailment".
- **Suspected file:** src/09_game.js (`advanceMinutes` KO branch, `doRest`, `tavernRest`); src/01_rules.js (`restResult` has no unconscious case).

### S3 — MEDIUM (content bug): fresh Sorcerer starts with Torch Light but can never cast it
- **Description:** `Spellcraft.starting('sorcerer')` grants `light_torch` (school `light`, req 1) but the sorcerer's
  `startSkills` are `['fire','staff','air','leather']` — no `light` skill. Live cast attempt with full SP fails with
  "Requires Light Magic Novice". It sits dead in the spellbook from minute one; a new player's first light spell is a
  lie. (It does fail cleanly — no SP lost.) All other classes' starting spells verified castable.
- **Repro:** fresh party; `Game.castFromBook(3,'light_torch')` → false, `Spellcraft.canCast` → "Requires Light Magic Novice".
- **Fix direction:** give sorcerer `light:1` as a start skill, or swap the starting spell to an air/fire utility.
- **Suspected file:** src/02_spells.js (`Spellcraft.starting`) vs src/01_rules.js (CLASSES.sorcerer.startSkills).

### S4 — MEDIUM (pacing): early melee mobs are spongy at the top end; wolf outlasts its tier
- **Numbers** (fresh party, mob spawned adjacent, loop `press('attack')` + `step(900)`, party healed each round;
  deterministic on a fresh seed, ranges from stream-advanced runs):
  | Monster | hp | Volleys to kill (fresh seed / observed range) | Target |
  |---|---|---|---|
  | Goblin | 12 | **1** (1-3) | 1-4 ✓ |
  | Wolf | 16 | **9** (5-9) | (tier-0) — outlasts the 26hp bandit's band |
  | Bandit | 26 | **11** (9-11) | 4-10 ✗ (just over) |
  | Skeleton | 24 | **11** (11-15) | — |
  Note: with 900ms presses vs ~1500-1700ms weapon recovery only about half the party swings per press, so real-time
  optimal play is ~40% faster — bandit lands in-band for a player who spams attack, but the AC-10 skeleton (and AC-7
  fast-moving wolf) still feel like walls for four level-1 melee swings at ~35-50% hit chance. Blunt-vs-undead or a
  small AC shave on wolf/skeleton would fix the feel.
- **Monster threat (must be >5):** fresh party standing beside a chasing goblin, `step(1000)` rounds until first PC
  falls: **87 rounds** (sorcerer Mireth falls first; party at 25/44, 20/35, 22/27, 0/20). Safely above the bar —
  arguably a lone goblin is nearly harmless, which is fine for the doorstep mob.
- **Suspected file:** src/03_items.js (MONSTERS hp/ac), src/01_rules.js (`hitChance`).

### S5 — LOW (determinism/design): every new game plays out identically
- **Description:** `RNG.worldSeed` is the constant `'vintavia-1'` and `newGameFrom` calls `RNG.reset()`, so the
  combat/loot/rest streams replay identically each run: the first goblin always dies in exactly 1 volley, the first
  20 goblin corpses always drop the same 141 gold. Great for tests, but replays have zero variance and a
  determined player can script the "lucky" line. Consider mixing a timestamp into `worldSeed` for real games
  (keeping layout on `RNG.world`, which is documented as fixed).
- **Suspected file:** src/00_core.js (RNG.worldSeed), src/09_game.js (`newGameFrom`).

### S6 — LOW (harness gap): `__game.give()` doesn't trigger quest completion checks
- **Description:** `Game.giveItem` doesn't call `onQuestItemsChanged`; the hook lives in the callers (lootCorpse,
  buyItem, chest). All real gameplay paths are covered — verified — but the debug/judge path
  `__game.give('q_ledger')` leaves `main1` stuck at `active` until the next loot/buy event. A judge following the
  documented harness will think fetch quests are broken.
- **Repro:** `Game.acceptQuest('main1'); __game.give('q_ledger');` → state still `active`; `Game.onQuestItemsChanged()` → `done`.
- **Suspected file:** src/10_debug.js (`__game.give` should call `Game.onQuestItemsChanged()`), or move the hook into `giveItem`.

### S7 — INFO (hardening notes, no live exploit found)
- `Game.buyItem/sellItem/buySpell` accept the price as a parameter (UI computes it from Rules — verified identical —
  but the Game layer never re-validates; a console user can sell bread for 1M). Within the project's "glue never
  re-derives" policy, but a one-line clamp against `Rules.*Price` would be cheap insurance. src/09_game.js.
- `Game.trainPc` sets hp/sp to full — a 25g level-up doubles as a full heal (cheaper than the temple at low levels).
  Intentional-looking, gated by xp, minor.
- `Game.buySpell` doesn't check duplicates/class school (UI filters both; direct double-call taught `fire_bolt` twice).
- `Rules.attackBonus` line 89: `weapon.skill==='bow' ? pc.stats.accuracy : pc.stats.accuracy` — both branches
  identical; dead conditional, likely meant might for melee. src/01_rules.js.

---

## What passed (all live, all exact)

- **Shop math:** displayed weapon-shop prices (captured off the actual draw calls) = `Rules.buyPrice` for all 12
  wares. Buy/sell at merchant 0/1/4/7 (longsword 135/113/99/90 buy; 36/50/63/77 sell): gold moved exactly, item
  landed in/left the pack every time. Buy with exact gold → gold 0, item granted. Insufficient gold → refused, gold
  untouched. Packs full → refused, gold untouched. Double-sell same slot → second sale no-ops. Buy@1.5x/sell@0.4x
  (0.85 at master) leaves no arbitrage.
- **Temple:** poisoned L1 heal costs exactly 40 (=10+5+25), dead 135 (=10+5+100+20); full hp/sp restore + cure;
  refusal with 3g changes nothing.
- **Bank:** deposit/withdraw round-trip exact, overdraft both directions clamps, never negative, gold+bank conserved
  at 500 through every operation. No interest, no printing.
- **Training:** refused at 0 xp and at 0 gold with no side effects; with 5000 xp: cost 25g exactly, level 2, +5 skill
  points, maxHP gains match the class table (knight +9 = 7 hpLv + 2 end-mod; paladin +7; cleric +5; sorcerer +3);
  chain-training stops correctly at L3 (5000 < 6000 for L4).
- **Rest:** clean rest passes exactly 480 min, full hp/sp; ambush branch passes 240 min, spawns exactly 2 chasing
  wolves, no healing; poison persists through rest at healthy hp (see S2 for the KO hole). Opening/closing the rest
  screen 5x + world steps leave `RNG.get('rest').state` bit-identical (12345 → 12345); the stream advances only when
  `doRest` actually fires; indoor rest consumes no ambush roll; stream state rides in the save, so save-scumming
  can't reroll the ambush.
- **Quests:** `main1` turn-in pays exactly 300g + 125 xp each (ceil(500/4)), removes the ledger, flips to `turned`,
  and a second turn-in pays nothing.
- **Loot (20 goblins, live kill path):** gold/kill avg 7.05 (theory 7.0, range 2-11), item rate 25% (theory 30%,
  n=20), zero null/off-tier items (potions, dagger, boots — all tier 0).
- **Spells:** every castable starting spell for cleric/sorcerer/paladin deducts exactly its listed SP
  (body_heal 3, spirit_bless 3, fire_bolt 2); at cost-1 SP every cast refuses cleanly with zero SP lost, never negative.
- **Save integrity:** save → mutate gold/bank/clock/levels/packs/quests → load: deep-compare of party/gold/quests/
  clock/packs is byte-identical. Autosave afterwards leaves the manual slot's localStorage bytes untouched
  (and writes gold 42 to `vintavia_auto`). Defeat: exactly 10% tithe (1000→900), party revived at 1hp at the temple,
  manual slot untouched.

## Pacing summary (numbers)

- Volleys to kill: goblin 1 (1-3), wolf 9 (5-9), bandit 11 (9-11), skeleton 11 (11-15).
- Rounds beside a goblin before first PC falls: 87.
- Per-PC xp: goblin camp+quest 150, + bandit camp+main1 = 467; full overworld clear + 3 quests = 925; L2 needs 1000.
- First 30 minutes: 0 level-ups possible. Whole campaign: ~L3.
