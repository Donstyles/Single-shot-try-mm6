# Vintavia — World Visuals Critique, Cycle 2

Bar raised: **"could this screenshot pass for Might & Magic VI?"** — a full-window 640x480 software-rendered vista with painted-texture density, sourced lighting, and monsters you'd flinch at.
Fresh evidence set: 20 shots in `test/shots/visuals2/` (01_title … 19_night_lamp, plus 20_dun2_ghost_probe). All cycle-1 locations re-shot; nothing graded from old images.

## Part 1 — Cycle-1 verification table

| # | Cycle-1 finding | Status | Evidence (visuals2/) |
|---|---|---|---|
| 1 | Black daytime horizon → sky haze | **FIXED** | 05, 06, 07, 08: distance now dissolves into sky-coloured Bayer-dither haze; no black band anywhere in daylight. (New lower-severity artifact: the dither band itself, see N4.) |
| 2 | Humanoid sprites bulked / outlined / bigger | **PARTIALLY FIXED** | 10, 11: bandit at 2.5 cells now fills real vertical space, dark outline present, sword/club/hood/tunic read. But heads are still featureless (blank cube/sphere — no eyes, mouth, teeth), and the chest shading blob reads as a hole (see N1). |
| 3 | Wall texture tiling blatant | **MOSTLY FIXED** | 12: dun1 walls are now varied large bricks with per-brick tone shifts — repeat is no longer conspicuous. 02: town facade has beams/windows/sign breaking it up, though the two window panels are mirror-identical and long walls still cycle one panel (see N5). |
| 4 | dun1 identical to dun2 | **FIXED** | 12 vs 14: Crypt = warm grey mega-blocks + beamed ceiling; Catacombs = darker blue-grey small brick, plank doors, colder gloom. Instantly distinguishable. |
| 5 | Dusk ground disconnected from sky | **PARTIALLY FIXED** | 18: fields at 19:46 now show dimmed, warm-shifted grass and glowing treeline silhouettes under the sunset — the cycle-1 "noon grass under sunset" clash is gone. But 03: town walls at 19:46 are still near-morning brightness; buildings lag the sky where terrain no longer does. |
| 6 | Forest not a place | **PARTIALLY FIXED** | 07: tree count several times higher, near+mid+horizon layers exist, a wolf silhouette sells it. Still zero enclosure: every tree is the same two-size lollipop, no canopy ever crosses the ceiling of the frame, no undergrowth. Reads "orchard", not "forest". |
| 7 | Vault surfaces merge into noise | **PARTIALLY FIXED** | 16, 17: floor is now clearly separate (grey slabs + gold/teal inlay) — big win. Wall and ceiling are still the same dark-green + gold-scribble texture and fuse at the corner. |
| 8 | `?` glyphs for em-dash/apostrophe | **FIXED** | 01 subtitle and 02 log line both render real em-dashes; no `?` anywhere in 20 shots. (New lower-severity glyph issues remain, see N6.) |
| 9 | Tree canopy "eyeball" rings | **FIXED** | 07, 10: canopies are irregular mottled blobs; no concentric rings on the bandit-camp hero tree. |
| 10 | Mireth = faceless blue cowl | **FIXED** | All shots, 4th portrait: face with skin, eyes and shading inside the hood. |
| 11 | Spawned ghost invisible | **FIXED** | 20_dun2_ghost_probe: Restless Shade renders beautifully — stipple-transparent white/cyan shroud, dark hood void, orb. (Note for future critics: shot 15 missed because `spawn('ghost',3,0)` from (2.5,2.5) lands the ghost *inside the door cell at x=5* — spawn into open floor.) |
| 12 | Crypt entrance not a landmark | **PARTIALLY FIXED** | 09: two lit braziers now flank the opening — from the approach you know where the door is. Still no arch/lintel silhouette, the thin green artifact line at the opening base survives, and a stray grey 1-cell stub pokes above the wall line. |
| 13 (P) | Clouds stay white at dusk | **FIXED** | 01, 03, 18: clouds tint warm with the gradient. |
| 16 (P) | Night lamp light pools | **NOT FIXED** | 19: lamp globes glow at 23:31 but the ground beneath is exactly as dark as the rest of the street — zero cast light. Same indoors: the brazier in 13 lights nothing around it. |
| 17 (P) | Sun never at sunset | **FIXED** | 18: sun disc sits on the horizon in the sunset gradient. (Its daytime "comet" fusion with a cloud streak persists — 06, 07, 08 top-right.) |

