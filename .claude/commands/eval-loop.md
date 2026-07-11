# /eval-loop

Run the evaluator gate and fix failures without weakening the test.

Steps:
1. Run: `node eval/run_eval.mjs` (reads `BUTTERBASE_API_KEY` from `.env`; calls the
   Butterbase AI gateway — each full run spends ~$0.25 of Butterbase AI credits)
2. If it prints ALL PASS, stop and report the pass count. Do not touch prompts.
3. If any case FAILS:
   - Read the failure lines. Classify each: (a) evaluator too lenient — resolved
     something it shouldn't; (b) evaluator too strict — missed a required resolve;
     (c) evidence_quote not verbatim; (d) Milo leaked evaluator vocabulary; (e)
     non-monotonic state.
   - Edit ONLY `prompts/turn.md` to fix the root cause. Never edit `eval/cases.json`
     to make a case pass. Never delete a failing case.
   - For leniency: tighten the MECHANISM STANDARD wording and the "NEVER RESOLVES"
     list. For leaks: strengthen the HARD BANS list. For quote failures: re-emphasize
     the verbatim-substring requirement.
4. Re-run. Repeat up to 3 times.
5. If still failing after 3 iterations on leniency or leaks specifically, switch to the
   two-call fallback described at the bottom of `prompts/turn.md` and CLAUDE.md, then
   re-run. Report that you switched and why.

Never report success unless the harness actually printed ALL PASS on the final run.
