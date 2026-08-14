# Vintavia UI Critique — Cycle 2

Bar: 10/10 carved-stone 1998 RPG UI — nothing clipped, nothing dead, everything readable and period-correct.

Method: drove the current build (`dist/index.html`, commit 783feca + working-tree dist, 932×430 @2x, Playwright/chromium)
as a player: title → chargen (12-tap name cycle, point-buy to exhaustion) → Begin → HUD → every cycle-1 repro path re-run
verbatim (temple doorstep interact, menu Save, 0-gold buy, guild with caster + 3000g, Controls Help, trainer at 0 and 5
skill points, paperdoll equip of leatherarm, automap outdoor+dungeon, turn-based toggle, dead-gap tap, log stress) → full
fresh sweep of all screens: title, chargen, HUD (peace/combat/turn-based), inventory, spellbook (caster + non-caster),
quests (empty + active), map (outdoor + Crypt), menu, save/load, help, rest (dungeon camp), all 7 shops, hall dialog +
quest accept, townsfolk dialog, victory (`UI.open(UI.victoryScreen())`), plus 3 extra cold boots for the portrait-bake
lottery. Every screenshot vision-read; zoomed crops for glyph-level checks. Evidence: `test/shots/ui2/*.png`
(01–47 + `z_*` zoom crops). Zero console/page errors across the whole session.

---

## Cycle-1 verification table

| # | Cycle-1 finding | Verdict | Evidence |
|---|---|---|---|
| C1 | Temple door hijacked by Guard Petra | **FIXED** — interact at (33.5,39.5) opens Temple of the Light directly; Petra moved to the west gate (`04_world.js:214`) | `06_temple_door.png` |
| M1 | Non-ASCII → '?' everywhere | **FIXED** — em-dashes, ’ “ ” ◄ ► ✓ ◆ − … all render; Controls screen has zero '?'; Turn-Based shows a real ✓. *Residual:* ← → (help line 1) and → (trainer "1 → 2") bake to near-illegible 3-px smudges at 9–11px | `01_title`, `08_controls_help`, `z_help_arrows`, `z_tb_button`, `z_train_arrow` |
| M2 | Toasts invisible on screens | **FIXED** — "Saved to the chronicle." visible on the menu screen the moment Save is tapped; "Not enough gold." visible on the shop screen at 0 gold. `drawToast` now runs on every surface | `07_menu_save_toast`, `11_shop_nogold_toast` |
| M3 | Guild overflows bottom for casters | **MOSTLY FIXED** — spell list capped at 5, wares + full sell section on-screen with a caster selected; non-caster text collision gone. *New residual:* see N2 | `14_guild_caster`, `13_guild_noncaster` |
| M4 | Faceless blue-hood portrait bake (~1 in 7 boots) | **NOT REPRODUCED** — 4/4 cold boots rendered all four faces correctly (beard-fix commit 5ac7ed4 likely the cure). Nondeterministic, so not provably dead — keep an eye out | `z_portraits_3boots` |
| M5 | Log 44-char mid-word truncation | **FIXED** — pixel word-wrap correct for all real strings, 8 rows clear the Attack row. *Edge:* a synthetic unbroken >222px word overruns under Roderic's portrait (no such string exists in game text) | `z_hud_log`, `27_log_stress` |
| m1 | Anonymous shop wares | **FIXED** — "Wares — tap to inspect, tap again to buy"; first tap shows "Dagger — 1d4 [Dagger] (tap again to buy)" + gold outline; second tap buys (−23g verified in `__session`) | `10_shop_inspect`, `12`* |
| m2 | Paperdoll unlabeled, gear invisible | **PARTIAL** — all 8 slots labeled (Wpn/Off/Arm/Helm/Feet/Ring/Ring/Neck); equipped armor/weapon now blitted onto the doll. But it's a 24px icon sticker on a naked mannequin — leather armor reads as a chest patch, not worn gear | `16_inventory`, `z_inv_doll2` |
| m3 | Chargen niggles | **MOSTLY FIXED** — +/− enlarged to 28×22 with fat-finger magnetism; name cycler skips used names (12-tap cycle: never a duplicate); portrait frame reads deliberate. *Residual:* '+' with empty pool still a silent no-op (no UI.say) | `02_chargen`, name-cycle eval log, `04_chargen_plus_at_zero` |
| m4 | Automap near-empty on first open | **FIXED** — town pre-explored with all 8 shop letters + door dots, red "you" marker, N↑ compass, full legend footer | `23_map_outdoor` |
| m5 | Colon reads as semicolon | **FIXED** — colon is hand-placed at draw time; crisp double dot at 9px ("Name: Roderic", "points left: 1"). *But the same quantization change birthed N1 (period = comma)* | `z_chargen_name`, `z_chargen_pool` |
| m6 | 4px dead gaps between HUD buttons | **FIXED** — 7px fat-finger magnetize verified: tap at y=202 between Rest and Turn-Based toggled turn-based | tap eval log |
| m7 | Trainer dead-looking-but-live buttons | **FIXED** — 0-point skill rows are dim plain text; "XP 1200 (ready to train!)" replaces the odd ratio; "Learn Axe/Mace/Dagger/Bow" column present and priced. *New residual:* see N3 | `19_trainer_nopoints`, `z_train_ready`, `21_trainer_trained` |
| p1 | Chargen toast surfacing late | **FIXED** by the universal toast overlay (same mechanism as M2) | — |
| p2 | Empty non-caster spellbook | **FIXED** — "Roderic follows the way of steel — no spellbook." + "Arms mastered: Sword 2, Shield 1, Leather 1" + flavor line | `29_spellbook_noncaster` |
| p3 | Tavern gossip wrap collision | **FIXED** — 2-line rumor clears the Wares label comfortably. *New residual:* see N4 | `39_tavern_gossip` |
| p4 | Victory screen '?'s | **FIXED** — clean, centered, em-dashes correct, Play on present | `44_victory` |

