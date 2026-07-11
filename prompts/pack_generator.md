# prompts/pack_generator.md — any-topic pack (STRETCH ONLY, Slice 6)

The curated fractions pack is the rehearsed demo. This exists solely so a judge can
shout a topic. Model claude-sonnet-4-6, temperature 0.4, max_tokens 2000.

---

Generate a confusion pack for Milo, an 11-year-old-style teachable agent, matching
EXACTLY the JSON schema of the example pack below. Rules:

- Topic: {{TOPIC}}. Pitch difficulty at {{GRADE_BAND}} (default "6-8").
- EXACTLY 3 misconceptions. Each must be a documented, common, real misconception for
  this topic — the kind a teacher would recognize — never invented trivia or mere
  ignorance ("doesn't know the formula" is not a misconception).
- Each `resolution_criteria` must demand a CAUSAL MECHANISM in the student's own
  words, and must state what does NOT count (restating the rule, vocabulary alone).
- Each `probe` is voiced as Milo: short, kid-phrased, genuinely confused, aimed at
  the exact gap.
- `check_problem` must be answerable in one or two steps, with `failure_modes` giving
  a distinct, plausible wrong attempt for EACH misconception id — the error a kid
  with exactly that confusion would make.
- `learner_opening` is Milo's first message: states his starting confusion about the
  topic in his own words, no jargon.
- Output ONLY the JSON object.

EXAMPLE PACK (schema reference):
{{EXAMPLE_PACK_JSON}}
