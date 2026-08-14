# Panel 2 — The Aesthete (art director, late-90s RPGs)

**Question judged:** does every screen look like a finished 1998 game — could each screenshot pass in a
1998 magazine spread — or does anything read as placeholder, programmer-art, or a rendering bug?

**Method:** dist/index.html as shipped, no rebuild. Staged via `__game` harness (skipChargen, gotoMap,
teleport, setTime, spawn, turn-based freeze), 932x430 @2x. 29 shots in `test/shots/panel2_art/`,
every one vision-read at full attention. I did not read prior critiques.

---

## VERDICT: SHIP — 7.0 / 10

This is a coherent, finished-looking 1998 *budget/shareware* title — think late-era shareware raycaster
with a Might & Magic VI frame, not MM6's own gloss. Every screen is composed, chromed, and typeset in
one consistent voice; I found **no true rendering bugs**. What keeps it off 8+ is one systemic weakness
(humanoid faces go featureless at conversational range) and empty-parchment discipline on several 2D
screens. Nothing reads as unfinished scaffolding; a magazine would run the sunset street, the brazier
vignettes, and the chargen screen without embarrassment, and crop carefully around the bandit boss.

## Per-shot grades (against the 1998 bar)

| # | Shot | /10 | Weakest element in frame |
|---|------|-----|--------------------------|
| 01 | Title | 7 | The moon: a flat white egg-blob in an orange halo; clouds are dithered pancakes. Castle silhouette + lit windows carry it. |
| 02 | Chargen | 7.5 | Tiny flat-shaded portrait next to otherwise confident MM6-style layout. |
| 03 | Street 08:00 | 6.5 | Sky reads full noon at 8am — no morning warmth; far end of street dissolves into pixel mush. |
| 04 | Street 13:00 | 7 | Hard light-gray fog band behind the rooflines; a seam, not a gradient. |
| 05 | Street 19:45 | 8 | Best outdoor shot in the game — sunset gradient, gold-lit clouds, dimmed facades. Weakest: clouds still blob-shaped. |
| 06 | Street 23:30 | 7 | Starfield + dark clouds sell it; lamp heads glow but the ground light pools are faint — night street is uniform dark. |
| 07 | Shop interior | 6.5 | Right half and bottom of the parchment are dead space; item icons float small in large slots. Smith portrait is charming. |
| 08 | Dialog (mayor) | 7 | Bottom half empty. Portrait + option-button composition itself is clean and period-correct. |
| 09 | Inventory (equipped) | 7 | Paperdoll clearly reads DRESSED (helm, mail, sword, shield, boots) — but the mail overlay climbs over the chin and reads as a gray beard at a glance. |
| 10 | Spellbook | 5.5 | Three rows of spells above two-thirds empty parchment; the flat red squares read as placeholder checkboxes. Weakest 2D screen. |
| 11 | Quest log | 7.5 | Best 2D screen — hierarchy, color-coded headers, giver + progress lines. Weakest: empty "Completed" section trailing into void. |
| 12 | Automap outdoor | 7 | Legible: road/yards/shop letters/you-dot. Flat color blocks are austere but period-typical. |
| 13 | Automap dungeon | 7 | Rooms, doors, stairs all legible at a glance; good scale. |
| 14 | Crypt corridor | 6 | Murky — depth ramps to pure black within ~4 cells; skeleton + nametag + grounding shadow are good. |
| 15 | Crypt brazier | 7.5 | Fire sprite is genuinely good and the room around it IS lit (lightmap works). Weakest: a single stray yellow spark pixel floating above the flame reads as a dead pixel. |
| 16 | Catacombs corridor | 6.5 | Handsome blue-gray brick; again heavy black beyond mid-distance. |
| 17 | Catacombs brazier | 7 | Chest-and-brazier vignette; dithered shadow rings under sprites get noisy this close. |
| 18 | Vault corridor | 6.5 | Gold-inlaid marble floor + armed skeleton guards are great; the dark-green speckled ceiling reads as video noise/artifact rather than material. Weakest element of the dungeon set. |
| 19 | Vault brazier | 7 | Same fire quality; same green-noise ceiling overhead. |
| 20 | Goblin / shaman / wolf | 6.5 | All grounded with shadows, correct relative scale; the shaman's face is a near-featureless green ball. |
| 21 | Bandit / bandit boss | 5.5 | The boss's face is a dark blob with two pale dots — this is the one sprite that reads programmer-art at conversational range. |
| 22 | Skeleton / guard / zombie | 6.5 | Skeleton's skull-face reads instantly (best face in the bestiary); guard's helm hides all features; zombie torso mottling works. |
| 23 | Ghost / necromancer / lich | 7 | Lich (crowned skull, maroon robe, orb) is the best monster in the game; ghost's layered translucency works. |
| 24 | Bat / spider / direwolf / apprentice | 6.5 | Good silhouettes and scale; apprentice is a faceless void under the hood; airborne bat correctly has no ground shadow but slightly floats compositionally. |
| 25 | Corpse | 6.5 | Reads as a lootable goblin pile with shadow; close to an abstract blob but the red/green sells it. |
| 26 | Combat, projectiles mid-flight | 7.5 | Fire and ice orbs with soft glow cores are magazine-worthy; the arrow projectile is nearly invisible in frame. |
| 27 | Victory screen | 7 | Crown icon + gold headline + stats + single button — clean ceremony. Weakest: crown icon is small for the moment. |
| 28 | Defeat respawn | 7 | Temple wake-up with red tithe text in log reads clearly. (Monsters in frame are my staging leftovers, not a game fault.) |
| 29 | Rest screen | 6 | Two buttons and two lines adrift in a full screen of parchment. |

