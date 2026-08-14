# Vintavia — Shipping Panel 2: Technical QA

**Verdict: NO-SHIP** (one critical progression-item destruction bug; everything else is remarkably solid)
**Score: 7/10**

Tested artifact: `dist/index.html` as shipped (244,770 bytes, no rebuild), served over HTTP, driven with
Playwright Chromium (`/opt/pw-browsers/chromium`) through the shipped `window.__game` / `window.__session`
harness. Every scenario below ran against the live page; `pageerror` and `console.error` were captured on
every page instance. **Total page errors across the entire sweep: 0.**

---

## Defects

### DEFECT-1 (CRITICAL, ship-blocker): Vault Sigil permanently destroyed on corpse-loot overflow → game unwinnable

`Game.lootCorpse` guards quest items by counting only the *quest* items on the corpse against free pack
slots, but then distributes the corpse's items in order with the regular loot drop **first** and the quest
item **last**. When the corpse holds `[regular item, quest item]` and the party has exactly 1 free slot
(generally: fewer free slots than total items, but at least as many as quest items), the guard passes, the
regular item consumes the free slot, the quest item fails `giveItem`, and the corpse is still flagged
`looted=true`. Looted corpses are uninteractable and are filtered out of saves. The necromancer is a
one-shot boss; his corpse is the only source of `q_sigil`, which gates the sigil door into dun3 and quest
`main3`. Result: **hard softlock, campaign unwinnable, and the autosave immediately bakes it in.**

Repro (observed organically in this sweep — the tier-3 loot roll produced a Bastard Sword alongside the sigil):

1. New game; fill every pack slot on all four PCs except **one**.
2. In dun2, kill the necromancer (corpse items: `["bastard","q_sigil"]`).
3. Press Use on the corpse.
4. Log prints `Searched the necromancer: 30 gold, Bastard Sword (pack full: Vault Sigil left)`.
5. `corpse.looted === true`; re-interacting hits the chest behind it instead; freeing 10 slots and
   re-interacting recovers nothing; the save contains zero corpses and a dead necromancer.
   `partyHasItem('q_sigil') === false`, forever.

Aggravators:
- The message *"Vault Sigil left"* tells the player the item remains — it does not. The UI actively lies
  about a destroyed progression item.
- The same code path serves `q_ledger` (unique bandit-boss drop for its side quest), which soft-locks that
  quest the same way.
- The censer **chest** path has the correct style of guard (demands 2 free slots up front and refuses:
  verified `"Your packs are stuffed — make room before opening this."`, chest flag not consumed, censer
  obtainable after making room — PASS). The corpse path just got the arithmetic wrong.

