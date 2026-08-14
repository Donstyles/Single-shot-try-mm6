# Mobile critique — cycle 1

Device target: iPhone 14 Pro Max landscape (932×430 CSS px, dpr 3, safe-area L/R ≈59px).
Method: Playwright chromium (`/opt/pw-browsers/chromium`), `isMobile:true, hasTouch:true`, iOS UA, real
`touchscreen.tap` + dispatched TouchEvents against `dist/index.html`. Screenshots in `test/shots/mobile/`.

Bar: fully playable one-session experience with thumbs, controls ≥ 9mm (~34pt / 44 CSS px),
nothing under the notch, 60fps.

---

## Findings

### 1. BLOCKER — Inventory is unreachable by touch
A thumb-only player can never open the inventory: `press('inventory')` is bound only to keyboard `I`
(`BINDINGS` in src/09_game.js). The HUD offers Quests / Spells / Map / Rest / Turn-Based / Menu on the
right panel and Attack / Cast / Use at the bottom — no Inventory. Tapping a portrait only sets
`Game.activePc` (src/08_ui.js `drawHUD` tapRect), and the Menu screen has only Save/Load/Sound/Help/Quit.
- Evidence: enumerated all `UI.hit` rects in play state — 13 rects, none opens `invScreen`. Portrait tap
  left `screen:null`; only `Game.press('inventory')` (keyboard path) opened it (shot `13_inventory.png`).
- Impact: cannot equip looted/bought gear, drink potions, eat bread, inspect stats → the "one-session
  experience with thumbs" fails at the first shop or potion.
- Suspected fix location: src/08_ui.js `drawHUD` (add an Inventory button to the right panel or make
  portrait tap open inventory / second tap opens it), or src/09_game.js touch pad row.

### 2. MAJOR — Nearly all on-canvas tap targets are below the 44 CSS px bar
`Engine.cssScale` at 932×430 is 0.896, so canvas-space buttons shrink below minimum touch size
(measured CSS sizes):
- Chargen +/− attribute buttons: **19.7×17.9 px** (22×20 game px) — 14 of them, the core of point-buy.
- Chargen portrait ◄/► and class buttons: h ≈ 19.7–21.5 px.
- HUD right-panel buttons (Quests…Menu): 130.8×**23.3** px.
- HUD bottom Attack/Cast/Use row: 62.7×**28.7** px.
- Inventory backpack cells / equip slots: **23.3×23.3** px; screen `Close` button: 64.5×**23.3** px.
Taps DO land (chargen point-buy worked via touchscreen.tap: might 14→16; Begin worked), but at ~5–6mm
physical size these are error-prone for thumbs. The DOM overlay pads are the only compliant controls.
- Evidence: `10_chargen.png`, `13_inventory.png`; sizes computed from `Engine.cssScale` × game-px rects.
- Suspected fix location: src/08_ui.js (bigger buttons / padded `UI.hit` rects — hit rects could be
  inflated ~8 game px beyond visuals with no visual change), src/05_engine.js `resize`.

### 3. MAJOR (fixed-by-test-correction) — none: Attack/Use/Cast DOM pads verified working
Initially the Attack pad appeared dead; root cause was the audit tapping while facing a *different*
distant goblin. Re-test against the spawned monster: 2 taps killed it ("Aldric hits the Goblin for 7",
"Goblin dies. (+8 xp each)"), Use looted the corpse ("Searched the goblin: 2 gold"). Cast correctly
shows the "no spell ready" toast for a spell-less knight (toasts bypass the log — fine).
Recorded here so the next cycle doesn't re-chase it.

### 4. MINOR — Baked font lacks several glyphs; UI shows "?" on real labels
`—` (em-dash), `−` (minus), `◄`, `►` all render as `?`, and `:` renders as `;`. In chargen the
**stat-decrease buttons are literally labeled "?"** and the portrait-cycle arrows are "? ?" — a first-time
player cannot tell what they do. Also "Roderic ? Knight", "Sound; On", "Gold; 200" everywhere.
- Evidence: `10_chargen.png`, `01_title_932x430.png`, `13_inventory.png`.
- Suspected fix location: src/06_art.js `bakeFont` (add glyphs or substitute ASCII `-`, `<`, `>` in
  labels in src/08_ui.js).