## Placeholder / bug-looking list

Nothing is an actual rendering bug. Items that *read* as placeholder or glitch:

1. **Bandit boss / shaman / apprentice faces** — featureless dark or flat blobs at conversational range; the boss is the single worst offender (looks like an untextured mannequin head).
2. **Vault (dun3) ceiling** — dark-green speckle reads as static/noise, not a material.
3. **Stray spark pixel** above every brazier/campfire flame — reads as a stuck pixel.
4. **Spellbook red squares** — read as unchecked placeholder checkboxes, not spell gems.
5. **Arrow projectile** — a few white pixels; effectively invisible next to the spell orbs.
6. **Midday horizon fog** — a hard band behind rooflines instead of a gradient (03/04).
7. **Empty parchment fields** — spellbook, rest, shop, dialog lower halves (empty-space discipline, not placeholder per se).
8. **08:00 sky** — pure noon blue; the day-night system clearly works (dusk/night are the game's best looks), so morning missing its warm ramp reads as an oversight.

## Consistency — one artist's game?

Yes, convincingly. One flat-shaded, chunky-pixel sprite language across monsters, NPCs, and paperdolls;
one tan/gray/gold palette; one bitmap serif face everywhere from title to tooltips; parchment-and-stone
chrome on every screen; grounding shadows under every standing thing. The only internal tension is that
environments (timber facades, marble floors, brick) are a notch more detailed than the toy-figure
characters that stand in them — a hierarchy gap, not a style clash.

## Three highest-leverage remaining art fixes

1. **A face pass on the close-range humanoids** (bandit_boss, goblin_sham, apprentice, bandit): 3–4 px
   of eye/brow/mouth contrast per sprite. Monsters are judged nose-to-nose in this genre; this is the
   cheapest jump from "programmer-art" to "finished" the game can buy.
2. **Warm the fire and lamp light**: tint brazier/campfire/lamp lightmaps toward orange, add a visible
   warm pool on ground under night street-lamps, and delete the stray spark pixel. Dungeons instantly
   gain the Stonekeep mood the geometry already earns; night town gets its postcard shot.
3. **Kill the dead parchment**: enlarge spellbook rows into an actual two-column book with school
   ornaments, put a woodcut/illustration block on rest + dialog lower halves (or shrink those panels),
   and soften the midday horizon band into a 3–4 step gradient. This fixes the three weakest 2D grades
   at once.
