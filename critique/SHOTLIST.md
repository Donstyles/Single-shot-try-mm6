# Canonical shot list

The fixed set of captures every critique and discriminator round uses. **The shots never change.**
Same camera, same seed, same clock — so a difference between rounds is a change we made, not a
frame we got lucky with. Adding a shot is fine; editing or removing one invalidates comparison
against every earlier round, so don't.

Capture with Playwright headless Chromium (`executablePath:'/opt/pw-browsers/chromium'`), viewport
`844×390` (iPhone 14 Pro Max landscape) unless the round is explicitly desktop. Drive with the debug
harness, one shot per page load or with a settle frame between:

```js
__game.gotoMap(map, x, y); __game.teleport(x, y, ang); __game.setTime(t);
```

Write to `critique/shots/<round>/<id>.png`. Never overwrite a previous round's directory.

`ang` is radians, `0` = +X (east), `-1.5708` = north, `3.1416` = west, `1.5708` = south.
`t` is minutes since midnight (720 = noon, 1380 = 23:00).

★ marks the **core eight** — the fast subset for cheap iteration rounds. Full list for panel and
discriminator rounds.

## World shots

| id | map | x | y | ang | t | what it must prove |
|---|---|---|---|---|---|---|
| ★ s01_plaza_noon | outdoor | 41.5 | 39.5 | 0 | 720 | town plaza + fountain: facade variety, crowd, midday palette |
| s02_main_street_morn | outdoor | 33.5 | 37.5 | -1.5708 | 540 | shopfronts, hanging signs, long street perspective |
| ★ s03_gate_east_dusk | outdoor | 68.5 | 37.5 | 3.1416 | 1140 | town wall from outside at warm hour — **gate arch** shot |
| ★ s04_road_east_noon | outdoor | 75.5 | 38.5 | 0 | 720 | open wilderness. **The terrain shot.** Today: flat horizon at mid-screen. This is the one to beat. |
| ★ s05_crypt_gate | outdoor | 81.0 | 40.5 | 0 | 900 | dungeon entrance — **cave mouth** shot, braziers, cliff face |
| s06_bandit_overlook | outdoor | 70.5 | 20.5 | -1.5708 | 780 | camp at distance: tents, sprites at range, haze falloff |
| s07_shrine_south | outdoor | 51.5 | 73.5 | -1.5708 | 1020 | landmark + tree density + long sightline |
| ★ s08_town_night | outdoor | 45.5 | 42.5 | -1.5708 | 1380 | night palette, lamp and brazier glow, torch radius |
| s09_dawn_road | outdoor | 60.5 | 30.5 | 0 | 330 | dawn ramp — the light transition MM6 is remembered for |

## Dungeon shots

| id | map | x | y | ang | t | what it must prove |
|---|---|---|---|---|---|---|
| ★ s10_crypt_entry | dun1 | 3.5 | 2.5 | 0 | 720 | first indoor frame a player ever sees |
| ★ s11_crypt_corridor | dun1 | 9.5 | 9.5 | 0 | 720 | long corridor: torch falloff, wall tiling, depth |
| s12_catacomb_hall | dun2 | 8.5 | 8.5 | 0 | 720 | open hall, multiple sprites, ceiling read |
| s13_vault | dun3 | 5.5 | 2.5 | 0 | 720 | endgame room: pillars, boss door, marble |

## UI and moment shots

| id | state | what it must prove |
|---|---|---|
| ★ s14_combat | turn-based active, party mid-swing, 2+ monsters visible | the frame a screenshot judge is most likely to be shown |
| s15_charsheet | character sheet, PC 1 | stat block density and typography |
| s16_paperdoll | inventory with a fully equipped PC | paperdoll art, item icons |
| s17_shop | weapon smith, wares list open | the shop frame — heavy UI ornament |
| s18_spellbook | spellbook, fire school | school gems, sigil page art |
| s19_automap | automap outdoor, zoomed to town | map rendering |
| s20_title | title screen | first impression, vista art, logotype |

## Rules for using it

1. Capture from a **pinned build**. Note the commit SHA in the round directory.
2. Capture the whole list *before* reading any of it. Judging as you capture biases the fix list.
3. Every round's findings must name shot ids. "The outdoors feels flat" is not a finding;
   "s04: the horizon is a dead level line at exactly mid-screen" is.
4. Diff against the previous round on the **same id**, side by side, before declaring progress.
