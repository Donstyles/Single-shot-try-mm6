# Vintavia — Cycle 1 Playtest Report

**Role:** playtest critic, full campaign attempt, human-path taps/presses via `__game.tap`/`press` (harness teleports used for travel only; every screen interaction via taps).
**Build:** `node build.js` at session start (200 KB, 12 modules). NOTE: a dev agent was committing to this repo *during* the playtest (commits `5ac7ed4`…`783feca`, e.g. "colon glyph", "starter armor equips"); late-run screenshots may show newer art than early ones. Both CRITICAL findings below were re-verified present in `src/` at HEAD after the run.
**Evidence:** screenshots in `test/shots/playtest/` (referenced by number below).

**Bottom line: the campaign is NOT completable by a real player.** I finished it, and got the victory screen (`82_VICTORY.png`), but only by using dev-harness calls to route around two hard blockers. Everything else — engine, save system, audio, art pipeline, victory flow — held up.

---

## CRITICAL

### C1. Entering the Crypt softlocks the game (black void, position = undefined)
The outdoor crypt portal is defined without a destination: `map.portals.push({x:84,y:40,kind:'enter',to:'dun1'})` (src/04_world.js:173 — no `tx/ty`). `Game.transition(to,tx,ty)` then sets `px=py=undefined`. The screen goes solid black with a floating target label; movement, map, and interact all dead. This is the door to the entire second half of the campaign.
- **Repro:** walk to (83.5,40.5), face the crypt gate, press Interact (or walk onto cell 84,40). Map switches to dun1, `Game.px/py` are `undefined`.
- **Evidence:** `54_dun1_entry.png` — black viewport, HUD alive, pos serialized as `{"ang":0}` (x/y dropped as undefined). Recovered only via `__game.teleport(2.5,2.5)`.
- Note: `test/e2e.test.js:184-185` enters the same way but wraps the wait in `.catch(()=>{})`, so the suite can't catch this. All dungeon→dungeon and dungeon→outdoor portals have `tx/ty` and work; only the campaign-critical entry is broken.

### C2. Half the quest givers are unreachable — main quest chain dead-ends at main2
Quest offer/accept/turn-in buttons exist **only** in `UI.dialogScreen`, and the only shop that routes to a dialog is the hall (`if(kind==='hall') return UI.dialogScreen('mayor')`, src/08_ui.js:460). The tavern, trainer, and temple open plain shop screens with **zero** quest UI:
- *Quiet Roads* (tavernkeep) — cannot be accepted or turned in. The free-rest perk is unobtainable.
- *Wolf Cull* (trainer) — cannot be accepted or turned in.
- ***Silver for the Temple* (priest) — cannot be accepted or turned in. Since `main3.requires=['main1','main2']`, the mayor never offers main3, so main4 and the victory screen are unreachable. Campaign over at ~30% completion.**
- **Repro:** enter tavern → hit-rect dump shows only Leave/rest/gossip/wares (logged: 8 rects, none quest-related; `13_tavern.png`, `41_trainer_no_turnin.png`). Compare mayor (`07_mayor_dialog.png`) where offers work perfectly.
- **Workaround used (filed per rules):** `__game.acceptQuest(...)` + `UI.open(UI.dialogScreen('tavernkeep'/'trainer'/'priest'))` then tapped the normally-drawn buttons (`23_tavernkeep_dialog_forced.png`, `42_trainer_dialog_forced.png`, `66_priest_turnin.png`). Once the dialog exists, the quest logic itself is flawless — states, rewards, perk, and gating all behaved correctly. This is purely missing wiring (e.g. an "Ask about work" button on shop screens).
- The e2e suite also sidesteps this (`Game.acceptQuest('main1')` directly at e2e.test.js:120), which is why it wasn't caught.

---

## MAJOR

### M1. Early difficulty is brutal and the finale is a pushover (inverted curve)
Measured with the recommended party (+2 might on the knight), longsword bought, bless up:
- **Goblin camp (first side quest):** 5 goblins + warrior + shaman all aggro together. Level-1 party **wiped** (all four down, temple respawn) even while completing the 5-kill count. (`22_goblin_camp_after.png`)
- **Bandit camp (FIRST main quest):** 6 enemies incl. 55hp captain hitting 2d6+2. First attempt: **full wipe in ~6 seconds of combat**. Only beatable at L1 by buying armor (176g), blessing, single-pulling from max aggro range, and free-tavern-rest cycling — and even then finished with 3/4 unconscious (`33_bandit_pull_fight.png`).
- **Catacombs:** 40hp skel_guards took 75+ seconds of continuous attacking each; the necromancer room caused repeated wipes at L1-2.
- **Lich (final boss, 160hp, AC16):** as a caster he tries to keep range but gets cornered in his own room; a blessed L2 party killed him in **~8 seconds of wall-clock melee**, taking almost no damage ("Aldric hits for 14, Roderic for 18…", `74_lich_fight.png`). The final boss is the easiest boss.
- Verdict: tune the first two camps down (stagger aggro, fewer simultaneous), give the Lich melee retaliation or summons.

