# ISSUES — work queue in order

Rules: work top to bottom. An issue is done when its acceptance line is true. If an
issue blows 1.5x its timebox, check the cut order in PRD.md before continuing.

## Slice 0 — tonight (config + validation only, ~60 min total)

- [x] **0.1 Butterbase account + hello-world deploy** (15m) — DONE 7/11: app `milo`
      (app_hsa4lqgmiq07) created; https://milo.butterbase.dev renders (HTTP 200).
      Deploy flow proven: create_frontend_deployment → PUT zip → start_deployment.
- [x] **0.2 Butterbase MCP submission dry run** (10m) — REHEARSED 7/11 as far as
      possible without creating an entry; USER DECISION: do NOT submit until the real
      submission tomorrow. Flow proven: prep resolves "Beta Hack - Reinvented
      Education" (slug betahack-0711, deadline 2026-07-13T03:00Z) and returns the
      5-field schema; submit requires the ORGANIZER'S SUBMISSION CODE (get it at the
      venue/Discord — this is the only untested step, budget 5 min before 4:15).
      At submit time pass: hackathon_slug betahack-0711, app_id app_hsa4lqgmiq07
      (+50 scoring pts), submission_code, and the confirmed field values (team
      names/emails + LinkedIn URLs are in the 7/11 session transcript; confirm with
      the user before sending).
- [x] **0.3 EverOS account + smoke test** (10m) — DONE 7/10: scripts/everos_smoke.mjs
      round-trips a value (sync add → flush → search). Gotcha captured: add with
      async_mode=false before flush, else flush returns no_extraction.
- [x] **0.4 Read the "How to play" doc + fill packs/learners.json** (15m) — DONE 7/10:
      data pack downloaded to packs/data_pack/ (4 learners + README). learners.json has
      the real profiles; demo learner = maya_chen (7th grade math, W2 pizza-fractions
      session makes Milo's memory callback genuine). Maya's 5 sessions loaded into
      EverOS via scripts/load_learner.mjs; verified ON/OFF via scripts/verify_memory.mjs.
- [x] **0.5 Eval harness green** (20m, the important one) — DONE 7/10: 10/10 twice
      consecutively via Butterbase gateway (anthropic/claude-sonnet-4.6), zero prompt
      edits needed. ~$0.11/run of Butterbase AI credits.
- [x] **0.6 Rehearse Scripted Turn A/B against the harness** (10m) — DONE 7/10:
      cases 11 (A resolves nothing) + 12 (B resolves m1,m2,m3) both pass; 12/12 green.

## Slice 1 — Milo talks (~60 min, target done by 12:30)

- [x] **1.1 Vite scaffold + repo hygiene** (10m) — DONE 7/11: Vite+React, MVVM layout
      per ARCHITECTURE.md (model/ viewmodels/ components/ lib/).
- [x] **1.2 Butterbase serverless function `/turn`** (25m) — DONE 7/11: `turn` deployed
      (calls AI gateway, no Anthropic key). prompts/turn.md + packs are INLINED via
      scripts/build_turn_function.mjs — after editing prompt/pack: rebuild + redeploy.
      curl verified: Turn A resolves nothing, valid schema. Cold call ~8.7s, warm ~4-6s
      (watch the 3.5s budget; prompt caching kicks in after first call).
- [x] **1.3 Chat UI wired to /turn** (20m) — DONE 7/11: full teach exchange verified in
      a real browser on https://milo.butterbase.dev. m1 mechanism → strikethrough +
      highlighter sweep + verbatim evidence quote in teacher view; Milo clicked on m1
      then probed m2 unprompted. 2.2 (checklist panel) is effectively done already.

## Slice 2 — Milo learns (~60 min, target 1:45)

- [x] **2.1 Session state lives in Butterbase DB** (15m) — DONE 7/11: sessions table
      (anon RLS policy, demo data only), row created on start, saved each turn
      (fire-and-forget), restored on refresh via localStorage id. Verified: refresh
      after Turn B restored transcript + resolved rows + evidence. ⚠ Data-API gotcha:
      jsonb columns reject top-level ARRAYS — wrap them ({turns: [...]}). ⚠ App CORS
      must list the frontend origin (done: milo.butterbase.dev + localhost:5173).
- [x] **2.2 Teacher-view checklist panel** (20m) — DONE 7/11: Scripted Turn B struck
      all three rows live with highlighter sweep + hand-drawn strikethrough + verbatim
      evidence quotes under each.
- [x] **2.3 Endgame + traceable failure** (25m) — DONE 7/11 and REHEARSED in browser:
      beat 4 (sweet-talk: in-character refusal, nothing resolves), beat 5 (early quiz:
      3/8 straight-across error per m1 failure_mode, red pencil + ✗ tag), beat 6
      (Turn B: all resolve, aha, quiz disabled, "passed the check problem" note).
      ⚠ Browser-testing note: type-by-coordinate flaked; use find → form_input.

## Slice 3 — teaching report (~40 min, target 2:30)

- [x] **3.1 Report generation function** (20m) — DONE 7/11: `report` function deployed
      (prompts/report.md inlined via scripts/build_report_function.mjs — rebuild +
      redeploy after prompt edits). Markdown stored on the session row. Verified: all
      three misconceptions with verbatim evidence quotes, stingy 4/4/3 scoring, and a
      TREND section citing Maya's sessions 1-5 by number (pizza scaffold, session-4
      symbol gap). Report persisted to DB (checked via data API).
