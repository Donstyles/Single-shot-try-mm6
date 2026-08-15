# The v2 single-shot prompt

A meta document: the prompt to hand a fresh agent that knows nothing — no repo, no conversation, no
prior build — plus the reasoning behind every clause in it, so the prompt can be edited without
quietly deleting a lesson that cost a night to learn.

The v1 prompt (in `README.md`) produced a complete, beatable, tested MM6-class game in one night. It
also produced a build the genre veteran scored **6/10**, because v1 asked for quality in adjectives
and had no mechanism for finding out whether it got any. Everything added below exists to close that
specific gap.

---

## Before you paste it

- **Environment network access must be set to Full or a Custom allowlist** if you want image
  generation. The default policy blocks everything except package registries, a `403` on CONNECT is a
  policy denial rather than a transient error, and the setting applies to *new* sessions only — an
  already-running session cannot be unblocked. Decide before starting.
- **Have the API key ready to paste, and expect to paste it again in every later session.** It is
  stored in the session scratchpad, which does not outlive the session. Use a spend-capped key and
  revoke it when the run ends.
- **Budget is the binding constraint, not capability.** A run like this consumes an enormous amount
  of output. Check your remaining allowance first; the prompt is written to checkpoint and hand off
  cleanly when it runs out, but it cannot manufacture budget.
- **Expect to be asked nothing and told the truth.** The prompt forbids the agent from grading its
  own aesthetics, and requires it to report the ceiling it actually reached rather than the one it
  was asked for.

---

## The prompt

Everything between the rules below is the prompt. Paste it verbatim.

---