### M2. Temple door is blocked by an NPC (interact priority bug)
Guard Petra stands at (32.5,38.6), ~1.2 cells from the temple door (33,40). `Game.interact()` checks NPCs (radius 2.2) *before* shops, so pressing Use anywhere in front of the temple opens Petra's dialog instead of the temple. The temple is only enterable from a ~0.3-cell sliver at the SE corner of the doorway. New players who just got poisoned/diseased in the crypt (I did — grave-rot on the knight) will conclude the temple is decorative.
- **Repro:** stand at (33.5,39.2) facing the temple door, press Space → Guard Petra dialog. Stand at (34.9,39.1) → temple opens.

### M3. Training/XP pacing: nobody can level for the entire outdoor game
L2 requires 1000 xp/pc. After main1 + both side quests + goblin camp + bandit camp + 3 direwolves + assorted wandering monsters, the party sat at **768/1000**. First level-up only became possible after fully clearing dungeon level 1 (1063 xp). Skill points are locked behind training, so the entire outdoor chapter is played with chargen skills. The "TRAIN!" hint fires long before it's true for anyone checking the trainer. Suggest ~600xp for L2 or bigger quest xp.

### M4. Rest economics remove all attrition pressure
Indoor rest has **no ambush chance and no cost** (`doRest` only rolls ambushes outdoors) — I rested 5+ times inside the crypt/catacombs, full heal each time, zero risk. Combined with the free-rest tavern perk, HP/SP attrition is meaningless anywhere. Wandering-monster rolls on dungeon rests would fix it. (Outdoor night ambush does work: wolves spawned in chase on my first wilderness rest, `83_night_ambush.png`.)

### M5. Continue silently rolls back to an older manual save
Title "Continue" always prefers the manual slot over a newer autosave (`Game.load(Game.hasSave('manual')?'manual':'auto')`). After dying (autosave at temple) or after any progress since the last manual save, Continue time-travels backwards with no indication. I lost a full catacombs clear + two quest turn-ins to this mid-run. Continue should load the newest slot, or the title should show both with timestamps (Load screen does this well already).