### 5. MINOR — Touch pads ignore the bottom safe-area (home indicator)
Joystick and buttons use `bottom:18px` / `bottom:18/76/134px` fixed (src/09_game.js `initTouchPads`)
without `env(safe-area-inset-bottom)` (≈21px in landscape on this device). The Attack button — the most
pressed control — sits inside the home-indicator gesture zone; accidental app-switcher swipes likely.
Left/right insets ARE handled (`env(safe-area-inset-left/right)+14px`), and the 179px pillarboxes keep
all canvas content clear of the notch — that part passes.
- Suspected fix location: src/09_game.js `initTouchPads` (`calc(env(safe-area-inset-bottom,0px) + 18px)`).

### 6. MINOR — Touch pads render on title/chargen where they are inert
`press()` early-returns when `state==='title'`, but the joystick + Attack/Use/Cast pads are created at
boot and stay visible over the title, chargen, and even the portrait letterbox (shots `01`, `05`, `10`).
Confusing affordance; hide them unless `Game.state==='play'` (and ideally while `UI.screen` is open,
where Attack/Cast/Use silently do nothing).
- Suspected fix location: src/09_game.js `initTouchPads` + a visibility hook in `UI.open/close`.

### 7. POLISH — Portrait orientation: sane letterbox but no rotate hint
At 430×932 the game letterboxes to 430×322 (scale 0.67) and remains functional — nothing breaks — but
322px tall is squint territory and the joystick floats in a black void (`05_portrait_430x932.png`).
A "rotate your phone" overlay in portrait would be cheap and kind.
- Suspected fix location: src/05_engine.js `resize` or a small CSS/DOM hint in build.js.

### 8. POLISH — Debug overlay nits
`?debug` overlay works: renders on load, COPY REPORT / REFRESH / CLOSE present, report includes UA,
screen/dpr, renderScale/frameAvg, storage, game state (`06_debug_overlay.png`). Two nits:
- `safe-area:` line reads CSS var `--sat` which is never defined → always blank (src/10_debug.js:55).
- CLOSE button is 62×32 CSS px, under the 44px bar it should itself model.

### 9. POLISH — Joystick nub center constant slightly off
`setJoy` uses `r.left+59` but the pad's border-box is 122px (118 + 2×2px border), center 61 — a constant
2px bias in the dead-zone math (src/09_game.js:107-108). Imperceptible; note for correctness.

---

## Verified-good (evidence)
- **Layout 932×430**: canvas 573.3×430 centered, pillarbox 179px both sides (> 59px inset → notch-safe),
  height 430 ≥ 400 bar. At 852×393: 524×393 centered, 164px pillarbox. (`01`, `04` shots; rects via
  `getBoundingClientRect`.)
- **Touch pads exist under hasTouch** (`'ontouchstart' in window` true in the Playwright iOS context):
  joystick 122×122, Attack/Use/Cast 90×52 CSS px — all ≥ 44px. Attack placed nearest the thumb corner.
- **Joystick moves the party**: dispatched touchstart/touchmove up → walked; full session walked 12 cells
  of path with joystick alone (`12_after_walk.png`).
- **Canvas look-drag**: horizontal touch-drag on right half of viewport → `Game.ang` +0.857 rad.
- **Thumb-only session**: title New Game tap → chargen (stat +2 via taps, Begin) → play → joystick walk →
  Attack pad kills spawned goblin → Use pad loots corpse. Only stuck point: inventory (finding 1).
  Close buttons on screens do respond to taps despite small size.
- **Performance**: 6 goblins active near player for 5s → `Engine.frameAvg` **5.15ms** (< 16ms bar),
  `renderScale` stayed 1 (adaptive fallback to 0.5 exists), JS heap 11.3MB. Note: host CPU, not an A16 —
  but the adaptive scaler plus 5ms headroom makes 60fps on-device plausible.
- **Audio unlock** wired to every pad/canvas touchstart (`Audio2.unlock()`), correct for iOS.
- **Viewport meta**: `viewport-fit=cover`, `user-scalable=no`, `touch-action:none`, overscroll disabled —
  correct mobile-game hygiene (build.js).

## Score: 6.5/10
Genuinely close: layout, DOM controls, joystick, look-drag, perf, and the debug overlay all pass.
Held back by the touch-unreachable inventory (breaks the one-session bar), sub-44px canvas UI
throughout menus/chargen, and the "?" glyph labels on functional buttons.
