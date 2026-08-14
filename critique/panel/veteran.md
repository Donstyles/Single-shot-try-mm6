# Veteran's Panel Review — "Vintavia"

**Reviewer:** MM3–MM8 lifer. Finished MM6 more times than I can count, still know where the
obelisks are. Fresh eyes on this build; judged `dist/index.html` exactly as shipped, played
through Playwright taps and keys like any player would.

## VERDICT: NO-SHIP — 6/10

Close. Genuinely close. The bones are MM6 to a degree I did not expect from a browser homage —
but three of the four load-bearing systems (turn-based combat, the shop/inventory loop, the
early difficulty curve) each have a defect I'd have phoned the magazine tipline about in 1998.
Fix the turn-based deadlock, the buy-target bug, and the item dupe, and this ships at 8/10.

---

## Session story

Built Tovan (Knight), Aldric (Archer), Serena (Cleric), Mireth (Sorcerer) by hand — never
touched Recommended. Spent all 12 points per character through the +/- buttons; the escalating
"+2" cost past stat breakpoints is a lovely MM6 touch. Tried to rename my Knight: the Name
button *cycles a preset list* (Roderic → Kara → … → Tovan). No typing. Tovan it was.

Morning one: talked to Smith Garron, bought a mace "for Serena" with her shop tab selected —
it landed in **Tovan's** pack, and there is **no way to hand an item to another character**
(Equip/Use/Drop only). Sold it back at 20g on a 75g purchase. Lesson learned about this
economy: the spread is brutal and the UI lied to me about who was buying.

Armored the Knight (padded + buckler), and in the process discovered the **item dupe**: after
a flurry of Equip-button taps, Tovan had Padded Armor equipped *and* a second, distinct copy
in his backpack. I sold the phantom copy to the mage guild for 8 gold. That's an infinite-money
printer if a player finds the rhythm.

The town itself is the best part. Eight services, all staffed, all voiced in one-line
character: Mayor Aldous hands out "The Stolen Ledger" through real dialogue topics; Father
Bren wants his censer back from the Crypt; Master Hult wants direwolf fangs; Ilsa at the
Gilded Griffin promises free beds for five goblin heads. Four quests in the log inside
twenty minutes, each with giver, description, and compass directions. "Any news?" produces
real foreshadowing — the Vault under the Crypt, the Crown of Vintavia, a pond that glows on
Freyday nights. This is the Sorpigal loop and it *works*.