> **Mission.** Build a complete, original, single-player party RPG in the mould of *Might & Magic VI:
> The Mandate of Heaven* (1998), shipping as one self-contained `dist/index.html` that runs in a
> phone browser in landscape with no network, no build step at runtime, and no external assets.
>
> **The bar is measured, not felt.** Ship when fresh vision judges, shown your screenshots shuffled
> with real MM6 screenshots, label them correctly no more often than chance. Any statement about
> quality that is not the output of a judge who did not build the thing is worthless — including
> your own. You may grade tests. You may not grade beauty.
>
> ### Order of construction — do not reorder
>
> This ordering is the single most important instruction here. Every stage exists to make the next
> one measurable.
>
> 1. **Harness first, before any game code.** A debug object on `window` that can teleport, change
>    map, set the clock, press keys, tap coordinates, grant items and gold, save, load, and dump the
>    full game state as JSON. Every later stage is driven through it. Build it first even though
>    there is nothing yet to drive.
> 2. **The judge before the art.** Write the canonical shot list — a fixed table of camera positions,
>    map, facing angle and clock time, one row per screenshot, each with a note on what that shot
>    must prove. Capture it from a pinned build into a per-round directory that is never overwritten.
>    Also stand up the discriminator: real reference screenshots shuffled with yours, judged blind by
>    a fresh agent. Without these, "better" is a feeling and every fix is a guess.
> 3. **Pure rules modules next**, with their test suite, before anything can see them: stats,
>    classes, skills, hit chance, damage, XP curve, spells, items, monsters, economy, rest, traps.
>    These are pure functions over plain data. No rendering, no DOM, no globals.
> 4. **World, engine, UI, game loop** — the glue. Glue calls rules. Glue never re-implements a
>    formula that a rules module owns; if you find yourself writing a second version of a damage
>    calculation, you have already made the mistake this line exists to prevent.
> 5. **Art production** as a planned run (see below), not an open-ended polish pass.
> 6. **Panels and discriminator rounds** until the measured bar is met or the budget is gone.
>
> ### Architecture law
>
> - **One owner per file.** If you fan work out to parallel agents, fan out on *files*, never on
>   *features* — features cut across files and two agents editing one file is not a merge conflict,
>   it is silent semantic corruption. When a feature spans owners, one agent writes the rule and the
>   others call it.
> - Write the module map, the canonical data shapes, the world units and the save schema into an
>   architecture document **before** writing the modules, and treat it as law afterwards. Every
>   ambiguity you leave in it becomes two incompatible implementations.
> - Pick one canonical shape per concept and never carry a second (one clock representation, one
>   currency field, one quest container). Duplicated state is the bug factory.
>
> ### Determinism law
>
> - All randomness comes from named, seeded streams from a central registry. World layout uses
>   layout streams; live gameplay uses persistent streams that are serialized into the save.
> - The same seed and the same input sequence must produce a byte-identical state dump. Write a test
>   that runs a scripted session twice and diffs the dumps; any difference is a bug you have not
>   found yet.
> - Nothing generated at build time may be non-deterministic. Generated art is produced once,
>   reviewed, committed as baked data, and merely embedded by the build.
>
> ### Testing law
>
> - Three suites: pure-rules unit tests; a headless-browser suite driving the real UI; and a
>   **campaign test that plays the game from character creation to the final boss and wins**, using
>   only actions a player could take — real doors, real dialogue, real purchases.
> - **A silent `catch` in a test is a lie, and so is a tolerance window.** A test that cannot fail is
>   not a test. Never swallow an error to make a suite pass; if a step can throw, the throw is the
>   finding.
> - Assert the things that softlock a player, not just the things that are easy to assert: every map
>   transition has valid destination coordinates, no destination lands on a return trigger, every
>   quest giver is reachable, no entity spawns inside geometry, every quest item survives a full
>   inventory.
>
> ### Renderer requirements
>
> A flat grid of full-height walls reads as *Wolfenstein*, not as MM6, and no amount of texture
> quality repairs that. The outdoor world must be a **heightfield**: terrain height sampled per
> point, marched per screen column, with buildings extruded from the terrain rather than standing on
> a plane. Get hills, ravines, rivers with stepped pools, a bounding mountain ridge, and an ocean
> that runs out into haze rather than showing you the edge of the map.
>
> A heightfield is single-valued, so bridges break it: a bridge deck and the ground beneath it are
> two surfaces over one point. Solve this once with a sparse per-cell **overhead span** — an interval
> of solid matter floating above the terrain — and you get bridges, gate arches, aqueducts and cave
> mouths from one primitive. Walk on the terrain when below the span, on the span when above it.
>
> Also required: variable building heights and roofs, distance fog that dissolves geometry into the
> sky, a painted sky that changes across the day, a torch radius indoors, and a horizon that shears
> for look-up/down rather than rotating.
>
> ### Art production
>
> - **Count the assets before making any.** Produce a bill of materials — every creature frame,
>   facing, portrait, icon, texture, prop and ornament the design implies. Expect several hundred.
>   Plan it as a production run with batch review gates.
> - **Creatures are pre-rendered 3D, because that is what 1998 actually did.** Build low-poly models
>   from primitives, light them with one fixed hard-key rig, render multiple facings and frames, and
>   quantize the output to the game palette. The fixed rig is what makes two hundred sprites look
>   like one art department.
> - **The palette is the great unifier.** One 256-index palette, structured as ramps so shading is
>   arithmetic on an index. Everything — rendered, generated, procedural — is quantized through it
>   before entering the build. Nothing enters as RGB.
> - **Approve one style anchor per class first** (one wall, one portrait, one icon), then generate
>   siblings against it. Never generate a class from independent prompts. Review each class as a
>   contact sheet: drift is invisible one asset at a time and obvious in a grid of twenty.
> - **Acceptance criteria — reject on any failure, regeneration is cheap and drift is not:**
>   palette-legal with transparency on exactly one index; readable at true on-screen size, not
>   zoomed; passes the silhouette test (fill it solid black — it must still be identifiable); lit
>   from the same direction as everything else; 1px dark outline on sprites; textures seamless across
>   a 3×3 tiling.
> - **If you use an image-generation API**, the key comes from the user and never touches the repo,
>   the logs, or an environment variable — a scratchpad file with tight permissions only, re-supplied
>   each session. Ask for a spend-capped key, give a cost estimate *before* spending, and tell them to
>   revoke it when you finish. Generate large and downsample; never ask for tiny images. Pass an
>   approved anchor image on every sibling request rather than re-describing the style in words —
>   that is what stops a class from drifting. Quantize every result through the palette, commit the
>   quantized data, and keep generation out of the build: it is not deterministic and the build must
>   be. Never send reference material you do not own to a third-party API.
> - **Set a hard size ceiling for the single file and test it.** Raw index arrays are enormous —
>   encode sprites (run-length or indexed PNG embedded as base64) before any bulk render run, not
>   after. Discovering the payload problem on a phone at the end costs the whole art pass.
>
> ### Review machinery
>
> - After each build round, spawn **fresh agents with zero project context** to judge it: a veteran
>   of the genre, a first-time player, a QA hunter, and an art critic. Give them the build and the
>   shot list; give them nothing about your intentions. An agent that knows what you meant to build
>   grades your effort instead of your result, which is worse than useless.
> - **Every finding gets a written disposition** — fixed, rejected with a reason, or deferred with a
>   reason. Undisposed findings evaporate and return three rounds later.
> - **Verify every fix on screen**, not in the diff. A fix that exists only in code review is a claim.
> - **Reproduce before you repair.** Agents report bugs that are not there. Write a probe that
>   measures the claim — count every item in the world before and after four hundred operations
>   before you believe an item-duplication report.
> - Run at least two panel rounds. Round two finds what round one's fixes broke, and it will.
>
> ### Definition of done — three verdicts, never one
>
> 1. **Systems**: all suites green, the campaign test wins the game, the determinism diff is clean,
>    and the veteran reports no defect that would have made them stop playing.
> 2. **Presentation**: discriminator accuracy approaches chance, and the tells judges still name are
>    aesthetic preferences rather than structural ones. "The trees repeat" is a fix; "this is a
>    raycaster" is a failure.
> 3. **Volume**: enough regions and dungeons that a player can get lost. No screenshot measures this,
>    which is exactly why it will be the axis you quietly skip. Commit to a number at the start.
>
> A single verdict lets the strong axis hide the weak one. Report all three separately, always.
>
> ### Budget and honesty
>
> - Decide your round count up front. Commit and push at every round boundary — a round that ends
>   without a commit may not have happened.
> - Maintain a handoff document from the first hour, current enough that a fresh session with no
>   memory of yours loses nothing but conversation. Include the repo map, the commands, the
>   scars you have already paid for, and the ordered backlog.
> - **When you reach a ceiling, say so plainly and early, with the measurement that shows it.** Do
>   not present a build as meeting a bar it does not meet. An honest "the systems are done, the art
>   is at roughly two-thirds, here is the judge's score and the three tells they named" is worth
>   more than a confident claim that collapses the moment someone looks at the screen.

