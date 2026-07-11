// ClassInsights — the teacher's morning briefing. Headline numbers, charts,
// teaching-skill estimates, streaks, a best-explanation prize, and the EverMind
// class companion. Details stay collapsed until the teacher asks for them.
// All metrics are computed client-side from real sessions (src/model/insights.js).
import { useEffect, useMemo, useState } from "react";
import { listSessions, topicPack, askCoach } from "../lib/backend.js";
import { mergeSessions, skillsFor, classSkills, streaksFor, bestExplanation } from "../model/insights.js";
import {
  IconStudent, IconTarget, IconFolder, IconChart, IconFlame, IconTrophy,
  IconSparkle, IconChevron, IconQuote
} from "./Icons.jsx";
import learnersSeed from "../../packs/learners.json";
import fractionsPack from "../../packs/fractions_division.json";
import photosynthesisPack from "../../packs/photosynthesis.json";

const BUILTIN = { [fractionsPack.id]: fractionsPack, [photosynthesisPack.id]: photosynthesisPack };
const firstName = id => (learnersSeed.learners.find(l => l.id === id)?.name || id).split(" ")[0];

function Bar({ label, pct, danger }) {
  return (
    <div className="viz-row" title={`${label}: ${pct}%`}>
      <span className="viz-label">{label}</span>
      <span className="viz-track">
        <span className={`viz-fill ${danger ? "danger" : ""}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="viz-value">{pct}%</span>
    </div>
  );
}

export default function ClassInsights({ onViewReport }) {
  const [sessions, setSessions] = useState(null);
  const [topicBeliefs, setTopicBeliefs] = useState({});
  const [openConcept, setOpenConcept] = useState(null);
  const [coach, setCoach] = useState(null);
  const [coachBusy, setCoachBusy] = useState(false);

  useEffect(() => {
    listSessions(100).then(async rows => {
      setSessions(rows);
      const ids = [...new Set(rows.map(r => r.pack_id).filter(p => p.startsWith("topic_")))];
      for (const pid of ids) {
        try {
          const pack = await topicPack(pid.slice(6));
          if (pack?.misconceptions)
            setTopicBeliefs(prev => ({ ...prev, [pid]: Object.fromEntries(pack.misconceptions.map(m => [m.id, m.belief])) }));
        } catch { /* fallback labels */ }
      }
    }).catch(() => setSessions([]));
  }, []);

  const model = useMemo(() => {
    if (!sessions) return null;
    const entries = mergeSessions(sessions);
    const concepts = {};
    for (const e of entries) {
      const c = (concepts[e.pack_id] = concepts[e.pack_id] || {
        pack_id: e.pack_id,
        title: e.pack_title || BUILTIN[e.pack_id]?.title || e.pack_id,
        students: []
      });
      c.students.push(e);
    }
    const list = Object.values(concepts).map(c => {
      const mids = Object.keys(c.students[0]?.misconceptions || {}).sort();
      const total = mids.length * c.students.length;
      const solved = mids.reduce((n, mid) => n + c.students.filter(s => s.misconceptions[mid] === "resolved").length, 0);
      return { ...c, mids, total, solved, pct: total ? Math.round((solved / total) * 100) : 0 };
    }).filter(c => c.students.length);
    const perLearner = skillsFor(entries);
    return {
      entries, list, perLearner,
      skills: classSkills(perLearner),
      streaks: streaksFor(sessions),
      best: bestExplanation(entries),
      reteach: list.reduce((n, c) => n + c.mids.filter(mid => c.students.some(s => s.misconceptions[mid] !== "resolved")).length, 0),
      reports: entries.filter(e => e.report).length,
      activeCount: new Set(entries.map(e => e.learner_id)).size
    };
  }, [sessions]);

  if (!model) return <p className="home-hint">Reading the class's sessions…</p>;
  if (!model.list.length) return <p className="home-hint">No sessions yet — insights appear as your class teaches their protégés.</p>;

  const beliefOf = (packId, mid) =>
    BUILTIN[packId]?.misconceptions.find(m => m.id === mid)?.belief
    || topicBeliefs[packId]?.[mid]
    || `Confusion ${mid.slice(1)}`;

  async function runCoach() {
    if (coachBusy) return;
    const cacheKey = `protege_coach_${new Date().toDateString()}_${sessions.length}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) { setCoach(JSON.parse(cached)); return; }
    setCoachBusy(true);
    try {
      const digest = {
        concepts: model.list.map(c => ({
          title: c.title, mastery_pct: c.pct,
          still_confused_about: c.mids
            .filter(mid => c.students.some(s => s.misconceptions[mid] !== "resolved"))
            .map(mid => beliefOf(c.pack_id, mid).slice(0, 120)).slice(0, 4)
        })),
        student_skills: model.perLearner.map(s => ({
          student: firstName(s.learner_id),
          communication: s.communication, clarity: s.clarity, confidence: s.confidence, teaching_turns: s.turns
        })),
        streaks: model.streaks.map(s => ({ student: firstName(s.learner_id), days: s.streak })),
        best_explanation: model.best ? { student: firstName(model.best.learner_id), quote: model.best.quote.slice(0, 160) } : null
      };
      const out = await askCoach(digest);
      setCoach(out);
      localStorage.setItem(cacheKey, JSON.stringify(out));
    } catch (err) {
      setCoach({ read: `The companion is unavailable right now (${err.message}).`, suggestions: [], encouragements: [] });
    } finally {
      setCoachBusy(false);
    }
  }

  return (
    <div className="insights">
      <div className="insight-stats">
        <div className="stat-tile"><IconStudent size={20} className="stat-icon" /><span className="stat-num">{model.activeCount}</span><span className="stat-label">students active</span></div>
        <div className="stat-tile"><IconChart size={20} className="stat-icon" /><span className="stat-num">{model.list.length ? Math.round(model.list.reduce((n, c) => n + c.pct, 0) / model.list.length) : 0}%</span><span className="stat-label">class mastery</span></div>
        <div className={`stat-tile ${model.reteach ? "stat-alert" : ""}`}><IconTarget size={20} className="stat-icon" /><span className="stat-num">{model.reteach}</span><span className="stat-label">to reteach</span></div>
        <div className="stat-tile"><IconFolder size={20} className="stat-icon" /><span className="stat-num">{model.reports}</span><span className="stat-label">reports ready</span></div>
      </div>

      <div className="viz-grid">
        <section className="viz-card">
          <h4 className="viz-title"><IconChart size={15} /> Mastery by concept</h4>
          {model.list.map(c => <Bar key={c.pack_id} label={c.title} pct={c.pct} />)}
        </section>
        <section className="viz-card">
          <h4 className="viz-title"><IconStudent size={15} /> Teaching skills <span className="viz-note">estimated from real sessions</span></h4>
          {model.skills && (
            <>
              <Bar label="Communication" pct={model.skills.communication} />
              <Bar label="Clarity" pct={model.skills.clarity} />
              <Bar label="Confidence" pct={model.skills.confidence} danger={model.skills.confidence < 45} />
            </>
          )}
          <div className="skill-students">
            {model.perLearner.filter(s => s.turns > 0).map(s => (
              <span key={s.learner_id} className="student-chip" title={`communication ${s.communication} · clarity ${s.clarity} · confidence ${s.confidence}`}>
                {firstName(s.learner_id)} · {Math.round((s.communication + s.clarity + s.confidence) / 3)}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="viz-grid three">
        <section className="viz-card mini">
          <h4 className="viz-title"><IconFlame size={15} /> Teaching streaks</h4>
          {model.streaks.length === 0 && <p className="home-hint">No streaks yet — they start with today's homework.</p>}
          {model.streaks.map(s => (
            <p key={s.learner_id} className="streak-row">
              <IconFlame size={14} className="streak-flame" /> <strong>{firstName(s.learner_id)}</strong> — {s.streak} day{s.streak === 1 ? "" : "s"} teaching
            </p>
          ))}
        </section>
        <section className="viz-card mini prize">
          <h4 className="viz-title"><IconTrophy size={15} /> Best explanation</h4>
          {model.best ? (
            <>
              <p className="prize-quote"><IconQuote size={14} /> {model.best.quote.length > 150 ? model.best.quote.slice(0, 148) + "…" : model.best.quote}</p>
              <p className="prize-by">— {firstName(model.best.learner_id)}, teaching {model.best.pack_title}</p>
            </>
          ) : <p className="home-hint">Awarded to the clearest verbatim explanation of the week.</p>}
        </section>
        <section className="viz-card mini companion">
          <h4 className="viz-title"><IconSparkle size={15} /> Class companion</h4>
          {!coach && (
            <>
              <p className="home-hint">One EverMind agent follows this class across sessions — ask it what to do next.</p>
              <button className="teach-btn" onClick={runCoach} disabled={coachBusy}>
                {coachBusy ? "Thinking about your class…" : "Ask the companion"}
              </button>
            </>
          )}
          {coach && (
            <>
              <p className="companion-read">{coach.read}</p>
              <ul className="companion-list">
                {coach.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
              {coach.encouragements?.length > 0 && (
                <div className="companion-notes">
                  {coach.encouragements.map((e, i) => (
                    <p key={i}><strong>{e.student}:</strong> {e.note}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <h4 className="viz-title concepts-title">Concepts — open one to see exactly what to fix</h4>
      {model.list.map(c => {
        const open = openConcept === c.pack_id;
        const reteachRows = c.mids.filter(mid => c.students.some(s => s.misconceptions[mid] !== "resolved"));
        return (
          <section key={c.pack_id} className={`insight-card accordion ${open ? "open" : ""}`}>
            <button className="accordion-head" onClick={() => setOpenConcept(open ? null : c.pack_id)}>
              <IconChevron size={18} className="accordion-chevron" />
              <span className="accordion-title">{c.title}</span>
              {reteachRows.length > 0
                ? <span className="reteach-badge"><IconTarget size={13} /> {reteachRows.length} to reteach</span>
                : <span className="clear-badge">all clear</span>}
              <span className="insight-meter">
                <span className="insight-meter-fill" style={{ width: `${c.pct}%` }} />
              </span>
              <span className="viz-value">{c.pct}%</span>
            </button>

            {open && (
              <div className="accordion-body">
                {c.mids.map(mid => {
                  const clear = c.students.every(s => s.misconceptions[mid] === "resolved");
                  const withQuote = c.students.find(s => s.misconceptions[mid] === "resolved" && s.evidence[mid]);
                  return (
                    <div key={mid} className={`insight-row ${clear ? "clear" : "needs-work"}`}>
                      <span className={`insight-dot ${clear ? "ok" : "bad"}`} />
                      <div className="insight-main">
                        <p className={`insight-belief-text ${clear ? "belief-done" : ""}`}>{beliefOf(c.pack_id, mid)}</p>
                        {withQuote && clear && <p className="insight-quote">“{withQuote.evidence[mid]}” — {firstName(withQuote.learner_id)}</p>}
                      </div>
                      <div className="insight-chips">
                        {c.students.map(s => {
                          const ok = s.misconceptions[mid] === "resolved";
                          return (
                            <span key={s.learner_id} className={`student-chip ${ok ? "ok" : "not"}`}
                              title={ok ? (s.evidence[mid] ? `"${s.evidence[mid]}"` : "resolved") : "not resolved yet"}>
                              {ok ? "✓" : "✗"} {firstName(s.learner_id)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="attempts">
                  <h5 className="attempts-title">How they tried to teach it</h5>
                  {c.students.map(s => {
                    const attempt = [...s.studentTurns].sort((a, b) => b.length - a.length)[0];
                    if (!attempt) return (
                      <p key={s.learner_id} className="home-hint">{firstName(s.learner_id)} hasn't made a teaching attempt yet.</p>
                    );
                    return (
                      <div key={s.learner_id} className="attempt">
                        <span className="attempt-who">{firstName(s.learner_id)} · {s.studentTurns.length} teaching turn{s.studentTurns.length === 1 ? "" : "s"}</span>
                        <p className="attempt-text">“{attempt.length > 260 ? attempt.slice(0, 258) + "…" : attempt}”</p>
                      </div>
                    );
                  })}
                </div>

                {c.students.some(s => s.report) && (
                  <div className="insight-reports">
                    {c.students.filter(s => s.report).map(s => (
                      <button key={s.learner_id} className="chapter-chip" onClick={() => onViewReport(s.reportSession)}>
                        <IconFolder size={13} /> {firstName(s.learner_id)}'s full report
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
