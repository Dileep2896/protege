// src/model/insights.js — pure analytics over stored sessions. No React, no fetch,
// no model calls: every metric here is computed from what students actually did.

// Merge best-of state per (learner, concept): a retry never erases evidenced understanding.
export function mergeSessions(sessions) {
  const merged = {};
  for (const s of sessions) {
    const k = s.learner_id + "|" + s.pack_id;
    const cur = merged[k] || (merged[k] = {
      learner_id: s.learner_id, pack_id: s.pack_id, pack_title: s.pack_title,
      misconceptions: {}, evidence: {}, report: null, reportSession: null,
      studentTurns: [], sessionDays: new Set()
    });
    for (const [mid, st] of Object.entries(s.state?.misconceptions || {})) {
      if (st === "resolved") cur.misconceptions[mid] = "resolved";
      else if (!cur.misconceptions[mid]) cur.misconceptions[mid] = "unresolved";
    }
    if (s.evidence && !Array.isArray(s.evidence))
      for (const [mid, q] of Object.entries(s.evidence)) if (q && !cur.evidence[mid]) cur.evidence[mid] = q;
    if (s.report && !cur.report) { cur.report = s.report; cur.reportSession = s; }
    if (s.pack_title && !cur.pack_title) cur.pack_title = s.pack_title;
    const turns = s.messages?.turns || [];
    for (const m of turns) if (m.who === "student" && m.text) cur.studentTurns.push(m.text);
    cur.sessionDays.add(new Date(s.created_at).toDateString());
  }
  return Object.values(merged);
}

const HEDGES = /\b(i think|maybe|not sure|i guess|idk|kind of|sort of|probably)\b/i;
const ANALOGY = /\b(like|imagine|think of|picture|for example|say you|pretend)\b/i;

// Teaching-skill estimates per learner, 0-100, honestly heuristic.
// communication: do they explain at length and reach for examples?
// clarity: how much confusion does each explanation actually resolve?
// confidence: how rarely do they hedge or answer in fragments?
export function skillsFor(entries) {
  const byLearner = {};
  for (const e of entries) (byLearner[e.learner_id] = byLearner[e.learner_id] || []).push(e);

  return Object.entries(byLearner).map(([learner_id, list]) => {
    const turns = list.flatMap(e => e.studentTurns);
    const resolved = list.reduce((n, e) => n + Object.values(e.misconceptions).filter(v => v === "resolved").length, 0);
    if (!turns.length) return { learner_id, communication: 0, clarity: 0, confidence: 0, turns: 0 };

    const avgWords = turns.reduce((n, t) => n + t.split(/\s+/).length, 0) / turns.length;
    const analogyRate = turns.filter(t => ANALOGY.test(t)).length / turns.length;
    const hedgeRate = turns.filter(t => HEDGES.test(t)).length / turns.length;
    const fragmentRate = turns.filter(t => t.split(/\s+/).length < 8).length / turns.length;

    const clamp = v => Math.max(5, Math.min(98, Math.round(v)));
    return {
      learner_id,
      turns: turns.length,
      communication: clamp((Math.min(avgWords, 90) / 90) * 70 + analogyRate * 30),
      clarity: clamp((resolved / Math.max(1, turns.length)) * 90 + (resolved ? 10 : 0)),
      confidence: clamp(100 - hedgeRate * 55 - fragmentRate * 40)
    };
  });
}

export function classSkills(perLearner) {
  const active = perLearner.filter(s => s.turns > 0);
  if (!active.length) return null;
  const avg = key => Math.round(active.reduce((n, s) => n + s[key], 0) / active.length);
  return { communication: avg("communication"), clarity: avg("clarity"), confidence: avg("confidence") };
}

// Consecutive-day teaching streak per learner (ending today or yesterday).
export function streaksFor(sessions) {
  const days = {};
  for (const s of sessions)
    (days[s.learner_id] = days[s.learner_id] || new Set()).add(new Date(s.created_at).toDateString());
  return Object.entries(days).map(([learner_id, set]) => {
    let streak = 0;
    const d = new Date();
    if (!set.has(d.toDateString())) d.setDate(d.getDate() - 1);   // grace: streak alive through yesterday
    while (set.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    return { learner_id, streak };
  }).filter(s => s.streak > 0).sort((a, b) => b.streak - a.streak);
}

// The single best explanation across the class: the longest verbatim evidence quote.
export function bestExplanation(entries) {
  let best = null;
  for (const e of entries)
    for (const q of Object.values(e.evidence))
      if (q && (!best || q.length > best.quote.length))
        best = { quote: q, learner_id: e.learner_id, pack_title: e.pack_title || e.pack_id };
  return best;
}
