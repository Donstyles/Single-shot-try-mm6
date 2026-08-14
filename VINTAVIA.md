# Vintavia

A complete first-person party RPG in the style of Might & Magic VI (1998) — an
original homage, not the trademarked game. One static HTML file; runs in mobile
Safari (iPhone 14 Pro Max landscape is the reference device) and desktop
browsers. Everything — art, portraits, music, sound, world — is procedural.
No external assets, no network calls, no WebGL (software raycaster; the WebKit
shader scar never gets a chance).

## Play

Open `dist/index.html` (or the published artifact link). Desktop: WASD/arrows
move, mouse-drag looks, F attacks, Space uses/talks, C quick-casts, T toggles
turn-based, I/B/Q/M/R/Esc open panels. Phone: left joystick walks, right pads
act, drag the view to look, tap portraits/panels for everything else.

## The game

- Party of four from six classes (point-buy chargen with a Recommended button)
- Real-time combat with a turn-based toggle; 17 monster types with corpses,
  loot, fleeing wounded, camp leashes, and a boss that summons at half health
- 27 spells across nine schools with real SP costs, tiers, and effects
- Eight town services with honest, rules-derived gold math; a Talk button on
  every keeper — four quest givers, six quests, one main chain
- Day/night cycle with dawn/dusk haze, fire-glow lightmaps, roaming monsters,
  ambushable rests (outdoors and in), trapped chests answered by the Disarm skill
- Three-level dungeon: Crypt → Catacombs → Vault, gated by a sigil, crowned by
  a Lich, exited by teleporter
- Separate manual/autosave slots — dying autosaves and never touches your
  manual slot; Continue always loads the newest save

## Development

```
node build.js              # concatenate src/*.js -> dist/index.html
node test/systems.test.js  # 2,800 pure-rules + world checks
node test/e2e.test.js      # 66 browser checks through human paths
node test/campaign.test.js # 23 checks: the full quest chain, start to victory
```

Architecture contract in `ARCHITECTURE.md`; the build doctrine that produced
this game is the repository README. Critique history (three specialist cycles
plus a fresh-eyes shipping panel, all vision-verified screenshots) lives in
`critique/`.

`?debug` on any build shows the on-device diagnostic overlay (renderer, timing,
storage, safe-areas) with a COPY REPORT button — field reports from real
devices feed the loop.
