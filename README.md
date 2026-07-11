# Milo

The classmate you have to teach. A synthetic 11-year-old with real misconceptions; the
student proves understanding by teaching him. A hidden strict evaluator tracks which
confusions the explanation actually resolved, and the teacher gets misconception-level
evidence with verbatim quotes.

Hackathon: Reinvented Education (TAL × EverMind). Track: Adaptive Evaluation Engines.

## Read in this order
1. `CLAUDE.md` — architecture invariants + build loop (Claude Code reads this automatically)
2. `PRD.md` — product, demo script, scripted explanations, compounding story, risks
3. `ISSUES.md` — the work queue, top to bottom

## Tonight (do not skip)
- Fill `packs/learners.json` from the EverMind "How to play" data pack (5 learners).
- Get Butterbase + EverOS accounts; dry-run the Butterbase MCP submission.
- Put a Butterbase `ai:gateway` key in `.env` (copy `.env.example`), then
  `node eval/run_eval.mjs` until it prints ALL PASS. This gates everything. If it
  won't go green in 3 prompt edits, flip to the two-call fallback tonight, not tomorrow.

## Kickoff prompt for Claude Code (paste at the event)
> Read CLAUDE.md, PRD.md, ARCHITECTURE.md, and ISSUES.md. Confirm the eval harness is green by running
> `node eval/run_eval.mjs`; if not, fix prompts/turn.md via /eval-loop first. Then work
> ISSUES.md top to bottom starting at Slice 1. Route all Butterbase access through
> src/lib/backend.js and all EverOS access through src/lib/memory.js. After any change to
> a prompt or pack, re-run the harness before continuing. Deploy at the end of Slice 1
> and keep it deployable. Stop and show me after each slice.

## The one thing that makes this real
Milo's understanding is explicit state gated by a hidden evaluator, not model vibes.
He cannot be sweet-talked. Every resolution carries a quote. That is the trust story,
the assessment product, and the demo. Protect the eval harness above all else.

## Env
- Node 18+ (uses global fetch). `BUTTERBASE_API_KEY` (scope `ai:gateway`) in `.env`
  for the eval harness; serverless functions use their own injected Butterbase creds.
- Model: `anthropic/claude-sonnet-4.6` via the Butterbase AI gateway. No Anthropic key
  anywhere — usage bills Butterbase AI credits. See ARCHITECTURE.md.
- No git yet: repo gets initialized and pushed at the event (2026-07-11).
