# First Impression — Target Device Judge (iPhone 14 Pro Max, landscape, thumbs only)

**Verdict: SHIP — 7/10**

Every beat of a first session — boot, chargen, walking, talking, questing, fighting, dying, looting,
equipping, resting, and resuming after a lock-screen reload — is completable with thumbs alone, at
locked 2.7 ms frames, with an exact-state Continue. What keeps it from 8+ is navigation friction
(touchy look-drag, no wall-slide, a misaligned town gate) and keyboard-era copy shown to a player
who has no keyboard.

Method note: all interaction was `page.touchscreen.tap` / CDP touch drags at CSS coordinates;
state was verified only via `window.__session`. The brief's `Engine.cssScale/offX/offY` is not
actually reachable in the shipped build (`const Engine` is closure-scoped, not on `window`), so the
game→CSS mapping was derived from the canvas bounding rect (offX=179, offY=0, scale≈0.8956).
Screenshots: `test/shots/panel_mobile/01…44`.

---

## Minute-by-minute diary

- **0:00** — `file://` load, playable title in ~2.7 s. Sunset castle, VINTAVIA, "New Game",
  "Sound: On", clear homage/disclaimer line. I know exactly what to do in under five seconds.
  Canvas is 4:3, pillarboxed: 573 of 932 CSS px used, big black bars left/right. (01_boot)
- **0:30** — New Game → "Create Your Party". Four member tabs, class list, +/- steppers with a
  point pool, Recommended, Begin. All comprehensible at a glance. (02)
