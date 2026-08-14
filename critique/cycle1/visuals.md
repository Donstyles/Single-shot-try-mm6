# Vintavia — World Visuals Critique, Cycle 1

Bar: does a screenshot pass for a 1998 pre-rendered 640x480 RPG (MM6)? Palettised, dithered, atmospheric.
18 shots captured to `test/shots/visuals/` (01_title ... 18_fields_dusk_sky). Per-shot grades first, then the defect list.

## Per-shot grades (1-10 vs the MM6 bar)

| Shot | Grade | One-liner |
|---|---|---|
| 01_title.png | 5 | Nice dithered dusk gradient + skyline, but clouds are unreadable grey blobs and `?` glyphs break the text |
| 02_town_street_morning.png | 5 | Solid corridor perspective and dirt road, but wall tiling is blatant and the street dead-ends in a black void at 08:00 |
| 03_town_street_dusk.png | 7 | Best town mood — orange gradient sells it; clouds stay daylight-white |
| 04_town_street_night.png | 7 | Stars + lamp read well; walls stay a bit too bright for 02:00 |
| 05_town_gate_east.png | 4 | Clean Wolfenstein-white blocks, and the open gate frames a pitch-black daytime horizon — illusion collapses |
| 06_wilderness_fields.png | 4 | Flat single-tone green plane, lollipop trees, hard black horizon band in daylight |
| 07_forest.png | 3 | "Forest" is ~8 tiny trees at the horizon over a near-black speckled band; zero enclosure |
| 08_pond.png | 7 | Water is the best surface in the game — soft dithered wave blobs, believable; black horizon behind it hurts |
| 09_crypt_entrance.png | 5 | Reads as a rock maze, not a crypt; no arch/gate silhouette visible, green line artifacts at the opening |
| 10_bandit_camp.png | 6 | Real set-dressing (tents, fire, chest, figures) — but bandits are bald clay stick-men and the hero tree has an "eyeball" swirl |
| 11_monsters_goblin_wolf.png | 4 | Goblin at 2.5 cells is a tiny green-headed stick figure; weak silhouettes, no outlines, low contrast on grass |
| 12_dun1.png | 6 | Good floor slabs and wooden door; wall texture tiles hard with odd yellow-green dots; flat, sourceless lighting |
| 13_dun1_skeleton_ghost.png | 6 | Skeleton silhouette is genuinely good; spawned ghost is not visible in frame at all |
| 14_dun2.png | 4 | Identical texture set to dun1 — Catacombs have no identity of their own |
| 15_dun3_vault.png | 5 | Green marble + gold veins is a real identity, but wall/floor/ceiling are the same texture so the room turns to noise soup |
| 16_dun3_lich.png | 7 | Crowned skull, dark robe, cyan orb — best creature; egg-shaped body slightly comic |
| 17_wilderness_night.png | 8 | Best outdoor shot: stars, dark cloud patches, moonlit road — genuinely atmospheric |
| 18_fields_dusk_sky.png | 5 | Gorgeous sunset gradient over grass that is still full noon-green at 19:31 — sky and ground disagree |

## Defects

### CRITICAL

1. **Daytime distance fog fades to pure black — every outdoor horizon is a black void band.** Visible at 08:00–10:03 in 02, 05 (through the open gate), 06, 07, 08, 18. In MM6 daytime distance fades to sky/haze colour; black fog reads as a rendering bug and kills the "outdoors" illusion in most daylight shots. Cause: `shadeAt()` in src/05_engine.js (lines 94–99) subtracts palette brightness toward 0 with no fog colour ramp, and out-of-map cells render mountain tex fully shaded. Fix: outdoors, blend toward a per-time horizon colour (haze at day, orange at dusk, near-black only at night).

2. **Humanoid monster sprites fail scale and silhouette.** Goblin at 2.5 cells (11_monsters_goblin_wolf.png) is a small, thin stick figure with a bald sphere head — roughly half the visual mass a MM6 monster has at that range; bandits in 10_bandit_camp.png read the same. No dark outline, low contrast against grass, no stance/costume. Suspect: src/06b_sprites.js `drawHumanoid` rig (64x96, `size:0.8`) plus sprite height scaling in src/05_engine.js sprite pass (~line 201). Bulk the rig, add 1px dark outline, raise on-screen scale ~1.4x.

### MAJOR

3. **Wall texture tiling is blatant everywhere.** Town timber (02–04) repeats the identical panel per cell; crypt brick (12, 14) repeats identical blocks with conspicuous yellow-green dots that read as artifacts, not moss. Suspect: src/06_art.js wall generators — needs per-cell variant selection or a hash-jittered texture offset.

