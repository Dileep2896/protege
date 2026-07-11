# ARCHITECTURE.md — Milo

MVVM adapted to this project's constraints (plain React, `useState` + props, no state
libraries — see CLAUDE.md "Stack and boundaries"). Every file belongs to exactly one
layer; dependencies point one direction only:

```
View  →  ViewModel  →  Services  →  Serverless (Butterbase)  →  AI gateway
                 ↘  Model (pure) ↙
```

## Layers

### Model — `src/model/` (pure JS, no React, no fetch)
The session state machine and data shapes. Everything here is a pure function:
testable without a browser or a network.

- `session.js` — create initial state from a pack; apply a turn result to state
  (enforces **monotonic resolutions** — a resolved misconception can never flip back,
  even if the LLM output says otherwise); phase transitions (`teaching → check → done`);
  pick the `failure_modes` entry for the traceable-failure beat (lowest-numbered
  unresolved misconception).
- Data shapes (documented here, not typed — no TS): `pack`, `state`, `turnResult`
  (the structured JSON in CLAUDE.md), `report`, `learnerMemory`.

Rule of thumb: if it's an `if` about Milo's understanding, it lives here — not in a
component, not in a prompt-adjacent hack.

### ViewModel — `src/viewmodels/` (custom hooks, owns all React state)
- `useSession.js` — owns `{state, transcript, thinking, error}`; exposes actions
  `sendTurn(text)`, `quizMilo()`, `endSession()`. Calls Services, applies results via
  Model functions, never renders anything.
- `useReport.js` — loads/holds a generated report for the report view.

Views call actions; they never fetch, never mutate state, never import Services.

### View — `src/components/` (dumb, props only)
- `ChatPane.jsx` (message list, input, thinking animation, Milo avatar + mood)
- `TeacherPanel.jsx` (misconception checklist, strikethrough + highlighter sweep)
- `ReportView.jsx` (printable teaching report)
- `App.jsx` composes the two panes and wires `useSession` in.

### Services — `src/lib/` (all I/O; the only files that know URLs)
- `backend.js` — ALL Butterbase access: calls the `/turn` and `/report` serverless
  functions, session rows in the DB. Nothing else imports fetch for Butterbase.
- `memory.js` — ALL EverOS access, 2s timeout, silent fallback to
  `packs/learners.json` seed. The memory beat must survive EverOS being down.

### Serverless — `functions/` (deployed to Butterbase)
- `turn.js` — builds the prompt from `prompts/turn.md` + pack + state, calls the
  **Butterbase AI gateway**, validates/parses the structured JSON, returns it.
- `report.js` — same shape for `prompts/report.md`.

## AI calls: Butterbase gateway, no Anthropic key (decided 2026-07-10)

All model calls go through Butterbase's OpenAI-compatible gateway and bill Butterbase
AI credits. There is **no `ANTHROPIC_API_KEY` anywhere in this project.**

- Model: `anthropic/claude-sonnet-4.6` (gateway id). Turns: temperature 0.3,
  max_tokens 1400. Eval harness: temperature 0.
- Serverless functions: the runtime auto-injects `BUTTERBASE_APP_ID` and
  `BUTTERBASE_API_URL` into `ctx.env`; supply `BUTTERBASE_API_KEY` via `envVars` at
  deploy. Endpoint: `POST {BUTTERBASE_API_URL}/v1/{app_id}/chat/completions`.
- Eval harness (local): `POST https://api.butterbase.ai/v1/chat/completions` with a
  personal key. Response is OpenAI-shaped (`choices[0].message.content`).

## EverOS integration (done 2026-07-10)

- `src/lib/memory.js` is a factory (`createMemoryService`) with injected config — the
  same module runs in Node scripts and (later) the browser. Reads use
  `POST /api/v1/memories/get` (episodic, chronological); writes use sync add + flush.
- **Fallback contract:** `getLearnerMemory()` resolves within 2s no matter what,
  falling back silently to `packs/learners.json` seeds. Verified both ways by
  `scripts/verify_memory.mjs`.
- **Live-app rule from the pack README:** add with default `async_mode=true` during
  chat (never block a turn), and always `flush()` at session end or the last chunk of
  messages never gets extracted. Preloading scripts use `async_mode=false` + flush.
- Demo learner `maya_chen` is loaded (5 sessions, `scripts/load_learner.mjs`); raw
  transcripts live in `packs/data_pack/`.
- `EVEROS_API_KEY` lives in `.env` for scripts. At the event, browser access goes
  through a Butterbase proxy function so the key never ships to the client.

## Learn pipeline (added 2026-07-11)

- `functions/learn` (built by `scripts/build_learn_function.mjs`), five ops:
  chapter (Wikipedia/pasted text → LLM → topics DAG → DB + Neo4j), illustrate
  (gemini-3.1-flash-image → data URI cached on topic row), pack (pack_generator.md →
  cached on topic row), mastered, next (graph frontier query).
- **Dynamic packs:** turn/report accept an inline `pack` object; built-in packs still
  go by id only, so the rehearsed demo path sends byte-identical requests.
- **Neo4j** (Aura, HTTPS Query API): creds live ONLY in the learn function's env
  (NEO4J_HOST/DB/AUTH). Graph = (:Chapter)-[:HAS_TOPIC]->(:Topic),
  (:Topic)-[:REQUIRED_FOR]->(:Topic), Topic.mastered. Graph failures are logged and
  swallowed — learning must survive the graph being down.
- Screens: landing → home (start/learn/dashboard) → chapter (cards + path SVG) →
  session. Completing a topic session auto-marks mastery (useSession → markMastered).

### Credentials
- `.env` at repo root (gitignored), see `.env.example`. Key: `BUTTERBASE_API_KEY`,
  a personal API key scoped to `ai:gateway` only (mint via dashboard `/api-keys` or
  `manage_auth_config` action `generate_service_key`).
- Client code never holds any key. The browser talks only to our functions.

## File layout (target)

```
ARCHITECTURE.md  CLAUDE.md  PRD.md  ISSUES.md  README.md  .env(.example)  .gitignore
prompts/   packs/   eval/          # unchanged from CLAUDE.md
functions/turn.js  functions/report.js
src/model/session.js
src/viewmodels/useSession.js  src/viewmodels/useReport.js
src/components/ChatPane.jsx  TeacherPanel.jsx  ReportView.jsx
src/lib/backend.js  src/lib/memory.js
src/App.jsx  src/main.jsx
```

## Version control

No git yet — repo will be initialized and pushed tomorrow (2026-07-11) at the event.
`.gitignore` is already in place so `.env` can't be committed by accident.