Fix is one line of intent: refuse when `free < c.items.length`, or hand out quest items first, or don't set
`looted` until every quest item landed. Any of the three passes the panel bar ("refusal or preserved corpse
both acceptable").

### DEFECT-2 (minor): RNG stream states serialize as signed *or* unsigned 32-bit ints

`RNG.serialize()` stores `stream.state` raw; `next()` leaves it signed (`|0`) while `restore()` normalizes
`>>>0`. A save made mid-combat can contain `"combat": -1325059649` while the post-load re-serialize yields
`2969907647`. Verified congruent mod 2^32 (`(-1325059649>>>0) === 2969907647`) and mulberry32 re-signs on
first use, so behavior is identical — but consecutive saves of identical state are not byte-identical, which
weakens any future save-integrity checking. Normalize with `>>>0` in `serialize()`.

### DEFECT-3 (minor): `pc.painT` (wall-clock `performance.now()` wince timestamp) is serialized into saves

Render-only field written on damage (`09_game.js:414`), read only by the portrait wince (`08_ui.js:79`), yet
it rides inside `party.pcs[*]` into every save. It is the *only* field that broke the two-fresh-pages
determinism diff. Cosmetic; strip it in `serialize()`.

### NOTE (accepted): in-flight projectiles are not serialized — they vanish on save/load. Transient, invisible in practice.

---

## Test results by area

### 1. Save/load under hostile conditions — PASS (with DEFECT-2 noted)
Mid-combat outdoor (2 chasers, attack issued), each dungeon mid-combat (dun1/dun2/dun3), and a
dead+dead+poisoned+poisoned party: manual save → **full page reload → Continue button tap** → deep JSON diff
of the saved payload vs. post-load `serialize()` (ts/meta excluded). dun2/dun3 byte-clean; the only diffs
anywhere were the DEFECT-2 signed/unsigned RNG representations (functionally identical). Conditions and HP
(`dead:0, dead:0, poisoned:5, poisoned:3`) survived the reload exactly.

Defeat in each dungeon (all three): party wiped → woke at temple (`outdoor` temple point), all PCs alive at
1 hp, **tithe exactly 10%** (1000→900 each time; 0 gold → 0 tithe, no negative gold), autosave updated to the
temple wake, and the **manual slot's raw localStorage string was byte-identical before/after** in all three
dungeons. The log honestly states "(Autosaved. Your manual save is untouched.)".

### 2. Progression-item safety — FAIL (DEFECT-1)
Censer chest with 0 free slots: refused, chest not consumed, censer obtained after making room — PASS.
Necromancer corpse with 0 free slots: refused ("You cannot carry everything here — make room first."),
corpse preserved — PASS. Necromancer corpse with 1 free slot and a regular loot drop: **Vault Sigil
destroyed, unrecoverable** — CRITICAL FAIL (full repro above).

### 3. Edge cases — PASS
- Every purchase path at 0 gold (`buyItem`, `buySpell`, `tavernRest`, `templeHeal` on a wounded PC,
  `templeDonate`, `trainPc` with trainable XP, `learnSkill`, bank deposit/withdraw on empty): all refuse
  politely, gold stays exactly 0, no state mutation, no exceptions.
- Train at 999/1000/1001 xp (L1→L2 needs 1000): 999 refused; 1000 and 1001 both train to L2, +5 skill
  points. Boundary exact.
- Sigil door (dun3 @13,2): without sigil — stays closed, "A sigil-shaped hollow glows." With sigil — opens,
  "The Vault Sigil flares — the seal breaks!"
- Rest while chased: refused, no rest screen opens.
- Stairs while chased: walk-on defers with "Press Use to take the stairs — the fight rages on!" (stays in
  dun1); deliberate Use transitions correctly (fade completes, lands outdoor).
- Raise Dead with nobody dead / Cure Poison with nobody afflicted: both return false, "No one needs that.",
  **zero SP consumed** (SP is deducted only after target validation).
- Full spell sweep with maxed casters (skill 10, all schools): the shipped build contains **27 spells**, not
  33 — all 27 cast cleanly with correct SP costs, valid targets resolved, projectiles landed, zero
  exceptions. (Restoration verified to fully restore a wounded poisoned ally: hp→max, cond→ok, sp→max.)

### 4. Item conservation fuzz — PASS
300 randomized operations (40 equips, 31 unequips, 53 inter-PC gives + 1 correctly-refused give into a full
pack, 57 sells; mid-run top-ups folded into the baseline), mimicking the UI's Give button code path exactly.
Per-item-id census across all packs + all equip slots: **after + sold == before + added for every id, zero
violations, zero exceptions.** No dupes, no vanishes.

### 5. Turn-based sustained fight — PASS
Skeleton Guard (40 hp, ac 13) vs. L6 melee party, TB toggled on once and never touched again; 20 attack
orders issued with real 1.8 s gaps. Fight progressed every effective round (40→22→22→4→0), **kill on order
5**, corpse spawned, XP shared. TB still on afterwards; movement and further attack input fully responsive
(input never swallowed). One order = one round budget (~1780 ms) observed each time.

### 6. Storage abuse — PASS
- `Storage.prototype.setItem` throwing QuotaExceededError: manual save returns false with "Could not save
  (storage blocked)"; transition-autosave and rest-autosave both swallow it; play continues. 0 pageerrors.
- Corrupted JSON (`{{{not json`), `v:1` save, `v:3` with `party:null`, `v:3` with `mapId:'nope'`: direct
  load returns false with the appropriate polite message; after a full reload the title screen never
  crash-loops, the Continue tap on a bad-only slot does nothing harmful, and a fresh New Game starts
  cleanly in every case. 0 pageerrors across all five hostile-storage pages.

### 7. Eight-minute soak — PASS
462 s, 399 cycles rotating across outdoor/dun1/dun2/dun3, each cycle spawning and genuinely fighting a
monster (melee + Fire Bolt), wandering, and opening/closing a UI screen (~400 monsters spawned/killed, ~390
corpses accumulated by the end):

| metric | first | last | max |
|---|---|---|---|
| JS heap (MB) | 9.2 | 8.6 | 13.5 |
| frameAvg (ms) | 3.98 | 3.30 | 3.98 |

No heap drift (GC saw-tooth between 7.5–13.5 MB, ends *below* start), frame time flat at ~3 ms even with
186 live monsters on the roster, renderScale never degraded from 1, log ring correctly capped at 60 lines,
**0 pageerrors**.

### 8. Determinism — PASS
Identical scripted action sequences (new game → dungeon walk → 8 attack rounds vs. a spawned skeleton →
spell cast → chest open → rest gamble) on two fresh pages produced **byte-identical full state dumps** —
gold 222/222, clock 667/667, all monster positions, loot, RNG streams — except the single cosmetic
`painT` wall-clock field (DEFECT-3). All gameplay-relevant state is fully deterministic; the seeded rest
ambush landed identically on both pages.

### 9. `?debug` overlay — PASS
Overlay renders on `?debug`. Report verified honest against live values: game state/map line matches
`Game.state`/`Game.mapId`, renderScale matches `Engine.renderScale`, frameAvg is a real measured number,
renderer honestly disclosed as "software raycaster (no WebGL/shaders)", `storage: ok` flips to
`storage: BLOCKED: QuotaExceededError` when setItem actually throws, `errors: none` flips to listing an
injected error. **COPY REPORT works**: clipboard receives the full report and the pane confirms
"(copied to clipboard)".

---

## Scoring rationale

Eight of nine areas pass at a level that is genuinely rare for a single-file game: zero exceptions under
every hostile condition tried, byte-identical manual saves through defeat, clean item conservation under
fuzz, flat 8-minute soak, honest diagnostics. But the panel's own bar — "quest items must NOT be destroyed"
— is failed on a reachable path that permanently unwinds the campaign and lies to the player while doing it,
and the autosave cements the loss. That is a NO-SHIP by definition, scored 7/10 for the outstanding quality
of everything around it. Fix DEFECT-1 (one guard), ideally normalize DEFECT-2/3 in the same pass, and this
ships.