- **1–3** — Thumb test: tapped the Aldric tab, tapped Archer (class changed everywhere, portrait
  and loadout updated live), tapped + on Accuracy three times — all three registered, pool
  12→9. The +/- targets are ~34×28 CSS px (below Apple's 44 pt) but every tap landed. (03, 04)
- **3:00** — Begin → the world. Beautiful MM6 layout: 3D viewport, sidebar, portraits, log. First
  hint reads "**talk to folk with Space**" — I am on a phone; there is no Space. The DOM joystick
  (bottom-left, clear of the notch) and Pack/Cast/Use/Attack pads (right margin, clear of the home
  bar) are self-evident, though nothing names the look-drag. (05)
- **3–6** — Learned controls by poking: stick up = walk, stick sideways = strafe, drag on the
  viewport = turn (~0.5°/px — fast). Overshot two turns and ended nose-into the smithy, then the
  town wall: full-screen beige texture, no slide, no feedback. (06–09)
- **6:00** — Tapped Map (M): clean town map, 8 letter-coded buildings with legend, red dot = me.
  Legend text is the smallest in the game — crisp at dpr3, borderline at arm's length. (10)
- **7–9** — Walked the main street east: lamppost, shop signs, fountain, sea at the far end, an NPC
  in the road. Tapped the person directly → **Training Hall** opens: Master Hult portrait, flavor
  text, per-PC tabs, Learn buttons. Tap-to-talk with no tutorial — it just worked. (11–13)
- **8–9** — "Talk — work!" → topic list → "Wolf Cull" → **Accept the task** (green). Log prints
  "Quest accepted: Wolf Cull"; Quest Log shows Master Hult — 0/3 fangs. Dialog rows are big,
  thumb-perfect. (14–18)
- **9–11** — Headed for the east gate; a goblin was loitering in it. It aggroed first: "Goblin hits
  Roderic for 1." I mashed Attack six times — **nothing**, because the goblin was chewing on us
  from outside my facing cone (log stayed silent, no miss/cannot-reach at that point, screen fully
  red-stippled, attacker off-screen). Turned 90°, then one Attack tap swung the whole party;
  goblin died (+19 xp each). **Tapped the corpse → "Searched the goblin: 2 gold."** One-tap loot,
  lovely. (20–26)
- **11–14** — The gate saga: walking east on the road dead-stops at the wall (x pinned at 64.7).
  Use does nothing. The actual opening is ~2.5 tiles **north of the road centerline** (y≈37, road
  at y≈39.5); with no collision-slide to funnel me in, I probed blind for ~3 minutes. (27–32)
- **14–15** — 10 seconds north of the gate: a **bandit camp** — campfire, tents, chest, five
  bandits including a 55 hp boss, "Bandit 23/23" nameplate. Great vignette, lethal placement. My
  melee got "cannot reach!" against an adjacent off-facing bandit, Serena hit 0, my 180°-flee drag
  wasn't fast enough: **party wipe**. And then the game's best moment: *"You wake at the temple,
  weak but alive. The Light kept a tithe of 20 gold. (Autosaved. Your manual save is untouched.)"*
  Forgiving, in-fiction, and it tells me my saves are safe. (33–36)
- **15–16** — Rest (R) → "Make Camp" ("The road is no inn — beasts prowl at night") → Rest 8 hours
  → full HP, clock to 01:35, night sky outside. (37, 38)
- **16–18** — Pack pad → full MM6 paperdoll (Wpn/Off/Arm/Helm/Feet/rings/neck), skills, stats,
  backpack grid. Tapped the equipped sword → unequipped (Attack +2→+1, Dmg 1d6+2→1d2+2 updated
  live). Tapped it in the backpack → item card ("Short Sword, Damage 1d8") with **Equip/Drop** →
  Equip worked. Two-tap flow, no drag needed. (39–42)
- **18–20** — Lock-screen sim: `page.reload()` → title now shows **Continue — "autosave ·
  Roderic's company, L1 — Day 2, 01:34"**. Tapped it: position, map, gold 182, Wolf Cull active,
  19 xp, equipped sword, full HP — byte-identical to my pre-reload snapshot. Log greets with
  *"The chronicle resumes — Vintavia Coast."* Portraits show sleepy night faces. (43, 44)

---

## Findings by severity

### High
1. **Bandit deathtrap on the first quest vector.** The Wolf Cull quest says "north forest"; the
   first thing 10 seconds north of the east gate is a 5-bandit camp with a boss that wipes a
   level-1 party in under a minute. Death handling is graceful enough that it isn't a rage-quit,
   but the first 20 minutes shouldn't funnel a new player into it. Move the camp deeper, or leash
   its aggro.
2. **Melee facing with no assist.** Adjacent enemies outside the facing cone produce silent
   nothing or "cannot reach!" while they hit you freely — six wasted Attack taps while being eaten
   from off-screen. On touch, add auto-face-nearest on Attack, or make tapping an enemy attack it
   (tapping already targets/talks, so players will try it).
3. **East gate misaligned with the road + no collision slide.** The road dead-ends into wall; the
   opening is offset north. Cost ~3 minutes of blind probing. Align the gate with the road, or add
   wall-sliding so movement funnels into gaps. (Wall-sliding would also fix most of the
   face-in-texture moments below.)

### Medium
4. **Keyboard copy on a touch device.** "Talk to folk with Space", "Use (Spc)", sidebar "(Q) (B)
   (M) (R) (Esc)" hotkey suffixes. Detect touch and swap the strings — the first hint should say
   "tap people to talk".
5. **Look-drag sensitivity** (~0.5°/CSS px, no smoothing) overshoots small corrections; combined
   with #3 I spent five separate moments staring at full-screen wall texture in 20 minutes.
6. **No movement feedback on collision** — dead stop, no bump sound/nudge; at phone size a
   full-viewport beige wall reads as "did the game freeze?"
7. **Bottom canvas buttons (Attack (F) / Cast (C) / Use (Spc) / Pack (I)) sit in the home-indicator
   zone** (~y 405–430 CSS, bottom center). They're duplicates of the DOM pads so nothing is lost,
   but taps there risk the system gesture; consider hiding them on touch.

### Low
8. **Text size at arm's length**: canvas-space pixel font lands at ~8–10 CSS px for the log,
   sidebar hints, and map legend. dpr3 keeps it razor-crisp (I vision-read every screenshot without
   ambiguity), but on the physical device it demands a focused look; the map legend and chargen
   "points left" line are the borderline cases. +20% on log text would do it.
9. **Chargen +/- steppers** ~34×28 CSS px, under the 44 pt guideline (accuracy was still 100% in
   this session).
10. **Pillarboxing**: 359 of 932 px are black. The margins are smartly used as control space, so
    this is a defensible retro choice rather than a defect.
11. **~1 h of in-game clock** (idle time after the last autosave) rolled back on reload; no
    meaningful state was lost.
12. **Harness nit**: `Engine` isn't on `window` in the dist build, so the documented
    `Engine.cssScale/offX/offY` probe is unusable; only `__session`/`__game` are exposed.

### Delights
- Tap-to-talk and tap-to-loot directly on world objects, no mode switching.
- The temple-wake death loop: in-fiction, forgiving, and "(Autosaved. Your manual save is
  untouched.)" is exactly what an anxious player needs to read.
- Color-coded log (red damage, green kills/quest text), portraits that wince when hit and doze at
  night.
- Continue button labeled with company, level, day, and time; "The chronicle resumes" on load.
- The bandit camp as a set piece — campfire, tents, chest, archers among trees — genuinely evoked
  MM6's "oops, wrong neighborhood" thrill (even as it killed me).
- Performance: frameAvg 2.68–2.77 ms during the 5-enemy fight, renderScale pinned at 1.0. It never
  once felt heavy.

**Bottom line**: SHIP, 7/10. The full first-session loop is thumb-complete and save-safe; spend the
next patch on facing assist, wall-slide + gate alignment, touch-aware strings, and pushing that
bandit camp back.