4. **The Catacombs (dun2) are visually identical to the Crypt (dun1).** 14_dun2.png vs 12_dun1.png: same wall texture, same door, same floor. Levels need per-level texture/palette identity (src/06_art.js wall/floor sets, src/04_world.js `wallTex` assignments — DUN2 appears to reuse crypt stone 5).

5. **Time-of-day ground lighting is disconnected from the sky.** 18_fields_dusk_sky.png: deep sunset sky over full-brightness noon grass at 19:31; by 20:00 (03) surfaces snap dark. The `light` factor steps too late/abruptly and never tints — dusk should warm surfaces, not just dim them. Suspect: day-light factor feeding `shadeAt` in src/05_engine.js line 96 (`(1-light)*7`), computed from `cam.timeMin`.

6. **Forest does not exist as a place.** 07_forest.png shows a bare plain with a handful of 1-cell lollipop trees at the horizon. Tree scatter density (src/04_world.js ~line 174) is far too sparse and canopies too small (src/06_art.js tree sprite) to ever enclose the player.

7. **Vault surfaces merge into noise.** 15_dun3_vault.png: identical green-marble texture on wall, floor, and ceiling with no edge/trim — the room loses all depth cues. Suspect: src/06_art.js vault texture reused for all three surfaces; give the floor larger slabs and the ceiling a darker variant.

### MINOR

8. **Glyph fallback prints `?` in place of em-dashes/apostrophes** in title subtitle ("MM VI ? class homage", 01), message log ("just ahead ? talk to", 02+), and version line. Every string with punctuation reminds the player it's a browser font hack. Suspect: bitmap font glyph set in src/06_art.js or text drawer in src/08_ui.js.

9. **Tree canopy "eyeball" artifact.** The large tree in 10_bandit_camp.png (also 17) has concentric dark rings in the canopy that read as a staring eye. Suspect: radial shading loop in the tree sprite painter, src/06_art.js.

10. **Fourth portrait (Mireth) is a faceless blue cowl** — if this is a hood it needs at least a chin/shadowed face; currently reads as a missing asset (all shots, bottom bar). Suspect: portrait painter in src/06_art.js.

11. **Spawned ghost never appeared** in 13_dun1_skeleton_ghost.png despite `spawn('ghost',3,0.8)` — either it drifted instantly or its alpha/ghost rendering makes it invisible against the dark door. Worth a dedicated check (src/06b_sprites.js ghost, engine `ghost` path ~line 205).

12. **Crypt entrance is not a landmark.** 09_crypt_entrance.png: the `cryptgate` decor is invisible from the approach; the entrance is a plain gap in a rock wall, plus stray green scanline artifacts at the opening base. Suspect: cryptgate decor sprite (src/06_art.js) and its placement (src/04_world.js line 158).

### POLISH

13. Clouds stay white at dusk/dawn — tint them with the sky gradient (Art.sky/cloud painter, src/06_art.js 03, 18).
14. Gate stonework (05) is too clean/bright — grime and edge damage would sell age.
15. Water is static in stills anyway, but the wave-blob tile repeat becomes visible mid-distance (08) — a second variant tile would break it up.
16. Night walls (04) could drop another shade step; lamp glow pools on the ground would sell the lamps that already exist.
17. Sun disc exists (06, 07 top-right, fused with a cloud into a "comet") but never appears at sunset where it would matter (18).

## What already works

- The palettised framebuffer pipeline is real (palette index + brightness nibble) — shading never hue-shifts, which is exactly the 1998 look.
- Night town and night wilderness (04, 17) are legitimately atmospheric: starfield, dark cloud patches, lamp point.
- Dusk sky gradient (03, 18) and the title-screen gradient are the right colours.
- Water (08), dungeon floor slabs (12), wooden doors, skeleton and lich silhouettes (13, 16), and the bandit camp's set-dressing density (10) all pass.
- UI chrome — stone panel, gold bevel buttons, portraits bar — reads convincingly MM6 at a glance.

## Three changes with the biggest wow-factor payoff

1. **Replace black daytime distance fog with sky-coloured haze (src/05_engine.js `shadeAt` + wall/floor shading).** One function touches every outdoor screenshot; daylight vistas would instantly stop looking broken and start looking like rolling countryside.
2. **Rebuild the humanoid sprite rig: bigger on-screen scale, bulked proportions, dark outline, costume blocks (src/06b_sprites.js).** Monsters are the thing the player stares at in combat; today they are the weakest pixels on screen.
3. **Tie surface light to the sky with tinted dusk/dawn ramps and per-cell texture variation (src/05_engine.js light factor + src/06_art.js wall variants).** Golden-hour fields with untiled walls would produce the "screenshot I'd share" moment the game currently only reaches at night.
