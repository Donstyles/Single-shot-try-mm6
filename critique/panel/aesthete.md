# Shipping Panel — The Aesthete (art direction, late-90s RPG lens)

**Question judged:** does every screen of `dist/index.html` look like a finished 1998 game, or does anything read as placeholder, programmer-art, or unfinished?
**Method:** 36 staged screenshots (title through defeat), every one vision-read at full attention. Shots in `test/shots/panel_art/`. Judged as shipped — no rebuild, no source excuses.

## VERDICT: NO-SHIP — overall 6/10

One more focused art pass away from a confident SHIP. The good news first: this is unmistakably ONE artist's game. The 16-ramp palette, the stone-slab UI chrome, the parchment screens, the rounded flat-shaded sprite language, the pixel-serif font — every screen belongs to the same object, and nothing is *missing*: every surface has a texture, every monster has a sprite, every screen exists. That consistency is rarer than beauty and it is this project's best asset. The night town (stars, lit lamps down the street) and the crypt corridors are genuinely evocative and would pass a 1998 squint test cold.

But "finished 1998" is a high bar — 1998 is Might & Magic VI with painted portraits and photographed-texture density — and several elements here read as artifacts or programmer-art rather than choices, and they appear in nearly every frame.

## Per-shot grades ("could this be a real 1998 screenshot?")

| Shot | Grade | Weakest element in frame |
|---|---|---|
| 01_title | 6.5 | Plain gray hatched Windows-y buttons floating over the painting; airbrush-blob clouds |
| 02_chargen | 6 | Flat vector-blob portrait; all-gray button wall on parchment |
| 03_town_0800 | 6 | Checkerboard haze band across the whole horizon reads as a rendering glitch, not fog |
| 04_town_1300 | 6 | Same haze artifact; street completely empty of people — dead composition |
| 05_town_1945 | 7 | Cloud blobs; otherwise strong dusk palette |
| 06_town_2330 | 7.5 | Best outdoor mood in the game (stars, lit lamps); clouds again |
| 07_shop_weapon | 6.5 | Icons ~16px adrift in oversized slots; bottom half of screen is bare parchment |
| 08_shop_armor | 5.5 | Armor icons are unreadable beige blobs (padded/leather); crudest icon set shown |
| 09_shop_guild | 6 | Three lonely potion slots in a sea of empty tan |
| 10_shop_tavern | 6 | Empty lower two-thirds |
| 11_shop_temple | 5.5 | Emptiest screen in the game — one button and 70% bare parchment |
| 12_shop_train | 6 | Layout fine; still half-empty |
| 13_shop_bank | 5.5 | Four gray buttons, no imagery of any kind — reads like a settings dialog |
| 14_shop_hall (mayor) | 6 | Quest-offer buttons fine; vast empty parchment below |
| 15_dialog_folk | 6 | Same; portrait carries the whole screen |
| 16_inventory | 6 | Paper-doll mannequin is a smooth featureless blob — most programmer-art element in the UI |
| 17_spellbook | 5.5 | Pure text table; a '98 spellbook would have page art / spell icons |
| 18_questlog | 6.5 | Clean and readable; empty bottom half |
| 19_automap_outdoor | 5 | Explored town is a thumbnail-sized smudge centered in a huge empty page — fixed world-extent scale makes the map read broken |
| 20_automap_dun1 | 7 | Proper floorplan, doors in gold, red you-marker — works |
| 21_dun1_corridor | 7.5 | Best 3D frame in the game; brick + mortar + darkness falloff sell it |
| 22_dun2_corridor | 7 | Skeleton guard sprite a bit stick-figure at mid-range |
| 23_dun3_hall | 6 | Gold-vein ceiling reads as noise/static rather than deliberate marble |
| 24a_brazier_dun1 | 6.5 | Hard vertical light seam splits the frame — per-cell lighting with no interpolation |
| 24_campfire | 6.5 | Great composition (tents, sun, fire) ruined by a green checkerboard glitch block in the top-left sky |
| 25_mon goblin/shaman/wolf | 6 | Sprites are flat rounded dolls; zero ground shadows, so everything floats slightly |
| 26_mon direwolf/bandits | 5.5 | Bandit's face is an empty dark smudge — reads unfinished at conversational range |
| 27_mon apprentice/bat/spider | 6 | Bat is a brown smear at rest; spider decent |
| 28_mon skeletons/zombie | 6 | Skeleton limbs are 2px sticks; zombie's black torso hole reads as missing texture |
| 29_mon ghost/necro/lich | 6 | Ghost dither-transparency is the best sprite effect present; lich reads Halloween-candy |
| 30_corpse | 6 | Corpse has a thick black outline no living sprite has — style break |
| 31_corpse_looted | 6 | Correctly vanishes; log line carries the beat |
| 32_combat_projectiles | 7 | Three glowing bolts mid-flight, casters staged — best action frame |
| 33_victory | 6.5 | Chunky crown icon is charming; screen is text-only otherwise |
| 34_defeat_respawn | 5 | Respawn camera faces a wall ~0.5 cells away — full viewport of giant blurred texels at the exact moment the player is most demoralized |
| 35_rest | 6 | Two buttons on empty parchment |

## Placeholder / artifact list (things that read as bugs or unfinished art)

1. **Checkerboard dither haze** on the outdoor horizon (03, 04, esp. midday) and on sprite/tree edges — reads as a transparency glitch, not atmosphere.
2. **Green checkerboard block in the sky**, top-left of the campfire shot (24) — flat-out looks like a rendering bug in frame.
3. **Per-cell lighting seams** — hard vertical bands where wall/floor shade jumps a level (24a brazier, dun1, town at dusk).
4. **Bandit face**: featureless dark smudge at conversational range (26).
5. **Zombie torso / shaman belly**: dark radial blob reads as missing texture rather than wound/robe (26, 28).
6. **Paper-doll mannequin** in inventory (16): untextured vector blob.
7. **Armor-shop icons** (08): beige blobs; cannot tell padded from leather at a glance.
8. **Automap outdoor scale** (19): explored region is a tiny floating smudge on an empty page.
9. **"Facing" glyph defect**: the sidebar reads "Pacing E" — the pixel font's capital F grows a bowl at size 9 and reads as P. Code says "Facing"; the screen says otherwise in every single gameplay frame.
10. **No ground shadows under any sprite** — every monster and NPC floats a hair above the ground plane.
11. **Defeat respawn faces a wall point-blank** (34) — composition, not art, but it ships in every death.

## Three highest-leverage art fixes

1. **Kill the checkerboard artifacts and light seams.** Replace the hash-dither haze with palette-step fog (the palette already has the ramps for it), clamp whatever leaks that green block into the sky corner, and smooth per-cell glow across cell boundaries. These read as *bugs*, and one perceived bug taints every clean frame around it. This is the single cheapest credibility win.
2. **One sprite-and-portrait detail pass.** A 2px darker outline + soft ground-shadow ellipse under every monster/NPC (grounds them instantly); give the bandit a face, the zombie a readable wound, the paper doll a texture; add 2-3 shading steps to the party portraits. The sprites' silhouettes are fine — they need surface, not redesign.
3. **Fill the dead parchment.** Every menu screen is 50-70% empty tan. A single reusable decorative border/crest watermark, larger item icons that fill their slots, and an auto-zoom on the outdoor automap would make every UI screen read *composed* instead of *sparse* — one asset, reused everywhere, in keeping with how this one-artist game already works.

— The Aesthete
