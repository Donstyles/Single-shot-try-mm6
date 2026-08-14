# Vintavia UI Critique — Cycle 1

Bar: carved-stone 1998 RPG UI — readable, consistent, nothing clipped, nothing overlapping, every tap target working.

Method: drove the built game (`dist/index.html`, 932×430 @2x, Playwright/chromium) as a player via `__game.tap`/`press`:
title → full chargen (portrait arrows, name cycle, every class, +/− point-buy, Recommended, Begin) → HUD → inventory,
spellbook, quests, map, menu/save/load/help, rest → all seven shops + town hall + townsfolk dialog. Bought a dagger (−23g),
sold bread (+2g), bought Fireball at the guild (−600g), rested at the tavern (−18g), healed at the temple (5→44 hp, −15g),
trained to level 2 (−25g, +5 skill pts), raised Sword 1→2, banked 100 in/out, accepted "The Stolen Ledger". Every
interaction cross-checked against `__session`. Evidence: `test/shots/ui/*.png` (60+ screens, all vision-reviewed).

NOTE — the working tree was being patched *while this critique ran* (log wrapping, extended font glyphs, fat-finger taps,
Pack button, new title backdrop appeared in `src/` mid-session; `dist` lagged behind). Findings marked **[FIX IN FLIGHT]**
were observed in the build under test and already have an uncommitted fix in `src/` — retest in cycle 2, don't double-fix.

---

## CRITICAL

### C1. Temple door is hijacked by Guard Petra — Use at the door never opens the temple
Standing on the temple doorstep (33.5, 39.5, facing the door at cell 33,40) and pressing Use opens **Guard Petra's dialog**
instead of the Temple of the Light, every time. `Game.interact()` gives NPCs within 2.2 cells priority over shop doors, and
Guard Petra is placed at (32.5, 38.6) — 1.35 cells from the doorstep. The temple only opens if you approach from the south
(≥2.2 cells from the guard), which a player has no way to know. A hurt party tapping the temple door gets small talk.
- Evidence: `40_shop_temple.png` (Guard Petra dialog after Use at temple door) vs `62_temple_real.png` (temple reached from 33.5,41.4). `session_log` "enter temple" → `screen: "dialog"`.
- Suspect: `src/09_game.js` `interact()` (NPC loop before shop-door loop, radius 2.2) + `src/04_world.js` folk4 spawn at TOWN_X+3.5, TOWN_Y+8.6. Fix: check facing-door first, or move the guard.

## MAJOR

### M1. Non-ASCII glyphs render as '?' on every single screen **[FIX IN FLIGHT — incomplete]**
The baked font covers ASCII 32–126 only; every —, ’, “ ”, ✓, ◆, ◄, ►, −, →, ↑, ↓, ←, … falls back to '?'. The game is
saturated with these: title ("A Might and Magic VI ? class homage"), every chargen tab ("Roderic ? Knight"), portrait
arrows render as two '?' buttons, the point-buy minus is '?', "Begin! ?", "Garron?s Steel", "Heal & bless ? 15 gold",
"Turn-Based ?", "? your move ?", "Sword 1 ? 2 (1 pt)", "?The Stolen Ledger? ? hear them out", the entire Controls screen
("W/S or ?/? ? walk"). This wrecks readability and the period feel more than any other single issue.
- Evidence: `01_title.png`, `02_chargen_initial.png`, `19_help.png`, `30_shop_weapon.png`, `43_shop_train.png`, `49_townhall.png`, `61_hud_turnbased_check.png`, `64_train_with_points.png`.
- Suspect: `src/06_art.js` `bakeFont()`. In-flight fix adds `EXTRA='’‘“”—–◆✓►◄−×…é'` + fallback map — but the Controls screen also uses `↑ ↓ ← →`, which are **not** in EXTRA and will still print '?'. Add them (or reword to ASCII) and rebuild dist.