- [x] **3.2 Report view** (20m) — DONE 7/11: modal sheet, tiny hand-rolled markdown
      renderer (no deps), print CSS. Demo beat 7 verified in browser. Restore also
      brings the report back ("View teaching report").

## Slice 4 — Milo remembers (~45 min, target 3:20)

- [x] **4.1 src/lib/memory.js** (20m) — DONE EARLY 7/10: service written with 2s
      timeout + silent fallback, dependency-injected (see ARCHITECTURE.md).
      scripts/verify_memory.mjs passes both ways: EverOS ON returns maya_chen's 5 real
      episodes; OFF falls back to learners.json seed instantly. At the event: wire it
      into the viewmodel + turn function, don't rewrite it.
- [x] **4.2 Memory into prompts** (15m) — DONE 7/11: learner_memory flows into every
      turn (connections), the report (trend cites session numbers), and now the OPENER:
      new prompts/opener.md, inlined into the turn function (opener:true mode), static
      pack opener as fallback. Browser-verified: fresh session opens with "remember
      when you figured out fractions using the pizza thing?" — demo beat 2 live.
- [x] **4.3 Seed script** (10m) — DONE 7/10: scripts/load_learner.mjs (JS port of the
      data pack loader, sync add + flush per session) loaded maya_chen's 5 sessions
      into EverOS. Narrate as the data pack's pre-loaded history if asked — never fake
      a live claim.

## Slice 5 — stretch, voice (~10 min)

- [ ] **5.1 speechSynthesis on Milo lines** — pick the least robotic voice, rate ~1.05.
      Skip student mic input.

## Slice 6 — stretch, any-topic (~25 min, only if everything green by 3:45)

- [ ] **6.1 pack_generator function + "new topic" input.** Curated pack remains the
      rehearsed path; this is for a judge-shouted topic only.

## Slice 7 — product expansion (added 7/11 by user request; demo path stays frozen)

- [x] **7.1 Milo level/age setting** — DONE 7/11: packs/personas.json (7/11/15/college),
      {{MILO_PERSONA}} in turn.md + opener.md, milo_level param through function +
      client, milo_level column on sessions. Eval harness re-run after prompt change:
      12/12 (harness pins the default '11' persona). Verified live: level-7 Milo on
      photosynthesis speaks simpler and still probes correctly.
- [x] **7.2 Home screen + multiple sessions + teacher dashboard** — DONE 7/11:
      start form (learner × pack × level), resume-last shortcut, session history table
      (progress badges, Open/Report actions). Both packs now playable. Demo path =
      "Resume: Maya Chen · Dividing fractions" on the home screen.
- [x] **7.3 Chapter ingestion → learn → teach** — DONE 7/11 (~3:30AM): `learn`
      function (5 ops). Topic mode pulls REAL material from Wikipedia; paste/.txt
      upload also supported. LLM splits into 4-6 teachable topics with prereq DAG →
      chapters/topics tables → "Teach Milo this" generates a pack (pack_generator.md)
      → dynamic-pack session (turn/report accept inline packs; built-ins untouched).
      Verified end-to-end: Water Cycle from Wikipedia → 5 topics → taught topic 1 →
      3/3 with evidence quotes.
- [x] **7.4 Visual study cards** — DONE 7/11: google/gemini-3.1-flash-image via the
      gateway (~3c/image), one coherent hand-drawn notebook style, no text in images,
      cached as data URIs on topic rows, streamed into cards as they generate.
