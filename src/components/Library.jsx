// Library — the classroom home. Students see two shelves: Courses (school
// material) and Topics (their own curiosity, with one-tap suggestions).
// Teachers land on Class insights — evidence without effort — with the shelves below.
import { useEffect, useState } from "react";
import { buildChapter, listChapters, chapterTopics, learnNext, listSessions, createCourse, wonderAboutImage } from "../lib/backend.js";
import learnersSeed from "../../packs/learners.json";
import ClassInsights from "./ClassInsights.jsx";
import { IconBook, IconSparkle, IconChart, IconPlay, IconCamera } from "./Icons.jsx";
import Loader from "./Loader.jsx";

const SUGGESTED_TOPICS = [
  "Black Holes", "How Vaccines Work", "The French Revolution", "Photosynthesis",
  "Plate Tectonics", "How the Internet Works", "Supply and Demand", "The Human Heart"
];

// Downscale a photo client-side so the vision call stays fast and cheap.
function fileToSmallDataUri(file, maxSide = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Snap curiosity — photograph anything, get the wonder hiding in it.
function SnapWonder() {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [wonder, setWonder] = useState(null);
  const [error, setError] = useState(null);

  async function onPhoto(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    setWonder(null);
    setError(null);
    try {
      const uri = await fileToSmallDataUri(f);
      setPreview(uri);
      setWonder(await wonderAboutImage(uri));
    } catch (err) {
      setError(`Couldn't read the wonder in that one: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="snap-wonder">
      <h3 className="shelf-section-title"><IconSparkle size={17} /> What's around you right now? <span className="shelf-sub">snap anything — even a t-shirt has secrets</span></h3>
      <div className="snap-card">
        <div className="snap-left">
          {preview
            ? <img className="snap-preview" src={preview} alt="your photo" />
            : <p className="snap-empty">A spoon. Your sneaker. The sky.<br />Everything is hiding something.</p>}
          <label className="teach-btn snap-btn">
            {busy ? "looking closely…" : preview ? <><IconCamera size={14} /> snap another</> : <><IconCamera size={14} /> Snap or upload a photo</>}
            <input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden disabled={busy} />
          </label>
          {error && <p className="drawpad-error">{error}</p>}
        </div>
        <div className="snap-right">
          {busy && <Loader label="finding the hidden wonder…" />}
          {!busy && !wonder && (
            <p className="home-hint">Jaw-dropping facts and real-world uses — pulled from whatever you photograph.</p>
          )}
          {wonder && (
            <>
              <p className="snap-seen">looking at: <strong>{wonder.seen}</strong></p>
              <p className="snap-hook">{wonder.hook}</p>
              <ul className="snap-facts">
                {(wonder.facts || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              {(wonder.usecases || []).length > 0 && (
                <div className="snap-uses">
                  <p className="snap-uses-title">where this actually matters</p>
                  {(wonder.usecases || []).map((u, i) => (
                    <div key={i} className="snap-use">
                      <span className="snap-use-where">{u.where}</span>
                      <p className="snap-use-how">{u.how}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const isCourse = c => (c.source || "").startsWith("pasted");   // vs internet-built topic

export default function Library({ role, onOpenChapter, onResume, onViewReport, lastId }) {
  const [chapters, setChapters] = useState(null);
  const [meta, setMeta] = useState({});          // chapter_id -> {total, mastered}
  const [nextUp, setNextUp] = useState([]);
  const [lastSession, setLastSession] = useState(null);
  const [learnInput, setLearnInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);
  // A build keeps running server-side even if you navigate away — this marker
  // survives in localStorage so the shelf can show the course-in-progress.
  const [pendingBuild, setPendingBuild] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem("protege_building"));
      return p && Date.now() - p.ts < 180000 ? p : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (!pendingBuild) return;
    const iv = setInterval(async () => {
      const cs = await listChapters().catch(() => null);
      if (!cs) return;
      const done = cs.some(c => Date.parse(c.created_at) > pendingBuild.ts);
      if (done || Date.now() - pendingBuild.ts > 180000) {
        localStorage.removeItem("protege_building");
        setPendingBuild(null);
        setChapters(cs);
      }
    }, 8000);
    return () => clearInterval(iv);
  }, [pendingBuild]);   // eslint-disable-line

  useEffect(() => {
    listChapters().then(async cs => {
      setChapters(cs);
      for (const c of cs) {
        try {
          const ts = await chapterTopics(c.id);
          setMeta(prev => ({ ...prev, [c.id]: { total: ts.length, mastered: ts.filter(t => t.mastered).length, cover: ts[0]?.image } }));
        } catch { /* meta is decoration */ }
      }
    }).catch(() => setChapters([]));
    learnNext().then(r => setNextUp(r.next || [])).catch(() => {});
    if (lastId) listSessions(10).then(rows => setLastSession(rows.find(r => r.id === lastId) || null)).catch(() => {});
  }, []);   // eslint-disable-line

  async function build(topicOverride) {
    const topic = (topicOverride || learnInput).trim();
    const text = topicOverride ? "" : pasteText.trim();
    if ((!topic && !text) || building) return;
    setBuilding(topicOverride || true);
    setError(null);
    const marker = { title: topic || "From your pasted chapter", ts: Date.now() };
    localStorage.setItem("protege_building", JSON.stringify(marker));
    setPendingBuild(marker);
    try {
      const res = await buildChapter({ topic: topic || undefined, text: text || undefined });
      localStorage.removeItem("protege_building");
      setPendingBuild(null);
      onOpenChapter({ id: res.chapter_id, title: res.title, source: res.source });
    } catch (err) {
      localStorage.removeItem("protege_building");
      setPendingBuild(null);
      setError(err.message);
    } finally {
      setBuilding(false);
    }
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(t => { setPasteText(t.slice(0, 24000)); setShowPaste(true); });
  }

  const learnerName = id => learnersSeed.learners.find(l => l.id === id)?.name || id;

  const renderBook = c => {
    const m = meta[c.id];
    return (
      <button key={c.id} className="book" onClick={() => onOpenChapter(c)}>
        <span className="book-spine" />
        <span className="book-cover">
          {m?.cover
            ? <img src={m.cover} alt="" loading="lazy" />
            : <span className="book-cover-blank"><IconBook size={28} /></span>}
        </span>
        <span className="book-title">{c.title}</span>
        {role === "teacher"
          ? <span className="book-meta">{m ? `${m.total} topic${m.total === 1 ? "" : "s"} — insights above track the class` : c.source}</span>
          : (
            <>
              <span className="book-meta">{m ? `${m.mastered}/${m.total} taught` : c.source}</span>
              {m && m.total > 0 && (
                <span className="book-progress">
                  <span className="book-progress-fill" style={{ width: `${(m.mastered / m.total) * 100}%` }} />
                </span>
              )}
            </>
          )}
      </button>
    );
  };

  const courses = chapters?.filter(isCourse) || [];
  const topics = chapters?.filter(c => !isCourse(c)) || [];

  return (
    <div className="library">
      <section className="shelf-head">
        <div>
          <h2>{role === "teacher" ? "Your classroom" : "Your classroom"}</h2>
          <p className="home-hint">
            {role === "teacher"
              ? "What your class understands — with their own words as proof."
              : "School courses on the left of your shelf, your own curiosities on the right."}
          </p>
        </div>
        {lastSession && (
          <button className="resume-btn" onClick={() => onResume(lastSession)}>
            <IconPlay size={13} /> Resume: {learnerName(lastSession.learner_id)} · {lastSession.pack_title || lastSession.pack_id}
          </button>
        )}
      </section>

      {role === "student" && nextUp.length > 0 && (
        <p className="next-up shelf-next">
          <span className="next-up-label">Up next for you:</span>{" "}
          {nextUp.slice(0, 3).map(n => `${n.title} (${n.chapter})`).join(" · ")}
        </p>
      )}

      {role === "teacher" && (
        <>
          <h3 className="shelf-section-title"><IconChart size={17} /> Class insights</h3>
          <p className="home-hint">Built from your students' sessions — nothing to grade, nothing to set up. Red rows are tomorrow's reteach list.</p>
          <ClassInsights onViewReport={onViewReport} />
          <h3 className="shelf-section-title" style={{ marginTop: 26 }}><IconBook size={17} /> Class material</h3>
        </>
      )}

      {error && <p className="drawpad-error">{error}</p>}
      {chapters === null && <Loader label="opening the shelf…" />}

      {role === "student" && <h3 className="shelf-section-title"><IconBook size={17} /> My courses <span className="shelf-sub">from your teacher</span></h3>}
      <section className="shelf">
        {/* Class material = teacher-authored courses only; students' personal
            internet-built topics never appear on the teacher's shelf */}
        {courses.map(renderBook)}
        {role === "student" && courses.length === 0 && chapters !== null && (
          <p className="home-hint">No courses yet — your teacher adds them, and they appear here.</p>
        )}
        {role === "teacher" && (
          <div className="book new-book">
            <h3>New course</h3>
            <p className="new-book-hint">Just a title to start — then add topics or feed it the workbook, chapter by chapter.</p>
            <input
              className="learn-input"
              value={learnInput}
              onChange={e => setLearnInput(e.target.value)}
              onKeyDown={async e => {
                if (e.key !== "Enter" || !learnInput.trim() || building) return;
                setBuilding(true);
                try {
                  const row = await createCourse(learnInput.trim());
                  onOpenChapter(row);
                } catch (err) { setError(err.message); } finally { setBuilding(false); }
              }}
              placeholder="Course title, e.g. Basic Trigonometry"
              disabled={!!building}
            />
            <button
              className="start-btn"
              disabled={!!building || !learnInput.trim()}
              onClick={async () => {
                setBuilding(true);
                try {
                  const row = await createCourse(learnInput.trim());
                  onOpenChapter(row);
                } catch (err) { setError(err.message); } finally { setBuilding(false); }
              }}
            >
              {building === true ? "Creating…" : "Create course"}
            </button>
          </div>
        )}
        {role === "teacher" && (
          <div className="book new-book">
            <h3>Add a full workbook</h3>
            <p className="new-book-hint">Paste a chapter of the coursework or upload a .txt — it becomes illustrated topics with a learning path.</p>
            <textarea
              className="learn-paste"
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste the chapter text…"
              rows={3}
              disabled={!!building}
            />
            <label className="link-btn file-btn">
              …or upload a .txt file
              <input type="file" accept=".txt,.md,text/plain" onChange={onFile} hidden />
            </label>
            <button className="start-btn" onClick={() => build()} disabled={!!building || !pasteText.trim()}>
              {building === true ? "Building… ~1 min" : "Build the course"}
            </button>
          </div>
        )}
      </section>

      {role === "student" && (
        <>
          <h3 className="shelf-section-title"><IconSparkle size={17} /> Topics I'm curious about <span className="shelf-sub">learn anything, then teach it</span></h3>
          <section className="shelf">
            {topics.map(renderBook)}
            {pendingBuild && (
              <div className="book building-book">
                <span className="book-cover"><Loader label="building…" /></span>
                <span className="book-title">{pendingBuild.title}</span>
                <span className="book-meta">pulling real material — about a minute, safe to leave</span>
              </div>
            )}
            <div className="book new-book">
              <h3>Wonder about something?</h3>
              <input
                className="learn-input"
                value={learnInput}
                onChange={e => setLearnInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && build()}
                placeholder="Any topic — we pull real material"
                disabled={!!building}
              />
              <div className="suggest-chips">
                {SUGGESTED_TOPICS.filter(t => !topics.some(c => c.title.toLowerCase().includes(t.toLowerCase()))).slice(0, 4).map(t => (
                  <button key={t} className="chapter-chip" onClick={() => build(t)} disabled={!!building}>
                    {building === t ? "building…" : <><IconSparkle size={12} /> {t}</>}
                  </button>
                ))}
              </div>
              <button className="start-btn" onClick={() => build()} disabled={!!building || !learnInput.trim()}>
                {building === true ? "Building… ~1 min" : "Learn it"}
              </button>
            </div>
          </section>
          <SnapWonder />
        </>
      )}
    </div>
  );
}