### M2. All action feedback (UI.say toasts) is invisible on full screens — then appears stale later
`UI.say` toasts are only drawn in `drawHUD`. Every screen that actually *triggers* feedback (shops, menu, training,
chargen) never shows it: "Saved to the chronicle.", "Not enough gold.", "No skill points — train a level first.",
"A balanced party stands ready." all silently vanish — and then pop up over the 3D viewport seconds later after the player
closes the screen, out of context. Tapping Save in the menu appears to do nothing; tapping an unaffordable ware appears to
do nothing; tapping a skill button with 0 points appears to do nothing.
- Evidence: `17b_menu_saved_toast.png` (no feedback after Save), `21_hud_turnbased_check.png` (stale "Saved to the chronicle." floating over gameplay a screen later), `66_shop_no_gold_feedback.png` + `session_log2` (`toast:"Not enough gold."` set but nothing visible) → `67_hud_after_leave_toast_appears.png` (it surfaces after leaving the shop).
- Suspect: `src/08_ui.js` — toast block lives in `drawHUD` only; move it into `chrome()`/a shared overlay drawn after `UI.screen.draw()`.

### M3. Magic guild screen overflows the bottom of the screen for casters
With a caster selected, up to 7 spell buttons stack from y=202 (28px pitch), pushing the wares row to the very bottom edge
(price labels clipped) and the entire "Your goods (tap to sell)" section **off-screen below y=480** — selling at the guild
is impossible while a caster is selected. With a non-caster selected, "No further mysteries for this pupil." and the
"Wares (tap to buy)" label are drawn ~10px apart and visually collide.
- Evidence: `35_shop_guild_pc4.png` (wares clipped at bottom edge, no sell section), `34_shop_guild.png` (text collision).
- Suspect: `src/08_ui.js` `shopScreen` guild case — spell list `yy` feeds straight into `buySell(...,yy+10)` with no clamp/column layout.

### M4. Hooded portraits intermittently bake as faceless blue silhouettes (1 boot in ~7)
For one full session, Mireth's party portrait and the guild keeper's portrait were featureless navy hoods — no face, eyes,
nothing — across chargen, HUD, and the guild screen. Same build, next boot: correct faces. Bake checksums are identical
across normal loads, so this is a rare nondeterministic canvas-bake failure locked in at boot and persisting all session.
Party identity is the emotional core of an MM6 homage; a faceless hero looks broken.
- Evidence: `10_hud_play.png` / `34_shop_guild.png` (faceless) vs `61_hud_turnbased_check.png` (correct); zoomed crops confirmed side-by-side.
- Suspect: `src/06b_sprites.js` `paintFace()` hood path (inner-face `vol()` + feature strokes after the hood fill) / `bakeFromCanvas` readback during the staged boot in `src/10_debug.js`.

### M5. HUD message log: hard 44-char truncation, mid-word, no ellipsis **[FIX IN FLIGHT]**
In the build under test, log lines were cut mid-word ("The weapon smith is just ahead ? talk to f") and long lines ran
right up against Roderic's portrait frame. The in-flight fix (pixel-width word-wrap to 222px, 8 rows) looked correct in
the later build — verify in cycle 2, including very long single words and that 8 rows never collide with the Attack row.
- Evidence: `10_hud_play.png`, `54_hud_partial_bars.png` (injected 106-char line truncated at "meant to").
- Suspect: `src/08_ui.js` `drawHUD` log block.

## MINOR

### m1. Shop wares are anonymous — icon + price only
No item names, damage, or AC anywhere in the buy grid; a 23g and a 135g sword differ only by icon shading. MM6 at least
named the goods. Players buy blind (I bought a "Dagger" only knowing it cost 23g).
- Evidence: `30_shop_weapon.png`, `33_shop_armor.png`. Suspect: `src/08_ui.js` `buySell()` — add a name line on tap (select-then-confirm) or a caption under the grid.

### m2. Inventory paperdoll: unlabeled slots, gear not reflected
Eight bare boxes with no slot labels (which is the helm slot?); the doll itself is a naked mannequin even with sword +
chain equipped — only the weapon slot shows an icon. "tap gear to unequip" is the only hint.
- Evidence: `11_inventory.png`. Suspect: `src/08_ui.js` `invScreen` slots array / `src/06b_sprites.js` paperdoll.

