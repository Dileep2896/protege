// src/model/session.js — the state machine, pure functions only (no React, no fetch).
// Non-negotiable #1 lives here: Milo's understanding is THIS object, nothing else.

export function initSession(pack) {
  const misconceptions = {};
  for (const m of pack.misconceptions) misconceptions[m.id] = "unresolved";
  return { phase: "teaching", misconceptions };
}

// Merge a /turn result into state. Enforces non-negotiable #8 (monotonicity) even
// if the model output regresses: resolved never goes back to unresolved.
// Returns { state, resolvedNow } — resolvedNow drives the strikethrough animation.
export function applyTurnResult(prev, result) {
  const next = { phase: prev.phase, misconceptions: { ...prev.misconceptions } };
  if (prev.classroom) next.classroom = true;   // mode flag survives turns + restore
  const modelState = result?.updated_state?.misconceptions || {};

  const resolvedNow = [];
  for (const id of Object.keys(next.misconceptions)) {
    const was = prev.misconceptions[id];
    const claim = modelState[id];
    if (was === "resolved") continue;                 // monotonic: never un-resolve
    if (claim === "resolved") {
      next.misconceptions[id] = "resolved";
      resolvedNow.push(id);
    }
  }

  const allResolved = Object.values(next.misconceptions).every(s => s === "resolved");
  const phase = result?.updated_state?.phase;
  next.phase = allResolved ? "done" : (phase === "done" ? "teaching" : (phase || "teaching"));

  return { state: next, resolvedNow };
}

// Evidence quotes keyed by misconception id, from this turn's evaluation.
export function evidenceFrom(result) {
  const out = {};
  for (const r of result?.evaluation?.resolved_this_turn || []) {
    if (r.id && r.evidence_quote) out[r.id] = r.evidence_quote;
  }
  return out;
}

export function allResolved(state) {
  return Object.values(state.misconceptions).every(s => s === "resolved");
}

// Render the transcript for the prompt: plain alternating lines.
export function transcriptText(messages) {
  if (messages.length === 0) return "(start of session)";
  return messages
    .map(m => `${m.who === "milo" ? "Milo" : "Student"}: ${m.text}`)
    .join("\n");
}