Also re-verified working: buy/sell/gold arithmetic (−23g dagger, −90g spell, −25g training, −40g heal, bank 100 in),
temple heal clears poison (4/27 poisoned → 27/27 ok), rest advances clock 08:51→17:20 and autosaves, load screen shows
slot metadata ("Manual save — Roderic's company, L1 — Day 1, 08:51"), quest accept → quest log with ◆ bullet and giver
line, combat target label "Goblin 12/12", "— your move —" tape in turn-based, affordability reddening at 0 gold.

## NEW findings

### N1. MAJOR — Period glyph renders as a comma at 9/11px, on every screen
Every sentence-ending '.' has a descender tail: "Vintavia, at last, The mayor is said to pay for bold hands," (source
says "at last. The … hands."), "Serena is restored by the Light,", "You settle between cold stones,", "v1,0". The whole
game now reads like it's allergic to full stops — the single most visible typography defect left, and it's a regression
from the colon fix: the lowered alpha floor (`a>36`) added for colon dots now keeps Georgia's anti-aliased skirt under
the period's dot.
- Evidence: `z_hud_log.png`, `z_combat_log.png`, `z_title_ver.png` vs `src/09_game.js:63`.
- Suspect: `src/06_art.js:255` (quantization floor). Fix: hand-place '.' like ':' is, or raise the floor for '.'/','-class glyphs only.

### N2. MINOR — Guild with 5 unlearned spells: last spell button overlaps the Wares caption; "…N more" hint buried
With a caster selected and 5 spells listed, the 5th button ("Ice Shard — 90g") bottom edge cuts through "Wares — tap to
inspect, tap again to buy", and the "…N more once these are learned." line is drawn *behind* the ware tiles (fragments
peek out between them). Buying still works; the hint is unreadable.
- Evidence: `z_guild_overlap.png`, `14_guild_caster.png`.
- Suspect: `src/08_ui.js` guild case — `yy` (my+12+5·28 ≈ 342) vs hard-coded `buySell(...,332,6)`; the `more` line lands at ~344 under tiles at 346. Clamp the list to 4, or move `buySell` y0 below `yy`.

### N3. MINOR — Trainer header collision at 0 skill points
"Skill instruction — 0 skill points (train a level to earn more)" (x=150) runs straight through "New instruction — 100g
each:" (x=430); the two strings overprint into mush for ~80px. Only when skillPoints=0 — with points the left header ends
in ':' and fits.
- Evidence: `z_train_header.png`, `19_trainer_nopoints.png`.
- Suspect: `src/08_ui.js` train case, both headers at `my+60`. Shorten the 0-point suffix or drop it to its own line.

