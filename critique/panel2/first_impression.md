# Panel 2 — First Impression / Target Device Judge
**Device:** iPhone 14 Pro Max, landscape (932x430 CSS, DPR 3, touch only — thumbs, no keyboard)
**Build:** dist/index.html as shipped (no rebuild). Driven via Playwright touch events only; `window.__session` read-only for verification.
**Screenshots:** test/shots/panel2_mobile/01–27

## VERDICT: SHIP — 7.5/10

A complete, legible, thumb-first MM6 homage that boots to fun in under a minute, survives a party wipe gracefully, and resumes perfectly after a reload. The two real scars of the first 20 minutes are a difficulty cliff at the very first quest objective (the party was wiped by the *first sentry* the mayor sends you at) and dead-stop tree collision that repeatedly wedges the joystick walker in the forest. Neither breaks the session — death respawns you at the temple with an autosave and an apology — so this ships, with those two called out for the next patch.

---

## Minute-by-minute diary

- **0:00 — Boot/title (shot 01).** Instant load, no spinner. Sunset castle, "VINTAVIA", clear New Game / Sound buttons, honest fan-tribute disclaimer. 4:3 canvas pillarboxed in landscape; bars look intentional, not broken. 30-second comprehension: passed in ~5.
- **0:30 — Chargen (shots 02–03).** "Create Your Party", 4 hero tabs, class list, point-buy attributes with +/- buttons, live class info (HP/lv, weapons, magic, starting skills). With thumbs I changed Knight→Archer, bumped two stats, and renamed by tapping the Name button — it **cycles preset names instead of demanding a keyboard**. Smart mobile design. All taps landed first try.
- **1:30 — Begin → spawn (shot 04).** HUD reads instantly: viewport, right-hand menu (Quests/Spells/Map/Rest/Real-Time/Menu), 4 portraits with HP/SP slivers, color log. DOM joystick bottom-left and Pack/Cast/Use/Attack pads bottom-right fill the pillarbox bars — the landscape dead space is *used*. Opening log literally teaches the touch verb: "walk up and tap Use to talk."
- **2:00 — Controls cold (shot 05).** Joystick: y=forward, x=strafe, responsive, nub animates. Look-drag on viewport: ~90° per half-screen swipe — predictable, comfortable sensitivity, no accidental fires.
- **2:30 — Weapon smith (shots 06–07).** Walked into the smith's door, tapped Use → shop. "Wares — tap to inspect, tap again to buy" — tap-first affordance text. Talk → dialogue portrait screen. Leave/Close in the same corner every time.
- **4:00 — Map (shot 08).** One tap. Town plan with lettered buildings, legend, red you-dot, north arrow. Legend text is small at arm's length but decodable.
- **5:00 — Walk the town (shots 09–10).** Walked the main road east past the tavern sign; town wall, torches, an NPC wandering. Clock advances as you travel (8:00→10:35). Collision on building faces is a dead stop but streets are wide so it never annoyed here.
- **6:30 — Mayor, quest (shots 11–12).** Hall door → Mayor Aldous → "The Stolen Ledger — hear them out" → briefing *with tactical advice* ("pick the sentries off one by one — rush the campfire and they will bury you") → green "Accept the task". Quest logged. Whole chain is 4 taps.
- **8:00 — Out the east gate (shot 13).** Road leads out of town; wilderness with forest, coastline, signposts.
- **8:30 — First melee (shots 14–15).** A goblin was already chasing me. Turned via drag — big readable sprite, "Goblin 12/12" nameplate on top. **Tapping the Attack pad swings the whole party** — goblin dead in two taps. **Tapping the corpse looted it** ("Searched the goblin: 2 gold"). Both thumb paths work; log color-codes damage red / kills+loot green. Serena's portrait winced when hit. Melee flow with thumbs: excellent.
- **10:00 — March on the bandit camp (shots 16–18).** The forest between road and camp is where control feel degrades: I stopped dead on a tree trunk, strafed, stopped on another, and at one point was *wedged* — forward and strafe both produced zero movement until I backed out and re-angled. No collision slide. With a joystick this reads as "the game ate my input."
- **11:30 — The fight (shot 19).** Engaged one bandit sentry as instructed. It has 23 HP, hits 2–7, and attacks fast; my rapid Attack-pad taps are rate-limited per hero (fair), so the exchange ran long. Bren fell, Mireth fell, then Aldric — **party wipe to the first sentry of the first quest, ~minute 13.** Recovery is genuinely graceful: "You wake at the temple, weak but alive. The Light kept a tithe of 20 gold. (Autosaved. Your manual save is untouched.)" HP 1s, minus 20 gold, back in town, quest intact. Also got a helpful toast when I tapped Attack with nothing in reach: "No foe in reach — face your enemy."
- **14:00 — Rest (shot 20).** Rest (R) → "Make Camp" → Rest 8 hours → full HP, clock jumps to 23:11. Flavor warnings about night beasts and disease. One tap to full recovery.
- **15:00 — Pack, equip, give (shots 21–24).** Portrait tap opens that hero's sheet (paper doll, skills, stats, backpack grid, "tap worn gear to unequip" hint). Selected Traveler Bread → Use / **Give ► Aldric** / Drop buttons — gave it, "Handed over." Unequipped the bow by tapping the Wpn slot, re-equipped from the pack via the Equip button. Pack pad also opens the sheet. All pure taps, zero drag-and-drop required — the right call for touch.
- **17:00 — Night town (shot 25).** Stars, glowing lamp posts, NPCs still about, fountain. Genuinely atmospheric. frameAvg 2.8 ms at renderScale 1 after the busiest fight — no jank observed at any point.
- **18:00 — Reload → Continue (shots 26–27).** Hard page reload. Title now shows **Continue — "autosave · Bren's company, L1 — Day 1, 23:11"**. One tap: back in the night street, "The chronicle resumes — Vintavia Coast.", gold 182, quest active, full HP, bow equipped, sleepy portrait faces. Resume verified end to end.

