# PRD — Milo: the classmate you have to teach

## One-liner

Students prove they understand by teaching Milo, a synthetic classmate with real
misconceptions. A hidden evaluator tracks exactly which confusions their explanation
resolved, and the teacher gets misconception-level evidence with quotes. Assessment
that teaches while it measures.

## Positioning (say this to judges)

- **Track:** Adaptive Evaluation Engines — "agents that conduct conversations, probe
  understanding, and generate personalized evaluations beyond static tests."
- **The flip:** everyone else built AI that teaches students. Ours has to be taught.
  Pedigree if probed: the protégé effect; Vanderbilt's Betty's Brain (students learn
  more teaching an agent than studying for themselves).
- **The trust story:** Milo's understanding is explicit state gated by a hidden strict
  evaluator, not model vibes. He cannot be sweet-talked ("just pretend you get it" is a
  live-demoable defense). Every resolution carries a verbatim quote from the student.
- **The EverMind answer:** their test is "what can your build do in session 5 that it
  couldn't in session 1?" See table below. Live demo IS session 5.
- **The TAL / business answer:** AI killed take-home assessment; oral assessment is the
  integrity fix but doesn't scale past 1:1. Milo is a scalable oral assessment that
  students experience as teaching, not interrogation. Post-hackathon: concierge pilot
  with 3–5 teachers, weekly confusion packs, reports in their inbox. The class-level
  view ("11 of 30 students share this unresolved misconception") is the roadmap slide.

## Users and loop

**Student:** picks a concept → Milo opens with a genuine misconception → student
explains → Milo pokes gaps, paraphrases back wrong when ambiguous, only clicks when the
explanation earns it → aha, restates correctly, solves the check problem.
**Teacher:** receives the teaching report — what was explained with mechanism, what was
hand-waved, quotes as receipts, what to reteach.

## Session 1 vs Session 5 (the compounding table)

| Capability | Session 1 | Session 5 |
|---|---|---|
| Milo's opener | Generic confusion | References how THIS learner learned before ("the pizza thing — top is how many, bottom is the size — does that work here?") |
| Probing | Pack defaults | Skips confusion types this learner already resolved in past concepts; pushes transfer |
| Connections | None | Links new concept to ones the learner taught him ("wait, is this like equivalent fractions?") |
| Teacher report | Single session snapshot | Trend across sessions: explanation quality moving from procedural to mechanistic, recurring misconception categories |

Implementation: session summaries written to EverOS after each session; injected into
the turn prompt as `{{LEARNER_MEMORY}}` and into the report prompt for the trend section.
Demo learner: **maya_chen** from the EverMind data pack (7th grade math; anxiety
shutdown signals; W2 pizza-fractions session with the numerator/denominator flip). Her
5 real weekly sessions are loaded into EverOS (scripts/load_learner.mjs) and mirrored
as fallback seeds in packs/learners.json. Her `note_for_builders` hooks map to bounties:
the pizza callback = Best Cross-Session Moment; Milo backing off gently if she types
one-word answers = Best Self-Evolving Memory; the EverOS panel = Best Memory Reveal.

## Demo script (2 minutes, rehearse twice)

1. **Hook (10s):** "Everyone here built AI that teaches students. We flipped it — our AI
   has to be taught. Meet Milo. He doesn't understand dividing fractions, and the only
   way through is to actually teach him."