Score of the fix round: 8 fixed, 5 partial, 1 not fixed. Every critical/major item moved.

## Part 2 — New findings at the MM6 bar

### MAJOR

**N1. Monsters have no faces.** 11_goblin_bandit_closeup: at 2.5 cells — melee handshake range — the bandit's head is a flat featureless brown box and the goblin's a smooth green sphere. MM6 monsters at this range show eyes, snarl, teeth; that's what makes combat feel inhabited. The rig upgrade fixed mass and outline but `drawHumanoid`'s "face hint" (src/06b_sprites.js ~line 82) is invisible at render scale, and hooded variants (bandit) skip features entirely. Also the dark chest-shading ellipse reads as a bullet hole on both goblin and bandit (10, 11). Suspects: src/06b_sprites.js `drawHumanoid` face pass + shading blob.

**N2. Nothing casts light.** The engine has a fire-glow map (`glowAt`, src/05_engine.js ~94–106, applied at ~line 205) but its effect is invisible in every shot: 19 — street lamps at night leave no pool on the road or wall; 13 — a burning brazier one cell away leaves floor and walls flat grey; 17 — the vault brazier lights nothing. Sourced pools of warm light are *the* MM6 dungeon/night signature. Either the glow radius/strength is far too small, or the floor/ceiling pass never samples it. Suspects: src/05_engine.js floor loop (~136–150, no glow term visible) and glow pre-scale (~94).

### MODERATE

**N3. Flame sprites fail up close and at distance.** 13: the brazier flame two cells away is a huge yellow blob with a dark pac-man "bite" (animation frame artifact) and no bowl/logs contact — it floats. 10: the campfire is a golden egg hovering over grass. Suspect: flame/brazier sprite frames in src/06_art.js / 06b_sprites.js decor painters.

**N4. Horizon haze dither reads as chain-link fence.** 05, 06, 07, 08, 11: the distant tree/terrain band is dissolved through a 4x4 ordered-Bayer checker at fixed 25/50/75% (src/05_engine.js `hazeLvl`/`HZT`/`BAYER4`, ~113–119). Over a long uniform treeline the 75% step produces a perfectly regular mesh texture — reads as a fence around the world, especially at dsf 2. A per-pixel hashed threshold (blue-noise-ish) or one extra haze colour step between treeline-green and sky would dissolve it. Also the goblin in 05 pops fully sharp *in front of* the dithered band — sprites never haze (src/05_engine.js sprite pass ~200–211 applies `hz` to walls only… verify sprite path). |

**N5. Town set-dressing is one building repeated.** 02, 03, 04: single facade type — same mirrored window pair, same unreadable dark-red sign slab on every shop. The sign has no glyphs/icon at any distance. 19 shows the same panel marching down the whole street. MM6 towns mix 2–3 house types + readable hanging signs. Suspects: src/06_art.js timber wall generator (tex 2), sign painter.

**N6. Small-size bitmap font glyph defects.** The `?` plague is gone, but at size ≤11 the font misrenders: 'o' loses its top stroke — "Moonday" reads "Muuoday" (top bar, every shot); ':' renders as ';' ("Gold; 200", "Sound; On"); '.' renders as ',' ("v1,0" on title). Charming-retro up to a point; wrong glyphs are past it. Suspect: `Art.bakeFont` small ramp (src/06_art.js). |

**N7. Vault gold veining is scribble noise.** 16, 17: the gold veins on green marble are single-pixel scratch strokes at uniform density — at distance the whole upper half becomes static. Real marble veining is sparse, connected, and larger-scale. Suspect: vault texture generator (src/06_art.js tex 6). |

### MINOR