## Findings by severity

### Major
1. **Difficulty cliff at the first quest objective.** A fresh level-1 party, full HP, following the quest's own advice (single sentry, one at a time) was wiped in the first exchange of its first real fight (~minute 13). Bandits (23 HP, 2–7 dmg, fast swings) vs. starting AC/damage is a losing check unless the player already knows to kite, use the bow at range, or switch to turn-based — none of which the game surfaces at that moment. The temple respawn + autosave absorbs the failure beautifully, but "first quest = probable TPK" is the roughest edge of the first 20 minutes. Suggest: nerf sentry count/damage near the camp edge, or have the mayor/log recommend turn-based mode for the first fight.
2. **Dead-stop collision + dense forest = joystick wedging.** Off-road trees stop movement with no slide along the obstacle; between the east road and the bandit camp I was fully wedged once (forward *and* strafe produced zero movement) and snagged three other times. On touch, where micro-corrections are expensive, this feels like input loss. A small tangential-slide on blocked movement would fix most of it.

### Minor
3. **Pack pad opens the pack but can't close it.** All DOM pads hide whenever a canvas screen is open, so the natural "tap Pack again" gesture is a silent no-op; closing means reaching the Close button at the far top-right of the canvas — the single most thumb-hostile spot in landscape. Consider leaving Pack visible as a toggle, or mirroring Close bottom-right.
4. **Chargen +/- and name/portrait buttons are ~25×20 CSS px** — roughly half the 44 pt Apple minimum. Every tap landed in emulation, but on a real phone with real thumbs the stat spinners will be miss-prone. (In-game DOM pads are properly ≥48 px; this is chargen/canvas-UI only.)
5. **Smallest canvas text is borderline at arm's length.** Log lines, map legend, item hint text render ≈8–9 px at 0.9 CSS scale (~2 mm tall on device). Crisp thanks to DPR 3, readable held close, but squinty at arm's length. Everything important (buttons, nameplates, HP) is larger.
6. **Desktop keycap labels on the in-canvas bottom bar** ("Attack (F) · Cast (C) · Use (Spc) · Pack (I)") duplicate the touch pads and advertise keys a phone doesn't have. Harmless, mildly confusing clutter on mobile.

### Polish / notes
7. **Autosave points are rest/death only** — inventory fiddling done after the rest was silently rolled back by reload→Continue. The Continue label states its timestamp, which is honest, but a "Save" line in the pause menu surfaced on mobile would close the gap. (Manual-save slot exists and death explicitly preserves it — good.)
8. **Safe-area work is real:** joystick/pads positioned with `env(safe-area-inset-*)`, portrait orientation shows a "turn your phone sideways" overlay, pads sit clear of the home-indicator zone. Landscape pillarbox bars are consumed by the controls rather than wasted.
9. **Delight moments that earn points:** name-cycling instead of a keyboard; quest text with a tactical warning that turns out to be true; corpse-tap looting; color-coded combat log; portrait winces and sleepy night faces; lamplit night streets; "The chronicle resumes" on Continue; graceful TPK fiction ("The Light kept a tithe of 20 gold").
10. **Performance:** Engine.frameAvg 2.8 ms after the busiest fight, renderScale stayed at 1. No dropped-frame feel at any beat (headless desktop Chromium caveat applies, but the budget headroom is ~5x).

## Score rationale
Comprehension (10/10), touch controls (8/10 — joystick+pads+tap verbs excellent; wedging and the Pack/Close seam cost it), readability (7/10), stability/perf (10/10), first-session difficulty (5/10 — TPK on quest step one), delight (9/10). Weighted for a first 20 minutes on the target device: **7.5/10, SHIP** — the failure loop is soft enough that the cliff frustrates without ejecting, and everything else about the session is confident and charming.
