// src/lib/memory.js — ALL EverOS access goes through this file (CLAUDE.md boundary).
// Service layer (see ARCHITECTURE.md): no React, no DOM. Dependencies are injected so
// the same module runs in Node (scripts, smoke tests) and the browser (via a config
// that points at a Butterbase proxy function — the raw EverOS key never ships to the
// client).
//
// Contract the rest of the app relies on:
//   - getLearnerMemory(learnerId) resolves in <= timeoutMs (default 2000) NO MATTER
//     WHAT, falling back silently to seed data. The demo's memory beat must survive
//     EverOS being down (CLAUDE.md non-negotiable for Slice 4).
//   - writeSessionSummary() is fire-and-forget: failures are logged, never thrown.

const EVEROS_DEFAULT_URL = "https://api.evermind.ai";

export function createMemoryService({
  apiKey,
  apiUrl = EVEROS_DEFAULT_URL,
  seedLearners = { learners: [] },   // parsed packs/learners.json for the fallback
  timeoutMs = 2000,
  log = () => {}                     // optional diagnostics hook, e.g. console.warn
} = {}) {

  async function everos(path, body, ms = timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function seedFor(learnerId) {
    const learner = (seedLearners.learners || []).find(l => l.id === learnerId);
    return (learner?.seeded_sessions || []).map(s => ({
      source: "seed",
      session: s.session,
      concept: s.concept,
      summary: s.summary,
      recurring: s.recurring
    }));
  }

  // Past-session summaries for {{LEARNER_MEMORY}} (opener + connections + report trend).
  // Newest last, so the prompt reads chronologically.
  async function getLearnerMemory(learnerId) {
    if (!apiKey) return seedFor(learnerId);
    try {
      const res = await everos("/api/v1/memories/get", {
        memory_type: "episodic_memory",
        filters: { user_id: learnerId },
        page: 1,
        page_size: 10,
        rank_by: "timestamp",
        rank_order: "asc"
      });
      const episodes = res.data?.episodes || [];
      if (episodes.length === 0) return seedFor(learnerId);   // empty EverOS -> seed keeps the beat alive
      return episodes.map(e => ({
        source: "everos",
        session_id: e.session_id,
        timestamp: e.timestamp,
        summary: e.episode || e.summary || ""
      }));
    } catch (err) {
      log(`EverOS read failed (${err.message}); using seed data`);
      return seedFor(learnerId);
    }
  }

  // Called at session end (Slice 4.2): store what this learner taught Milo, then flush
  // so extraction runs before the next session starts. Longer timeout — this isn't on
  // the turn-latency path.
  async function writeSessionSummary(learnerId, sessionId, summaryText) {
    if (!apiKey) return false;
    try {
      const now = Date.now();
      await everos("/api/v1/memories", {
        user_id: learnerId,
        session_id: sessionId,
        async_mode: false,
        messages: [
          { role: "user", timestamp: now, content: summaryText },
          { role: "assistant", timestamp: now + 1000,
            content: "Thanks for teaching me today! I'll remember how you explained it." }
        ]
      }, 10_000);
      await everos("/api/v1/memories/flush", { user_id: learnerId, session_id: sessionId }, 10_000);
      return true;
    } catch (err) {
      log(`EverOS write failed (${err.message}); session summary not persisted`);
      return false;
    }
  }

  return { getLearnerMemory, writeSessionSummary };
}