**N8.** Sun+cloud "comet" fusion persists by day (06, 07, 08) — the streak cloud spawns exactly at the sun's altitude. Suspect: cloud placement vs sun position in Art.sky.
**N9.** 09: stray grey 1-cell stub above the crypt wall line and the surviving green base-line artifact at the entrance gap (src/05_engine.js wall-top / door seam).
**N10.** 05: the east gate itself never appears at the documented vantage — from (66,37) facing east there is only open field; if a gate structure exists it is off-axis. Landmark or harness coords need reconciling (src/04_world.js gate placement).
**N11.** Water tile repeat visible mid-distance as diagonal facet pattern (08) — second variant tile still absent (cycle-1 P15).

## Part 3 — Per-shot grades vs the MM6 bar

| Shot | Grade | One-liner |
|---|---|---|
| 01_title | 7 | Dashes fixed, warm-tinted clouds, castle silhouette works; "v1,0" glyph, window dots too grid-regular |
| 02_town_morning | 7 | Blue sky over rooftops, facade with sign/windows — finally a town; sign unreadable, facade repeats |
| 03_town_dusk | 7 | Gorgeous tinted-cloud gradient; walls barely dim at 19:46 — buildings lag the sky |
| 04_town_night | 7 | Stars + dark cloud patches + darkened street read right; a touch flat without lamp pools |
| 05_gate_east | 6 | Haze horizon works; no gate in frame, chain-link dither band, blank-faced goblin pops sharp against haze |
| 06_fields | 6.5 | Rocks, dirt patches, layered treeline — countryside at last; near grass still one tone, haze mesh |
| 07_forest | 6 | Real density gain + wolf silhouette; still an orchard of identical lollipops, no overhead canopy |
| 08_pond | 7.5 | Best outdoor surface in the game; far-shore haze sells depth; facet repeat mid-distance |
| 09_crypt_entrance | 6 | Braziers make it findable; still no arch silhouette, green seam + wall stub artifacts |
| 10_bandit_camp | 6.5 | Bulked armed bandits, tents, chest, hero tree — proper encounter staging; blank heads, egg campfire |
| 11_goblin_bandit_closeup | 6 | Scale/outline/costume now right; faceless heads and chest-hole shading kill the close-up |
| 12_dun1 | 7 | Varied brickwork + beamed ceiling, no more dot artifacts; lighting still sourceless |
| 13_dun1_brazier_chest | 5.5 | Weakest shot: pac-man flame blob, zero cast light, room beyond is undifferentiated black |
| 14_dun2 | 7 | Distinct cold catacomb identity, plank door; same flat light |
| 15/20_dun2_ghost | 7.5 | Stipple-transparent shade with hood void + orb — genuinely MM6-worthy undead |
| 16_dun3_vault | 6.5 | Floor separation achieved; wall/ceiling still fuse, gold veins = static noise |
| 17_dun3_lich | 6.5 | Lich reads at range (crown, robe, orb); brazier lights nothing, green scribble walls |
| 18_fields_dusk | 7.5 | Sun on horizon, warm dimmed ground, silhouetted treeline — first shot where sky and world fully agree |
| 19_night_lamp | 6.5 | Lamp globes + stars atmospheric; no light pools under the lamps — the one missing ingredient |

Cycle-1 average ≈ 5.4 → cycle-2 average ≈ **6.7**.

## Top 3 changes still standing between this and MM6

1. **Give fire its light (src/05_engine.js glow path).** Warm pools under street lamps, brazier-lit floor and wall gradients in dungeons. Fixes the two weakest shots (13, 19), gives all three dungeons sourced depth, and is the single largest remaining atmosphere gap — the machinery (`glowAt`) already exists, it just doesn't show.
2. **Put faces on the monsters (src/06b_sprites.js drawHumanoid head pass).** Eyes/brow/mouth blocks at head scale plus removing the chest-hole shading blob. Combat close-ups are where MM6 lived; blank mannequin heads are now the most obvious tell in every fight.
3. **Dissolve the horizon mesh (src/05_engine.js haze dither).** Replace the fixed 4x4 Bayer steps with hashed/noise thresholds (and haze sprites too, or fog distant sprites) so daylight vistas end in atmosphere instead of a chain-link fence — it currently undermines the horizon fix in every single daytime exterior.

## What already passes

Dusk/night skies (03, 04, 18), water (08), the ghost and lich sprites, dun1/dun2 texture identities, the vault floor inlay, portrait bar, and the UI chrome would all sit comfortably in a 1998 screenshot gallery.