### N4. MINOR — Tavern sell tiles overrun the bottom screen edge
The "Your goods" tiles start at y≈444 and are 40px tall → the bottom ~5px (tile frames) are clipped at y=480 and the
parchment's bottom border vanishes beneath them. Prices remain readable; it reads as a layout bug at a glance.
- Evidence: `38_shop_tavern.png`, `39_tavern_gossip.png` (bottom edge).
- Suspect: `src/08_ui.js` tavern case — `buySell(...,my+150,6)`; my+150+14+40 > 480. Lift y0 ~10px.

### N5. POLISH — Dungeon automap shows the town-shop legend
The Crypt's map footer still reads "W weapons · A armor · G guild · … · H hall    red = you" — none of which exist
underground. Confusing chrome on an otherwise correct fog-of-war map.
- Evidence: `25_map_dungeon.png`. Suspect: `src/08_ui.js:371` — gate the legend on `map.outdoor`.

### N6. POLISH — ←/→ arrow glyphs bake to smudges
"←/→ — turn" on Controls renders the arrows as 3-px dash-tails (↑/↓ are passable); trainer's "1 → 2" arrow is the same
smudge. No longer '?', but a 1998 player squints. Hand-place them like the colon, or reword ("Left/Right — turn").
- Evidence: `z_help_arrows.png`, `z_train_arrow.png`. Suspect: `src/06_art.js` EXTRA bake at 9–11px.

### N7. POLISH — Unbroken >222px log word overruns under the portraits
Synthetic stress only ("Supercalifragilistic…" ran beneath Roderic's frame); no real game string can hit it. Add a
hard character-break in `wrapText` for bulletproofing.
- Evidence: `27_log_stress.png`. Suspect: `src/08_ui.js` log wrap (no intra-word break).

### N8. POLISH — Dialog layouts leave a large dead middle
Hall/townsfolk dialogs pin their options at the bottom with ~250px of empty parchment between greeting and choices;
temple/bank/armor screens similarly cluster content in the top half. Period-plausible but spacious to a fault.
- Evidence: `33_townhall.png`, `42_townsfolk.png`. Suspect: `src/08_ui.js` dialog/shop layout constants.

### N9. POLISH — Chargen +/− still silent at limits
Tapping '+' with an unaffordable/empty pool (or '−' at class minimum) gives no toast, no sound. One `UI.say` each ends it.
- Evidence: `04_chargen_plus_at_zero.png`. Suspect: `src/08_ui.js` chargen +/- callbacks (no else branch).

## What's working (verified this cycle, keep it)
Temple door, universal toasts, ware inspect-then-buy, automap legend + pre-explored town, colon glyph, ✓/◄/►/◆/em-dash
rendering, duplicate-name prevention, fat-finger magnetism, trainer disabled-state text + Learn column + "(ready to
train!)", non-caster spellbook flavor, dungeon rest flavor ("You settle between cold stones."), load-slot metadata,
victory screen, quest log formatting, target label + "— your move —" tape, condition-red temple line, zero console
errors, all four portraits correct across four boots.

## Top 3 remaining improvements
1. **Restore the period** (`src/06_art.js:255`) — hand-place '.' the way ':' already is. One glyph, every screen; the
   game currently ends every sentence with a comma.
2. **One layout-clamp pass over the three shop overlaps** — guild 5-spell caption overlap + hidden "…more" hint (N2),
   trainer 0-point header collision (N3), tavern sell-row bottom clip (N4). All three are ±10px fixes in `shopScreen`.
3. **Finish the arrows and dress the doll** — hand-place ←/→/→ like the colon (or reword), and scale the equipped
   armor icon to cover the torso so the paperdoll stops looking naked in chainmail.

Score: **8/10** — the cycle-1 blockers are genuinely gone (doors, toasts, glyphs, guild, automap, trainer), the game
reads and plays like a confident '98 dungeon crawler; what remains is one self-inflicted typography regression, three
ten-pixel layout nicks, and sticker-art gear on the paperdoll.