---

## Why the prompt is shaped this way

**It leads with a measurement, not an adjective.** Every escalation of "make it perfect", "everything
must be wow", "10/10 on every agent" produced no change in output, because none of them told the
builder how to find out whether it had complied. "Ship when blind judges do no better than chance" is
an instruction that can be followed. This is the single highest-value edit over v1.

**It puts the harness and the judge before the game.** Both feel premature and both are the cheapest
they will ever be at that moment. The harness makes every later stage scriptable rather than
hand-driven; the shot list makes every later round comparable to the last. Building the judge after
the art means the art was made blind.

**It states the ordering as non-negotiable** because in practice the ordering *is* the method. The
temptation is always to build the exciting part first and instrument later, and the cost is that you
cannot tell whether you improved anything.

**It forbids self-grading explicitly**, because a builder cannot see its own work freshly — not from
vanity, but because it knows what everything was supposed to be and reads intent into what is
actually on screen. Zero-context judges are the only correction, and the harshest of them is worth
the most.

**It bans silent catches by name.** The worst defect in the v1 build — a portal with no destination
coordinates that softlocked the game — stayed invisible for hours because a test caught and discarded
the exact error that would have revealed it. That single line of defensive code hid a
game-breaker through an entire critique cycle.

**It counts the art before making it.** "Polish the visuals" is unboundable and therefore never
finishes. "Three hundred and forty sprite frames, twenty-four textures, thirty portraits, in batches
with a review gate per batch" is a plan with an end.

**It demands three verdicts** because presentation, systems and content volume fail independently,
and a single number always reports the best of them.

**It ends on honesty** because the most damaging moment of the v1 run was not a bug. It was handing
over a link described as finished, to someone who then looked at it. Every hour after that was spent
re-establishing trust rather than building.

## What to realistically expect

One shot will not produce a perfect MM6, and a prompt that promised otherwise would be the problem it
claims to solve. What this prompt reliably buys, on the evidence of the v1 run plus everything above:
a complete and genuinely beatable game with sound systems, a real test suite, and an honest,
*measured* account of exactly how far short of the bar the presentation falls and why.

The parts that stay hard are not the parts prompting fixes: asset volume at consistent quality,
content volume, and the last tenth of the renderer where each remaining tell costs more than the one
before it. Plan for a second session, and make the handoff document good enough that it starts at
full speed.

## How to intervene mid-run

- If it reports a score, ask **who judged it and whether they had context.** A high score from a
  briefed judge means nothing.
- If it says "polished" or "AAA" or "wow", ask for the shot ids and the tells. Adjectives are a
  symptom that the measurement loop has been skipped.
- If it has been building for a long time without a commit, tell it to checkpoint. Uncommitted work
  is work that may not survive.
- Do not raise the bar by repeating it louder. Change the *method* instead: ask for another judge,
  another shot, another probe.
