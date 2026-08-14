# Shipping panel — round 1 disposition

| Judge | Verdict | Score |
|---|---|---|
| Technical QA | SHIP | 8.5 |
| First impression (iPhone 14 Pro Max landscape, thumbs only) | SHIP | 7 |
| Genre veteran | NO-SHIP | 6 |
| Aesthete | NO-SHIP | 6 |

Every finding was fixed, verified, and shipped before round 2:

## Veteran (all four critical legs repaired)
- **Turn-based deadlock** — root cause: recoveries only tick during sim time, so a
  drained budget froze the mode. An attack order now always grants a full round
  (up to the slowest hero's recovery). Verified by repro probe: 16 consecutive TB
  orders now progress the fight.
- **Shop purchases ignore the tab** — giveItem now routes to the active
  (tab-selected) hero first.
- **No item transfer** — inventory gained a Give ► button (hands to the next hero).
- **"Item dupe"** — investigated with a 400-operation randomized conservation
  probe (equip/unequip/give/sell, including double-tap flurries): zero
  violations, gold delta fully accounted by sales. The "phantom copy" was the
  knight's STARTER padded armor plus the bought copy — two legitimate items.
  No dupe exists; disposition: not-a-bug, worth re-checking in round 2.
- Monsters can no longer melee through closed doors (line-of-sight required).
- Poison/disease now state their rules when first inflicted.
- Quiet Roads copy states camp-only credit. Tabs unified at x=150 on all screens.
- Chargen +/- announce limits and the 2-point cost.

## First impression
- Melee facing assist (adjacent foes auto-faced), tap-to-attack near monsters,
  3-cell-wide gates aligned with roads, touch-aware intro copy, look-drag
  sensitivity 0.008→0.0055, log text 9→11px, harness singletons on window.

## QA
- Quest items indestructible (chests demand pack room; corpses stay lootable),
  stair-hint throttle fixed, hostile v3 saves schema-checked with rollback,
  favicon 404 silenced.

## Aesthete
- Checkerboard haze → pale-lift fog with solid far band; per-cell light seams
  blurred; ground shadows under all beings; hood faces with glint eyes + mouth;
  torso rim softened; crest watermark fills parchment; keeper/dialog portraits
  at 2x; spell-school gems; stitched/strapped armor icons; auto-zoom automap;
  "Heading" replaces the P-reading "Facing"; defeat camera faces the plaza;
  ragged cloud edges; sun-safe cloud placement; facade variety (two timber
  types); coffered vault ceiling; height-varied trees.
