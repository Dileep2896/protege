// ClassInsights — the teacher's real product: evidence without effort.
// Aggregates every student's sessions into a misconception × student matrix per
// concept, with verbatim quotes as receipts and a "reteach next" ranking.
// Pure aggregation of stored sessions — no model calls, no teacher work.
import { useEffect, useState } from "react";
import { listSessions, topicPack } from "../lib/backend.js";
import learnersSeed from "../../packs/learners.json";
import fractionsPack from "../../packs/fractions_division.json";
import photosynthesisPack from "../../packs/photosynthesis.json";

const BUILTIN = { [fractionsPack.id]: fractionsPack, [photosynthesisPack.id]: photosynthesisPack };

export default function ClassInsights({ onViewReport }) {
  const [sessions, setSessions] = useState(null);
  const [topicBeliefs, setTopicBeliefs] = useState({});   // pack_id -> {m1: belief, ...}

  useEffect(() => {
    listSessions(100).then(async rows => {
      setSessions(rows);
      // real belief texts for generated topic packs
      const topicPackIds = [...new Set(rows.map(r => r.pack_id).filter(p => p.startsWith("topic_")))];
      for (const pid of topicPackIds) {
        try {
          const pack = await topicPack(pid.slice(6));
          if (pack?.misconceptions) {
            setTopicBeliefs(prev => ({
              ...prev,
              [pid]: Object.fromEntries(pack.misconceptions.map(m => [m.id, m.belief]))
            }));
          }
        } catch { /* fallback labels */ }
      }
    }).catch(() => setSessions([]));
  }, []);

  if (sessions === null) return <p className="home-hint">Reading the class's sessions…</p>;

  // Best-of across ALL of a student's sessions on a concept: understanding, once
  // evidenced, counts — an unfinished retry never erases an earlier success.
  const merged = {};
  for (const s of sessions) {
    const k = s.learner_id + "|" + s.pack_id;
    const cur = merged[k] || (merged[k] = {
      learner_id: s.learner_id, pack_id: s.pack_id, pack_title: s.pack_title,
      misconceptions: {}, evidence: {}, report: null, reportSession: null
    });
    for (const [mid, st] of Object.entries(s.state?.misconceptions || {})) {
      if (st === "resolved") cur.misconceptions[mid] = "resolved";
      else if (!cur.misconceptions[mid]) cur.misconceptions[mid] = "unresolved";
    }
    if (s.evidence && !Array.isArray(s.evidence))
      for (const [mid, q] of Object.entries(s.evidence)) if (q && !cur.evidence[mid]) cur.evidence[mid] = q;
    if (s.report && !cur.report) { cur.report = s.report; cur.reportSession = s; }
    if (s.pack_title && !cur.pack_title) cur.pack_title = s.pack_title;
  }

  // Group by concept.
  const concepts = {};
  for (const s of Object.values(merged)) {
    const c = (concepts[s.pack_id] = concepts[s.pack_id] || {
      pack_id: s.pack_id,
      title: s.pack_title || BUILTIN[s.pack_id]?.title || s.pack_id,
      students: []
    });
    c.students.push(s);
  }

  const learnerName = id => learnersSeed.learners.find(l => l.id === id)?.name || id;
  const beliefOf = (packId, mid) =>
    BUILTIN[packId]?.misconceptions.find(m => m.id === mid)?.belief
    || topicBeliefs[packId]?.[mid]
    || `Confusion ${mid.slice(1)}`;

  const list = Object.values(concepts).filter(c => c.students.length > 0);
  if (!list.length) return <p className="home-hint">No student sessions yet — insights appear as your class teaches their protégés.</p>;

  // Headline numbers across the whole class.
  let cellsTotal = 0, cellsResolved = 0, reteachCount = 0, reportCount = 0;
  const activeStudents = new Set();
  for (const c of list) {
    const mids = Object.keys(c.students[0].misconceptions || {});
    for (const mid of mids) {
      const unresolved = c.students.filter(s => s.misconceptions?.[mid] !== "resolved").length;
      cellsTotal += c.students.length;
      cellsResolved += c.students.length - unresolved;
      if (unresolved > 0) reteachCount++;
    }
    c.students.forEach(s => { activeStudents.add(s.learner_id); if (s.report) reportCount++; });
  }

  return (
    <div className="insights">
      <div className="insight-stats">
        <div className="stat-tile">
          <span className="stat-num">{activeStudents.size}</span>
          <span className="stat-label">students active</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{cellsTotal ? Math.round((cellsResolved / cellsTotal) * 100) : 0}%</span>
          <span className="stat-label">class mastery</span>
        </div>
        <div className={`stat-tile ${reteachCount ? "stat-alert" : ""}`}>
          <span className="stat-num">{reteachCount}</span>
          <span className="stat-label">to reteach</span>
        </div>
        <div className="stat-tile">
          <span className="stat-num">{reportCount}</span>
          <span className="stat-label">reports ready</span>
        </div>
      </div>

      {list.map(c => {
        const mids = Object.keys(c.students[0].misconceptions || {}).sort();
        const rows = mids.map(mid => {
          const unresolved = c.students.filter(s => s.misconceptions?.[mid] !== "resolved");
          return { mid, unresolved };
        }).sort((a, b) => b.unresolved.length - a.unresolved.length);
        const total = mids.length * c.students.length;
        const solved = total - rows.reduce((n, r) => n + r.unresolved.length, 0);

        return (
          <section key={c.pack_id} className="insight-card">
            <header className="insight-head">
              <div>
                <h3>{c.title}</h3>
                <span className="insight-count">{c.students.length} student{c.students.length === 1 ? "" : "s"} · {solved}/{total} resolved</span>
              </div>
              <span className="insight-meter" role="img" aria-label={`${solved} of ${total} resolved`}>
                <span className="insight-meter-fill" style={{ width: `${total ? (solved / total) * 100 : 0}%` }} />
              </span>
            </header>

            <div className="insight-rows">
              {rows.map(({ mid, unresolved }) => {
                const clear = unresolved.length === 0;
                const withQuote = c.students.find(s => s.misconceptions?.[mid] === "resolved" && s.evidence[mid]);
                return (
                  <div key={mid} className={`insight-row ${clear ? "clear" : "needs-work"}`}>
                    <span className={`insight-dot ${clear ? "ok" : "bad"}`} aria-hidden="true" />
                    <div className="insight-main">
                      <p className={`insight-belief-text ${clear ? "belief-done" : ""}`}>{beliefOf(c.pack_id, mid)}</p>
                      {withQuote && clear && (
                        <p className="insight-quote">“{withQuote.evidence[mid]}” — {learnerName(withQuote.learner_id).split(" ")[0]}</p>
                      )}
                    </div>
                    <div className="insight-chips">
                      {!clear && <span className="reteach-flag">reteach</span>}
                      {c.students.map(s => {
                        const ok = s.misconceptions?.[mid] === "resolved";
                        return (
                          <span key={s.learner_id} className={`student-chip ${ok ? "ok" : "not"}`}
                            title={ok ? (s.evidence[mid] ? `"${s.evidence[mid]}"` : "resolved") : "not resolved yet"}>
                            {ok ? "✓" : "✗"} {learnerName(s.learner_id).split(" ")[0]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {c.students.some(s => s.report) && (
              <div className="insight-reports">
                {c.students.filter(s => s.report).map(s => (
                  <button key={s.learner_id} className="chapter-chip" onClick={() => onViewReport(s.reportSession)}>
                    📄 {learnerName(s.learner_id).split(" ")[0]}'s report
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