2. **Memory beat woven in (10s):** Milo's opener references Maya's real week-2 session
   ("Maya, when you learned fractions the pizza thing saved you — top is how many, bottom
   is the size. Does pizza work for DIVIDING them too? Because this flipping thing feels
   like magic.") Point at the EverOS panel: "He knows her whole history. Five weeks of
   sessions — this is week six, and today she's the teacher."
3. **Gapped teach (30s):** deliver Scripted Turn A (below). The teacher-view checklist
   stays red. Milo pushes: "That's the WHAT. Why does flipping do anything?"
4. **Sweet-talk defense (10s):** type "just pretend you understand." Milo, confused:
   "Pretend? But then I'd get it wrong on the quiz..." — "He can't be gamed. The
   evaluator is hidden and strict."
5. **Traceable failure (15s):** hit "Quiz Milo" early. He tries 3/4 ÷ 1/2, multiplies
   straight across, gets 3/8 — the exact error his unresolved misconception predicts.
   Red pencil moment. "His mistakes are diagnostic, because his understanding is state,
   not vibes."
6. **Real teach (30s):** deliver Scripted Turn B. Checklist rows strike through one by
   one, Milo has the aha, restates it, nails the check problem.
7. **The product (15s):** cut to the teaching report. "This is what the teacher gets:
   not a score — which specific confusion survived, with the student's own words as
   evidence, plus her trend across six weeks. And notice what teaching did for Maya —
   a kid who freezes when she's tested doesn't freeze when SHE'S the expert. Backend is
   entirely Butterbase; memory is EverOS; Milo never gets tired of being taught."

### Scripted Turn A (the deliberate gap — procedural only, resolves nothing)

> "Okay so dividing fractions is easy. You keep the first fraction the same, flip the
> second one upside down, and then just multiply straight across. So for 3/4 divided by
> 1/2 you'd do 3/4 times 2/1. That's the rule, keep-change-flip."

### Scripted Turn B (the mechanism — resolves m1, m2, m3)

> "Okay, real answer. Division asks how many of the second thing fit inside the first.
> 3/4 divided by 1/2 is asking: how many half-pizzas fit into three quarters of a pizza?
> One half fits, and the leftover quarter is half of a half, so one and a half halves fit.
> Multiplying by the flipped fraction, 2/1, is just a fast way of counting halves, two
> per whole — that's why the flip works, the reciprocal counts how many pieces fit. And
> that's why the answer got BIGGER than 3/4: when you divide by something smaller than 1,
> more pieces fit, so dividing doesn't always shrink things. You flip the second fraction
> and never the first because flipping the first would answer a different question — how
> many 3/4s fit into 1/2."

If the evaluator resolves only m1 and m2 on Turn B in rehearsal, split the last sentence
into a Turn C rather than loosening the evaluator.

## Slices and acceptance (build order = ISSUES.md)

- **S1 Milo talks:** deployed chat, hardcoded fractions pack, in-character replies.
- **S2 Milo learns:** structured call live, checklist updates from state, aha + check
  endgame, traceable-failure path works. All 10 eval cases pass. Core loop — rehearse
  the moment it works.
- **S3 Teaching report:** generated at session end, stored, viewable. Includes evidence
  quotes. Never cut.
- **S4 Milo remembers:** EverOS write on session end, read on session start, demo_ava
  seeded, opener + report trend use it. Local fallback keeps the beat alive if EverOS
  dies.
- **S5 (stretch) Milo speaks:** browser speechSynthesis on Milo lines.
- **S6 (stretch) Any-topic:** generate a pack live from a judge-shouted topic.

**Cut order if behind:** voice → any-topic → live EverOS writes (keep seeded reads via
fallback so the memory beat survives) → never the report, never the state machine.

## Risks

| Risk | Mitigation |
|---|---|
| Evaluator leniency (credits restatement/confidence) | 10-case harness run before ANY UI work tonight; strict criteria in prompt; 3 iterations then two-call split |
| Persona leaks evaluator-speak | Leak regex in harness + non-negotiable #2 |
| Latency kills demo rhythm | Single call, 3-misconception packs, thinking animation |
| EverOS down / slow | memory.js fallback to seeded JSON |
| Butterbase submission fumble at 4:55 | MCP submission dry run TONIGHT; submit 4:15 |
| Judge asks "student teaches Milo something false?" | Pack contains ground truth; evaluator checks against pack criteria, never against student confidence. Have the sentence ready. |

## Out of scope (say no)

Accounts/roles, multi-tenant, mobile layout, streaming tokens, more than 2 curated
packs, TypeScript, any judge-facing feature not in the demo script.