### M6. Guild sells spells the buyer can't cast — 600 gold mistake with no warning
The guild lists every unknown spell for the class, including Expert-tier. My sorcerer (Fire skill 1) bought **Fireball for ~600g** — castable only at Fire 4; `quickCast`/spellbook then just says "Requires Fire Magic Expert." That was 8 quest-rewards' worth of gold at that point. Grey out or annotate spells above the buyer's skill tier. (This was also the only moment quest gold genuinely couldn't cover purchases: 758g → 68g on two spells + potions. I never used `__game.gold`.)

---

## MINOR

1. **Missing font glyphs render as `?` everywhere:** `—`, `◄ ►`, `−` (chargen minus button is literally a `?`), `◆` in the quest log, title-screen dash. "The weapon smith is just ahead ? talk to folk" is the second line a new player reads. (`01_chargen.png`, `15_questlog_after_main1.png`; dev commits during my run mention glyph fixes, so partially known.)
2. **Corpse loot intercepts everything:** `interact()` checks corpses (radius 1.8) before chests/NPCs/doors. Standing at the censer chest with a zombie corpse nearby loots the corpse repeatedly; the chest is unreachable until every corpse is cleaned out. Same issue near shop doors after a town-edge fight.
3. **Stairs trigger instantly mid-combat:** chasing/retreating across an `S` cell mid-fight silently teleported the party between dungeon levels (monsters don't follow). Easy to do by accident in the dun2 SE corner room where the stairs share the necromancer's corridor. A confirm prompt (or edge-triggered like the crypt gate) would fix it.
4. **Door open-states aren't saved:** `Game.flags.doors` is serialized but never written; `map.doors[k].open` lives on the rebuilt World, so every door re-closes on load (code-observed).
5. **Trainer skill list caps at 8 rows** (`if(n++>7) break`) — later-acquired skills can never be raised; no scrolling.
6. **Shop sell grid only shows the *active* PC's pack** with no PC selector on weapon/armor shops — sold loot has to be shuffled to the active character first. Label says "the active hero's pack" only when empty.
7. **Chargen point-buy is opaque:** raising a stat ≥17 silently costs 2 points; nothing displays the cost. The `+` simply stops working from the player's perspective.
8. **Fang drops only exist while Wolf Cull is active** — wolves killed before (unreachable) acceptance drop nothing; combined with C2 a player would have to re-kill 3 of the 4 direwolves that exist. There is no respawn, so killing 2+ direwolves before accepting would make Wolf Cull *uncompletable*.
9. **Victory screen Esc:** pressing Esc on the victory screen closes it (menu toggle) — fine, but "Play on" then can't be re-read; stats are gone forever. Consider archiving to quest log.

## POLISH

- Crypt (dun1) walls are flat monochrome grey — depth is hard to read (`56_dun1_first_fight.png`); the Vault's green/marble look is much better (`74_lich_fight.png`). (Dev commits during my run add wall grain/glow — heading the right way.)
- Log lines clip at 44 chars mid-word ("Someone is ready to train (Training Hal").
- Bank has no reason to exist (death tithe is only 10%, no theft mechanic communicated).
- Shop signs in the 3D view are blank boards; you learn what a building is only by entering. Gate signposts, by contrast, are excellent.
- "Recommended" button silently wipes all four customized drafts with no confirm.

---

## Audio spot-check — PASS
After a synthetic keydown: `Audio2.started=true`, ctx `running`. `setTrack` + a forced `_writeBar` for **title / town / wild / dungeon / combat / victory** each ran with **zero exceptions** (100ms steps between). SFX (`hit`, `quest`, `levelup`) fine. Music director also switched contextually in play (town→wild→combat observed via `Game.update`). No CRITICAL audio issues.

## Save/load verification — PASS (with M5 caveat)
- Menu Save → Load screen → load manual: position/quests/perks restored exactly (twice mid-run).
- Full page reload → Continue: resumed at identical coordinates with all 6 quests in `turned` state and `victoryShown` persisted (`86_resumed.png`).
- Deliberate deaths (goblin camp, bandit camp): temple respawn at 1hp, 10% gold tithe, log confirms "(Autosaved. Your manual save is untouched.)" — manual slot verified byte-identical before/after.

## Turn-based mode — WORKS
Toggled via HUD button and T in a catacombs fight (`60_turnbased_fight.png`). Time freezes until you act; attacking grants a 620ms budget; camera still turns; "— your move —" indicator shows. Playable and actually the sanest way to fight skel_guards. Quirk: movement keys grant only 260ms, so repositioning is a slow pulse-walk.

---

## Beat-by-beat campaign log (wall-clock of my run; "human-min" = estimated real-player time incl. retries)

| # | Beat | Result | Human-min |
|---|------|--------|-----------|
| 1 | Title → chargen (tweak might 14→16, luck −1, portrait cycle) → Begin, Day 1 08:00 | ✓ smooth, glyph `?`s | 10 |
| 2 | Read spawn, mayor (main1 accepted via taps), guard+baker rumors, longsword 135g, equip | ✓ (`03_spawn`,`08_mayor_offer`) | 10 |
| 3 | Tavern/trainer quests | ✗ **impossible via UI (C2)** — harness accept | — |
| 4 | Goblin camp west | quest done but **party wiped**; turn-in forced-dialog; free rest verified 0g | 20 |
| 5 | Bandit camp NE | wipe #1 in 6s; retry w/ armor+bless+pulls; captain dead, ledger looted, main1 turned (+300g/+125xp); quest log states correct before/after | 30 |
| 6 | Direwolves north | 3 fangs, forced trainer turn-in (+250g/+100xp); **nobody can train (768/1000)** | 15 |
| 7 | Guild/potions | Fireball trap purchase (M6) | 5 |
| 8 | Crypt entry | **softlock (C1)**, harness recovery; dun1 cleared (5 engagements, 2 hit my 60s cap), censer got, disease picked up | 35 |
| 9 | Catacombs | TB-mode fight ✓; skel_guard slog; several wipes around necromancer at L1; sigil off corpse | 45 |
| 10 | Town: temple heal (found M2), main2 turned (forced), main3 accept→turn (+800g), main4 accept, trained 2×L2 | ✓ | 10 |
| 11 | Vault: sigil door correctly refuses w/o sigil then opens with it; Lich dead in ~8s; crown chest; exit teleporter → outdoor | ✓ (`73_sigil_door`,`75_crown_chest`) | 12 |
| 12 | Final turn-in → **VICTORY screen** (Day 6, 11:25, 48 kills, 4540g earned), Play on, reload persists | ✓ (`82_VICTORY.png`) | 5 |

**Pacing verdict:** ~2.5–3.5 hours for a human *if* the chain were completable. Shape is wrong: a wall at minutes 15–60 (two overtuned camps + no leveling), a long flat grind in the catacombs, then a finale that folds instantly. The delight moments are real — the first sunrise over the town, the sigil-door flare, the victory parchment with your party's names — but the two CRITICALs mean no player will ever see them.

**State mutations used (full disclosure):** teleports for travel; `Game.mapId` set for cross-map travel after C1; `UI.open(UI.dialogScreen(...))`+taps and `__game.acceptQuest` to route around C2; mid-fight map restore when stairs yanked the party (Minor 3); one recovery teleport after C1. No gold grants, no stat/HP edits, no direct quest-state writes.
