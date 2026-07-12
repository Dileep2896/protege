// ClassInsights — the teacher's morning briefing, laid out like a gradebook.
// A ledger of headline numbers, two charts, a student roster that opens into
// each student's full picture, and the EverMind class companion.
// All metrics are computed client-side from real sessions (src/model/insights.js).
import { useEffect, useMemo, useState } from "react";
import { listSessions, topicPack, askCoach } from "../lib/backend.js";
import { mergeSessions, skillsFor, classSkills, streaksFor, bestExplanation } from "../model/insights.js";
import {
  IconStudent, IconTarget, IconFolder, IconChart, IconFlame, IconTrophy,
  IconSparkle, IconChevron, IconQuote
} from "./Icons.jsx";
import learnersSeed from "../../packs/learners.json";
import Loader from "./Loader.jsx";
import fractionsPack from "../../packs/fractions_division.json";
import photosynthesisPack from "../../packs/photosynthesis.json";

const BUILTIN = { [fractionsPack.id]: fractionsPack, [photosynthesisPack.id]: photosynthesisPack };
const PEOPLE = [...learnersSeed.learners, ...(learnersSeed.classmates || [])];
const fullName = id => PEOPLE.find(l => l.id === id)?.name || id;
const firstName = id => fullName(id).split(" ")[0];
const initials = id => fullName(id).split(" ").map(w => w[0]).slice(0, 2).join("");

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
  const [openStudent, setOpenStudent] = useState(null);
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
      const midSet = new Set(c.students.flatMap(s => Object.keys(s.misconceptions)));
      const mids = [...midSet].sort();
      const total = c.students.reduce((n, s) => n + Object.keys(s.misconceptions).length, 0);
      const solved = c.students.reduce((n, s) => n + Object.values(s.misconceptions).filter(v => v === "resolved").length, 0);
      return { ...c, mids, total, solved, pct: total ? Math.round((solved / total) * 100) : 0 };
    }).filter(c => c.students.length);

    const perLearner = skillsFor(entries);
    const streaks = streaksFor(sessions);
    const streakOf = Object.fromEntries(streaks.map(s => [s.learner_id, s.streak]));
    const lastOf = {};
    for (const s of sessions) {
      const t = new Date(s.created_at).getTime();
      if (!lastOf[s.learner_id] || t > lastOf[s.learner_id]) lastOf[s.learner_id] = t;
    }

    // per-student roster: mastery, skills, streak, their concepts
    const students = [...new Set(entries.map(e => e.learner_id))].map(id => {
      const mine = entries.filter(e => e.learner_id === id);
      const total = mine.reduce((n, e) => n + Object.keys(e.misconceptions).length, 0);
      const solved = mine.reduce((n, e) => n + Object.values(e.misconceptions).filter(v => v === "resolved").length, 0);
      let quote = null;
      for (const e of mine)
        for (const q of Object.values(e.evidence))
          if (q && (!quote || q.length > quote.length)) quote = q;
      return {
        id, entries: mine, total, solved,
        pct: total ? Math.round((solved / total) * 100) : 0,
        skills: perLearner.find(s => s.learner_id === id),
        streak: streakOf[id] || 0,
        last: lastOf[id],
        quote,
        sessionCount: sessions.filter(s => s.learner_id === id).length
      };
    }).sort((a, b) => b.pct - a.pct);

    return {
      entries, list, perLearner, students,
      skills: classSkills(perLearner),
      streaks,
      best: bestExplanation(entries),
      reteach: list.reduce((n, c) => n + c.mids.filter(mid => c.students.some(s => s.misconceptions[mid] && s.misconceptions[mid] !== "resolved")).length, 0),
      reports: entries.filter(e => e.report).length,
      activeCount: students.length
    };
  }, [sessions]);

  if (!model) return <Loader label="reading the class's sessions…" />;
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
            .filter(mid => c.students.some(s => s.misconceptions[mid] && s.misconceptions[mid] !== "resolved"))
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

  const classMastery = model.list.length ? Math.round(model.list.reduce((n, c) => n + c.pct, 0) / model.list.length) : 0;

  return (
    <div className="insights">
      {/* headline ledger — numbers on a rule, no boxes */}
      <div className="ledger">
        <div className="ledger-stat">
          <span className="ledger-num">{model.activeCount}</span>
          <span className="ledger-label"><IconStudent size={13} /> students teaching</span>
        </div>
        <div className="ledger-stat">
          <span className="ledger-num">{classMastery}%</span>
          <span className="ledger-label"><IconChart size={13} /> class mastery</span>
        </div>
        <div className={`ledger-stat ${model.reteach ? "alert" : ""}`}>
          <span className="ledger-num">{model.reteach}</span>
          <span className="ledger-label"><IconTarget size={13} /> to reteach</span>
        </div>
        <div className="ledger-stat">
          <span className="ledger-num">{model.reports}</span>
          <span className="ledger-label"><IconFolder size={13} /> reports ready</span>
        </div>
      </div>

      <div className="viz-grid">
        <section className="viz-card">
          <h4 className="viz-title"><IconChart size={15} /> Mastery by concept</h4>
          {model.list.map(c => <Bar key={c.pack_id} label={c.title} pct={c.pct} />)}
        </section>
        <section className="viz-card">
          <h4 className="viz-title"><IconStudent size={15} /> Class teaching skills <span className="viz-note">estimated from real sessions</span></h4>
          {model.skills && (
            <>
              <Bar label="Communication" pct={model.skills.communication} />
              <Bar label="Clarity" pct={model.skills.clarity} />
              <Bar label="Confidence" pct={model.skills.confidence} />
            </>
          )}
          <p className="viz-foot">Communication — length and analogies. Clarity — how much confusion each explanation resolves. Confidence — how rarely they hedge.</p>
        </section>
      </div>

      {/* the roster — every student, one ruled line each */}
      <h4 className="viz-title roster-title"><IconStudent size={15} /> The class, one by one <span className="viz-note">open a row for their full picture</span></h4>
      <div className="gradebook">
        <div className="gb-head">
          <span className="gb-col-student">student</span>
          <span className="gb-col-mastery">mastery</span>
          <span className="gb-col-skill">comm</span>
          <span className="gb-col-skill">clarity</span>
          <span className="gb-col-skill">conf</span>
          <span className="gb-col-streak">streak</span>
          <span className="gb-col-chev" />
        </div>
        {model.students.map(s => {
          const open = openStudent === s.id;
          return (
            <div key={s.id} className={`gb-row-wrap ${open ? "open" : ""}`}>
              <button className="gb-row" onClick={() => setOpenStudent(open ? null : s.id)}>
                <span className="gb-col-student">
                  <span className="gb-avatar">{initials(s.id)}</span>
                  <span className="gb-name">{fullName(s.id)}</span>
                </span>
                <span className="gb-col-mastery">
                  <span className="gb-meter"><span className="gb-meter-fill" style={{ width: `${s.pct}%` }} /></span>
                  <span className="gb-pct">{s.pct}%</span>
                </span>
                <span className="gb-col-skill">{s.skills?.communication ?? "–"}</span>
                <span className="gb-col-skill">{s.skills?.clarity ?? "–"}</span>
                <span className="gb-col-skill">{s.skills?.confidence ?? "–"}</span>
                <span className="gb-col-streak">
                  {s.streak > 0 ? <><IconFlame size={13} className="gb-flame" /> {s.streak}d</> : <span className="gb-dim">—</span>}
                </span>
                <IconChevron size={16} className="gb-col-chev gb-chevron" />
              </button>
              {open && (
                <div className="gb-detail">
                  <div className="gb-concepts">
                    {s.entries.map(e => {
                      const mids = Object.keys(e.misconceptions).sort();
                      const done = mids.filter(m => e.misconceptions[m] === "resolved").length;
                      return (
                        <div key={e.pack_id} className="gb-concept">
                          <span className="gb-concept-title">{e.pack_title || BUILTIN[e.pack_id]?.title || e.pack_id}</span>
                          <span className="gb-dots">
                            {mids.map(m => <span key={m} className={`gb-dot ${e.misconceptions[m] === "resolved" ? "ok" : "bad"}`} title={beliefOf(e.pack_id, m)} />)}
                          </span>
                          <span className="gb-dim">{done}/{mids.length} resolved</span>
                          {e.report && (
                            <button className="link-btn gb-report" onClick={() => onViewReport(e.reportSession)}>read report</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {s.quote && (
                    <p className="gb-quote"><IconQuote size={13} /> “{s.quote.length > 180 ? s.quote.slice(0, 178) + "…" : s.quote}”</p>
                  )}
                  <p className="gb-meta-line">
                    {s.sessionCount} session{s.sessionCount === 1 ? "" : "s"} · {s.solved}/{s.total} confusions resolved
                    {s.skills && s.skills.confidence < 45 && <span className="gb-flag"> · hedges a lot — needs a confidence win</span>}
                    {s.skills && s.skills.communication < 45 && <span className="gb-flag"> · very short answers — ask them to explain with a picture</span>}
                    {s.skills && s.skills.clarity < 45 && s.skills.communication >= 45 && <span className="gb-flag"> · talks plenty but resolves little — push for the why, not the story</span>}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="viz-grid">
        <section className="viz-card prize">
          <h4 className="viz-title"><IconTrophy size={15} /> Best explanation this week</h4>
          {model.best ? (
            <>
              <p className="prize-quote"><IconQuote size={14} /> {model.best.quote.length > 170 ? model.best.quote.slice(0, 168) + "…" : model.best.quote}</p>
              <p className="prize-by">— {firstName(model.best.learner_id)}, teaching {model.best.pack_title}</p>
            </>
          ) : <p className="home-hint">Awarded to the clearest verbatim explanation of the week.</p>}
        </section>
        <section className="viz-card companion">
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
        const reteachRows = c.mids.filter(mid => c.students.some(s => s.misconceptions[mid] && s.misconceptions[mid] !== "resolved"));
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
                  const holders = c.students.filter(s => s.misconceptions[mid]);
                  const clear = holders.every(s => s.misconceptions[mid] === "resolved");
                  const withQuote = holders.find(s => s.misconceptions[mid] === "resolved" && s.evidence[mid]);
                  return (
                    <div key={mid} className={`insight-row ${clear ? "clear" : "needs-work"}`}>
                      <span className={`insight-dot ${clear ? "ok" : "bad"}`} />
                      <div className="insight-main">
                        <p className={`insight-belief-text ${clear ? "belief-done" : ""}`}>{beliefOf(c.pack_id, mid)}</p>
                        {withQuote && clear && <p className="insight-quote">“{withQuote.evidence[mid]}” — {firstName(withQuote.learner_id)}</p>}
                      </div>
                      <div className="insight-chips">
                        {holders.map(s => {
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
                  {c.students.filter(s => s.studentTurns.length > 0).map(s => {
                    const attempt = [...s.studentTurns].sort((a, b) => b.length - a.length)[0];
                    return (
                      <div key={s.learner_id} className="attempt">
                        <span className="attempt-who">{firstName(s.learner_id)} · {s.studentTurns.length} teaching turn{s.studentTurns.length === 1 ? "" : "s"}</span>
                        <p className="attempt-text">“{attempt.length > 260 ? attempt.slice(0, 258) + "…" : attempt}”</p>
                      </div>
                    );
                  })}
                  {(() => {
                    const silent = c.students.filter(s => s.studentTurns.length === 0);
                    if (!silent.length) return null;
                    return (
                      <p className="home-hint">
                        No attempt yet from {silent.map(s => firstName(s.learner_id)).join(", ")}.
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
