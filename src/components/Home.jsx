// Home — start a session, learn a chapter, and the teacher dashboard.
import { useEffect, useState } from "react";
import { listSessions, deleteSession, buildChapter, listChapters, learnNext } from "../lib/backend.js";
import learnersSeed from "../../packs/learners.json";
import personas from "../../packs/personas.json";

export default function Home({ packs, onStart, onResume, onViewReport, onOpenChapter, lastId }) {
  const [learnerId, setLearnerId] = useState(learnersSeed.demo_learner_id);
  const [packId, setPackId] = useState(packs[0].id);
  const [level, setLevel] = useState(personas.default);
  const [mode, setMode] = useState("milo");   // milo | classroom
  const [sessions, setSessions] = useState(null);
  const [chapters, setChapters] = useState(null);
  const [nextUp, setNextUp] = useState([]);
  const [learnInput, setLearnInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [building, setBuilding] = useState(false);
  const [learnError, setLearnError] = useState(null);

  useEffect(() => {
    listSessions().then(setSessions).catch(() => setSessions([]));
    listChapters().then(setChapters).catch(() => setChapters([]));
    learnNext().then(r => setNextUp(r.next || [])).catch(() => {});
  }, []);

  async function build() {
    const topic = learnInput.trim();
    const text = pasteText.trim();
    if (!topic && !text) return;
    setBuilding(true);
    setLearnError(null);
    try {
      const res = await buildChapter({ topic: topic || undefined, text: text || undefined });
      onOpenChapter({ id: res.chapter_id, title: res.title, source: res.source });
    } catch (err) {
      setLearnError(err.message);
    } finally {
      setBuilding(false);
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(t => { setPasteText(t.slice(0, 24000)); setShowPaste(true); });
  }

  async function removeSession(s) {
    if (!window.confirm(`Delete this session (${learnerName(s.learner_id)} · ${packTitle(s.pack_id)})? The report goes with it.`)) return;
    try {
      await deleteSession(s.id);
      setSessions(prev => prev.filter(x => x.id !== s.id));
      if (s.id === lastId) localStorage.removeItem("milo_session_id");
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  const learnerName = id => learnersSeed.learners.find(l => l.id === id)?.name || id;
  const packTitle = id => packs.find(p => p.id === id)?.title || id;
  const resolvedCount = s => Object.values(s.state?.misconceptions || {}).filter(v => v === "resolved").length;
  const totalCount = s => Object.keys(s.state?.misconceptions || {}).length;
  const last = sessions?.find(s => s.id === lastId);

  return (
    <div className="home">
      <section className="start-card">
        <h2>Start a teaching session</h2>
        <p className="home-hint">Pick who's teaching, what Milo needs to learn, and how old he is today.</p>

        <div className="start-grid">
          <label>
            <span>Student (the teacher today)</span>
            <select value={learnerId} onChange={e => setLearnerId(e.target.value)}>
              {learnersSeed.learners.map(l => (
                <option key={l.id} value={l.id}>{l.name} — {l.grade}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Concept Milo doesn't get</span>
            <select value={packId} onChange={e => setPackId(e.target.value)}>
              {packs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label>
            <span>Milo's level</span>
            <select value={level} onChange={e => setLevel(e.target.value)}>
              {Object.entries(personas.labels).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Who are you teaching?</span>
            <select value={mode} onChange={e => setMode(e.target.value)}>
              <option value="milo">Milo (one classmate)</option>
              <option value="classroom">A class of 3 — teacher practice</option>
            </select>
          </label>
        </div>

        <div className="start-actions">
          <button className="start-btn" onClick={() => onStart({ learnerId, packId, level, classroom: mode === "classroom" })}>
            {mode === "classroom" ? "Start teaching the class" : "Start teaching Milo"}
          </button>
          <button className="resume-btn" onClick={() => onStart({ learnerId, packId, level, classroom: mode === "classroom", startInCall: true })}>
            🎥 Start as a call
          </button>
          {last && (
            <button className="resume-btn" onClick={() => onResume(last)}>
              Resume: {learnerName(last.learner_id)} · {packTitle(last.pack_id)}
            </button>
          )}
        </div>
      </section>

      <section className="learn-card">
        <h2>Learn something new, then teach it</h2>
        <p className="home-hint">
          Name any topic (we'll pull real material from the internet) or paste a textbook chapter —
          you get illustrated study cards, a learning path, and a Milo who's confused about exactly that.
        </p>
        <div className="learn-row">
          <input
            className="learn-input"
            value={learnInput}
            onChange={e => setLearnInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && build()}
            placeholder="e.g. The Water Cycle, Photosynthesis, World War I…"
            disabled={building}
          />
          <button className="start-btn" onClick={build} disabled={building || (!learnInput.trim() && !pasteText.trim())}>
            {building ? "Building your chapter…" : "Build chapter"}
          </button>
        </div>
        <div className="learn-alt">
          <button className="link-btn" onClick={() => setShowPaste(!showPaste)}>
            {showPaste ? "Hide pasted text" : "…or paste a chapter / upload a .txt"}
          </button>
          <label className="link-btn file-btn">
            upload file
            <input type="file" accept=".txt,.md,text/plain" onChange={onFile} hidden />
          </label>
        </div>
        {showPaste && (
          <textarea
            className="learn-paste"
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Paste the chapter text here (up to ~24k characters)…"
            rows={5}
          />
        )}
        {building && <p className="home-hint">Reading the material, splitting it into teachable topics, wiring the learning path… ~1 minute.</p>}
        {learnError && <p className="drawpad-error">{learnError}</p>}

        {(chapters?.length > 0 || nextUp.length > 0) && (
          <div className="chapter-shelf">
            {nextUp.length > 0 && (
              <p className="next-up">
                <span className="next-up-label">Up next for you:</span>{" "}
                {nextUp.slice(0, 3).map(n => n.title).join(" · ")}
              </p>
            )}
            {chapters?.map(c => (
              <button key={c.id} className="chapter-chip" onClick={() => onOpenChapter(c)}>
                📖 {c.title}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="history-card">
        <h2>Teacher view — past sessions</h2>
        {sessions === null && <p className="home-hint">Loading sessions…</p>}
        {sessions?.length === 0 && <p className="home-hint">No sessions yet. Reports land here after each session.</p>}
        {sessions?.length > 0 && (
          <table className="session-table">
            <thead>
              <tr><th>When</th><th>Student</th><th>Concept</th><th>Milo</th><th>Progress</th><th></th></tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td>{new Date(s.updated_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{learnerName(s.learner_id)}</td>
                  <td>{s.pack_title || packTitle(s.pack_id)}</td>
                  <td>{personas.labels[s.milo_level] || s.milo_level}</td>
                  <td>
                    <span className={resolvedCount(s) === totalCount(s) && totalCount(s) > 0 ? "prog done" : "prog"}>
                      {resolvedCount(s)}/{totalCount(s)} resolved
                    </span>
                  </td>
                  <td className="row-actions">
                    <button onClick={() => onResume(s)}>Open</button>
                    {s.report && <button onClick={() => onViewReport(s)}>Report</button>}
                    <button className="danger" onClick={() => removeSession(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