- [x] **7.7 Neo4j learning graph + landing page + UI pass** — DONE 7/11: Aura Query
      API over HTTPS from the function (creds in fn env; never in client). Chapter
      build MERGEs Chapter/Topic nodes + REQUIRED_FOR edges; completing a topic
      session marks it mastered; "next" op returns the unlocked frontier ("Up next
      for you" on home). Chapter screen renders the path as a worksheet-style SVG
      (mastered = highlighter+strikethrough, next = blue ring + "learn this next").
      Landing page (hero, 3 steps, feature strip) + overall UI polish shipped.
      ⚠ Cypher gotcha: ON CREATE SET must come before any plain SET after MERGE.
      ⚠ Card images are ~2MB data URIs — fine at demo scale; move to storage buckets
      post-hackathon if chapters multiply.
- [x] **7.5a Canvas handwriting (tablet)** — DONE 7/11, redesigned for interactivity
      per user: the pad is a SHARED WORKSHEET — Milo's face + current question pinned
      on top while the student writes on ruled paper (transparent canvas over CSS
      rules; eraser = destination-out; export composites onto paper for the vision
      call). "Show Milo" → "MILO READS THIS AS: …" preview → "Yes — teach him that"
      (sends directly) / "Fix it in the text box" / "Keep writing". Verified
      end-to-end twice: handwritten turns resolved misconceptions with evidence
      quotes taken from the handwriting.
- [x] **7.6 Delete sessions** — DONE 7/11: Delete button per dashboard row (confirm
      dialog), DELETE /sessions/{id}. Test rows cleaned: dashboard now shows only the
      two completed showcase sessions (Maya fractions 3/3 + report, Leo photo 3/3).
- [x] **7.8 Voice + call view + classroom agents** — DONE 7/11 (~10:30AM):
      • `voice` function proxies Groq: whisper-large-v3-turbo STT (verified end-to-end)
        + orpheus TTS. ⚠ ORPHEUS NEEDS ONE-TIME TERMS ACCEPTANCE in the Groq console
        (console.groq.com/playground?model=canopylabs/orpheus-v1-english) — until then
        the function returns {fallback:true} and the client speaks via browser
        speechSynthesis, so the call never goes silent. Groq key in fn env only.
      • Call view (Meet-style): agent tiles with speaking ring + talk animation, local
        camera self-tile (graceful avatar fallback), stage with Whiteboard (inline
        DrawPad) and Slides (chapter cards as slides, verified), chat rail,
        push-to-talk (hold → record → STT → turn). ⚠ PTT needs a REAL mic — untested
        by automation; press it once on the demo machine to grant permission.
      • Classroom mode: 3 agents each personifying one misconception (Zoe=m1 confident,
        Sam=m2 pictures, Ravi=m3 why). Function-side prompt override only when
        classroom:true — normal Milo requests byte-identical, harness untouched.
        Verified: teaching m1 made Zoe click while others stayed confused. Same
        evaluator/state/report; teacher panel shows name chips per misconception.
- [x] **7.9 Voice moved to Butterbase + Reels (TikTok learning)** — DONE 7/11 (~11:15AM):
      • voice fn now PRIMARY = Butterbase gateway openai/gpt-audio-mini (STT via
        input_audio content part; TTS via stream:true + pcm16 deltas → WAV server-side).
        Groq = fallback, browser speechSynthesis = last resort. Real TTS voices work
        NOW — no Groq/Orpheus terms needed. Verified: STT + 204KB RIFF via /fn/voice.
      • Reels: Learn tab Cards|Reels toggle → vertical snap-scroll phone frames,
        video autoplay/loop, caption + Teach CTA. Generation ON-DEMAND (cost labeled
        "~$1" — measured $0.96/4s seedance-2.0-fast clip) via reel_start/reel_poll ops;
        mp4 downloaded server-side, cached as data URI on topic row (data API PATCH
        413s on big bodies — writes must go through ctx.db in the function). Client
        converts data URI → Blob URL (Chrome stalls on multi-MB data-URI videos).
        Topic 1 has a cached clip (melting ice, QuickTime-verified 4.06s 720p,
        byte-identical round-trip). model:"veo" option exists on reel_start
        (google/veo-3.1-fast) but costs more than seedance — default is seedance.
      ⚠ Automated test browser cannot render ANY <video> (even external mp4s) —
        REELS PLAYBACK MUST BE EYEBALLED ON A REAL BROWSER (user's machine).
      ⚠ seedance returned 16:9 despite aspect_ratio 9:16 — the phone frame crops via
        object-fit:cover, looks fine.
- [x] **7.10 Role restructure + Class insights** — DONE 7/11 (~11:40AM):
      • PRODUCT DECISION (user's dilemma, my recommendation, user-aligned): teachers
        should NOT be required to teach agents — that adds work. The teacher product
        is EVIDENCE WITHOUT EFFORT: Class insights = misconception × student matrix
        aggregated from all sessions (best-of per learner — a retry never erases an
        earlier success), real belief texts (topic packs fetched), verbatim quotes,
        red "reteach" flags ranked by unresolved count, report chips. Zero LLM cost.
        Class practice (3 agents) kept but demoted to optional rehearsal.
      • Student library split: 📘 My courses (pasted/uploaded school material) vs
        ✨ Topics I'm curious about (internet-built; one-tap suggested topics).
        chapters.source distinguishes them. Teacher lands on insights + material shelf.
- [ ] **7.5b Voice in classic view** (call view has voice; classic chat stays silent
      by design — add a speaker toggle post-hackathon if wanted.)

## 4:15 — freeze

- [ ] Submit via Butterbase MCP (you dry-ran this last night).
- [ ] Run the pitch twice, once with the projector aspect ratio.
- [ ] Kill dev consoles/tabs; seed a fresh session for the demo.