Then I went west, and the game took its gloves off. The goblin camp is seven monsters —
warriors, a shaman — against a level-1 party. Mireth was unconscious in the second exchange.
Turn-based mode saved the moment ("Time waits for your command" — chef's kiss), Serena's
Heal Wounds auto-targeted the dying sorceress, and then the whole party got run down *while
fleeing* because goblins move exactly as fast as you do. Wipe #1. Woke at the temple, weak
but alive, 7 gold tithed, autosave separate from manual save — death handled with more grace
than MM6 ever managed, honestly.

Wipe #2 came from the same warrior chasing us into town ("Enemies are upon you — no rest
now!" — correct and cruel). Rested to full, pulled a lone goblin at night under a starfield
(the day/night cycle is real and gorgeous in its chunky way), and killed it clean with
Fire Bolt quick-casts. It didn't count for Quiet Roads — only the tagged western-camp goblins
do, and the game never says so.

The Crypt is a proper dungeon: pale ashlar, vaulted ribs, a red-eyed Crypt Spider looming out
of the dark. Killed a bat and two spiders, got two characters poisoned, met the turn-based
deadlock in earnest (below), got ambushed by a zombie at midnight that beat on us **through a
closed door while our swings couldn't reach it**, and wiped a third time with three "fading"
poisoned characters and 11 gold to my name against a 40-gold cure. Read the room, rested to
60%, went back in with Tovan carrying three unconscious friends, killed the zombie through the
now-open door (+68 xp), let the Knight solo a bat and spider like the old days, opened a
chest — "You find 19 gold" — and walked out the up-stair alive. 295 XP each, 30 gold,
one survivor standing. That is an authentic first-day-in-Enroth story, and I mean that as
a compliment and an indictment at once.

---

## Findings by severity

### Critical (ship-blockers)

1. **Turn-based mode deadlocks.** The TB action budget (`tbBudget`) hits 0 while the UI still
   says "— your move —"; F and C are then silently swallowed — sixteen consecutive inputs did
   nothing. Only toggling to real-time and back releases one action, then it re-stalls.
   Turn-based is a headline feature (T key, sidebar button, MM6's signature); as shipped it is
   unusable in any fight longer than two rounds. Real-time works fine.

2. **Shop purchases ignore the selected character tab.** Wares go to the *active* (HUD) PC even
   though the shop screen shows another character's tab highlighted and "Your goods — Serena's
   pack". Combined with:

3. **No item transfer between party members** (Equip/Use/Drop only — no give/trade), a
   cross-class purchase is simply stranded: sell it back at ~27% or shelve it. The core
   MM6 loop of outfitting a party from one purse is broken in both directions at once.

4. **Item duplication via Equip.** Padded Armor ended up equipped *and* present as a second,
   distinct object in the backpack after repeated Equip-button taps; the copy was sellable
   (verified: sold it for 8g). Exact repro is timing-sensitive but it occurred inside ordinary
   tap-driven play within my first hour. Economy-breaking once discovered.

### Major

5. **Early tuning is a meat grinder.** The first quest direction (west) points a level-1 party
   at a 7-strong camp with a 22hp warrior and a shaman; monsters match player run speed, so a
   failed engagement converts to a wipe rather than a retreat. I wiped three times in one
   in-game day. MM6's Sorpigal fed you stragglers first. The forgiving temple-wake keeps it
   *playable*, but new players will bounce.
6. **Poison spiral vs. gold curve.** Crypt spiders poison at 35%; cure costs 40g/head when
   poisoned-and-downed; three wipes left me with 11 gold and three fading characters. The
   systems are coherent (poison floors at 0 but never kills; rest restores 60%) — the game
   just never tells you poison can't kill you, so it *feels* like a death timer you can't
   afford to stop.
7. **Monsters attack through closed doors** while the party cannot reach back — the zombie
   chewed three characters to 0 through the west-wing door. Reach/line-of-attack asymmetry.
8. **Melee reach in real time is opaque.** Constant "cannot reach!" with no range indicator;
   out-of-range swings in real-time log nothing at all, so you can't tell a whiff from a
   dead input.

### Minor

9. Kill-credit for "Quiet Roads" only counts group-tagged camp goblins; identical goblins
   elsewhere give XP but no counter and no explanation.
10. Name button cycles presets instead of text entry; no portrait for the change either way.
11. "(cannot equip — skill untrained)" text is partially covered by the Drop button in the
    item panel.
12. Shop ware hitboxes are smaller than the drawn tiles; edge taps miss silently.
13. Automap is a bare grid-with-letters — functional, but nothing like MM6's map, and outdoor
    terrain (roads, the pond, the crypt outcrop) doesn't render on it.
14. Guild/temple/shop tabs sit at different x-positions per screen, so muscle memory taps the
    wrong character (this is how I paid 40g to cure the wrong ailment order).

---

## The three things that most make / break the MM6 fantasy

**MAKES IT — The town loop is real.** Eight named services, dialogue topics, rumors that
foreshadow the dungeon chain (Crypt → Catacombs → Vault → Lich → Crown), four quests in the
log with directions, skill-gated spell shopping ("beyond skill", "…12 more once these are
learned"), XP-gated training, a bank that protects gold from the death tithe, free beds for
quest work. Systems interlock exactly the way NWC's did. I checked the quest log after every
conversation out of habit and it never let me down.

**MAKES IT — Combat has the rhythm, when it runs.** Per-hero swings and recovery, "cannot
reach!", portraits that wince and slump, poison conditions with real economic consequences,
quick-cast C for the sorceress, Heal Wounds auto-finding the dying, night fights under
stars, TB's "Time waits for your command." For whole minutes at a time this *feels* like
MM6 — which is precisely why the TB deadlock is unforgivable rather than forgivable.

**BREAKS IT — The party isn't a party at the shop counter.** MM6's fantasy is four people
sharing one purse and one bag-of-holding logistics dance. Here the shop sells to the wrong
character, nobody can hand anybody a mace, the sell-back spread punishes the mistake, and an
equip dupe pays you for fumbling. Inventory is where a party RPG lives or dies, and this one
ships with all three legs of that stool cracked.

---

## Scoring notes

| Axis | /10 | Note |
|---|---|---|
| Chargen depth & fidelity | 7 | Real classes, real tradeoffs, stat-cost breakpoints; preset names hurt |
| Combat rhythm | 5 | Real-time genuine; TB deadlocked; reach opaque; door asymmetry |
| Stats/skills mattering | 8 | Equip gating, AC skill tiers, spell tiers, HP/SP per class all verifiably live |
| Economy honesty | 4 | Prices/spreads coherent, but buy-target bug + dupe + stranded items |
| System interlock | 8 | train→points→skills→spells→fights chain is all present and gated correctly |
| World legibility | 7 | Signposts, quest directions, rumors excellent; automap thin |
| Death & recovery | 8 | Temple wake, tithe, separate autosave, rest-to-60% — better communicated than MM6 |
| Atmosphere | 7 | Day/night, crypt gloom, chunky sprites, procedural everything — it has a *mood* |

**6/10. NO-SHIP** — but this is a two-week fix list, not a two-month one. Repair turn-based,
route purchases to the tabbed character, add a Give button, kill the dupe, and stagger the
goblin camp into pull-able groups, and 1998-me would have played this until the library
kicked me out.