### m3. Chargen niggles
+/− buttons are 22×20px (cramped at phone scale) **[FIX IN FLIGHT: enlarged + fat-finger pass]**; name cycler can produce
duplicate names (two Aldrics — `04/06_chargen_*.png`); pool-exhausted '+' taps no-op silently (feedback issue M2);
portrait frame overlaps the portrait's top rows by 2px (`03_chargen_portrait_cycled.png`).
- Suspect: `src/08_ui.js` `chargenScreen`.

### m4. Automap is a near-empty parchment on first open
A ~3-cell explored blob in a vast blank field; no compass, no building labels, shops-gold legend refers to dots the player
hasn't revealed yet. Correct fog-of-war, but reads as a broken screen the first time.
- Evidence: `16_map.png`. Suspect: `src/08_ui.js` `mapScreen` — seed a slightly larger initial reveal or label the town.

### m5. Colon glyph reads as semicolon at small sizes
"Gold; 200", "Cond; ok", "Name; Roderic" everywhere — the 9/11px baked ':' loses its top dot. Small, but it's on every
screen and cheapens the type.
- Evidence: `11_inventory.png`, `30_shop_weapon.png`, `47_shop_bank.png`. Suspect: `src/06_art.js` `bakeFont` quantization thresholds (a>50 floor drops faint pixels).

### m6. Right-panel buttons have 4px dead gaps and no pressed-state cue for toggles
A tap at y=195 between Rest and Turn-Based hits nothing (my first toggle attempt whiffed) **[FIX IN FLIGHT: fat-finger
pass]**. Turn-Based state is color-only (red text) — fine, but the '✓' is currently a '?' (M1).
- Evidence: `21_hud_turnbased_check.png` vs `61_hud_turnbased_check.png`.

### m7. Training screen: dead-looking-but-live buttons
Skill buttons render fully enabled with 0 skill points and no-op on tap (silent because of M2); "XP 5000/1000" reads oddly
once past the threshold.
- Evidence: `43_shop_train.png`, `45_shop_train_can_train.png`.

## POLISH

- p1. Chargen toast ("A balanced party stands ready.") first becomes visible seconds later over the opening 3D view (`10_hud_play.png`).
- p2. Non-caster spellbook is one lone sentence on an empty parchment — add flavor art or the class's weapon skills (`13_spellbook.png`).
- p3. Tavern gossip wraps to within ~6px of the "Wares" label; a 3-line rumor would collide (`38_shop_tavern_gossip.png`, `src/08_ui.js` tavern case).
- p4. Victory screen (debug-opened for layout review): clean, centered, Play on works — just inherits M1 '?'s (`68_victory.png`).

## What's working (verified, keep it)
Carved-stone frame + parchment screens are genuinely on-brand; every screen has a working Close/Leave; all chargen widgets
respond and point-buy math is correct; buy/sell/gold arithmetic exact (−23/+2g); affordability color-coding (red prices at
0 gold, `66_shop_no_gold_feedback.png`); guild purchase updates spell list and removes the bought spell; temple heal,
training, skill raise, bank, tavern rest, quest accept → quest log all mutate state correctly; portrait selection
highlight, condition-red HP sliver at 5hp, and log color-coding all read well (`54_hud_partial_bars.png`).

---

## Top 3 improvements
1. **Draw toasts on every screen, not just the HUD** (`UI.chrome` or post-`draw()` overlay) — this single change fixes the
   worst felt problem: shops, menu, and training currently appear unresponsive whenever an action fails or succeeds.
2. **Finish the font: add ↑ ↓ ← → to EXTRA (or reword Controls), rebuild dist, and sweep every screen for stray '?'** —
   cycle 1's build garbled text on literally every screen.
3. **Fix door-vs-NPC interact priority (temple!) and the guild screen overflow** — one blocks a core service behind a
   chatty guard; the other pushes tap targets off-screen.

Score: **6/10** — mechanically sound and charmingly period-correct under the hood, but garbled glyphs everywhere, invisible
feedback, one hijacked door, and one overflowing screen keep it well short of the carved-stone bar.
