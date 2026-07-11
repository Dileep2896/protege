// Workspace — a course opened from the bookshelf. Left sidebar navigates the
// course's features; the top-level role toggle (student/teacher) changes defaults
// and which panels lead. Learning happens on flip-cards; teaching launches Milo
// or the class of three.
import { useEffect, useRef, useState } from "react";
import PathGraph from "./PathGraph.jsx";
import { ConfirmModal, NoticeModal } from "./Modal.jsx";
import {
  chapterTopics, illustrateTopic, packForTopic, addTopic, extendCourse,
  reelStart, reelPoll, topicVideo, videoReelTopics, applicationsFor, setTopicWeek,
  listSessions, deleteSession
} from "../lib/backend.js";
import learnersSeed from "../../packs/learners.json";
import personas from "../../packs/personas.json";
import { IconBook, IconMap, IconCap, IconFolder, IconPlus, IconCalendar, IconPin, IconCards, IconFilm, IconVideo, IconSpeaker, IconSpeakerOff, IconPlay } from "./Icons.jsx";
import { speak, stopSpeaking } from "../lib/voice.js";
import Loader from "./Loader.jsx";

const NAV = [
  { id: "learn", Icon: IconBook, label: "Learn" },
  { id: "path", Icon: IconMap, label: "Path" },
  { id: "teach", Icon: IconCap, label: "Teach" },
  { id: "sessions", Icon: IconFolder, label: "Sessions & reports" },
  { id: "add", Icon: IconPlus, label: "Grow course" }
];

// Chrome won't reliably play multi-MB data-URI videos — hand it a Blob URL instead.
function toBlobUrl(dataUri) {
  const comma = dataUri.indexOf(",");
  const mime = dataUri.slice(5, dataUri.indexOf(";"));
  const bin = atob(dataUri.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function ReelMain({ topic, index, onTeach, teachBusy, role }) {
  const [videoSrc, setVideoSrc] = useState(null);
  const [genState, setGenState] = useState("idle");   // idle | generating | failed
  const [checked, setChecked] = useState(false);
  const [sound, setSound] = useState(false);          // autoplay must start muted; one tap turns sound on

  useEffect(() => {
    // videos are heavy, fetched lazily per slide
    let url = null;
    topicVideo(topic.id)
      .then(v => { if (v) { url = toBlobUrl(v); setVideoSrc(url); } setChecked(true); })
      .catch(() => setChecked(true));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [topic.id]);

  async function generate() {
    if (genState === "generating") return;
    setGenState("generating");
    try {
      const start = await reelStart(topic.id);
      if (start.cached) {
        const v = await topicVideo(topic.id);
        if (v) setVideoSrc(toBlobUrl(v));
        return;
      }
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 9000));
        const st = await reelPoll(topic.id, start.job_id);
        if (st.status === "completed") {
          const v = await topicVideo(topic.id);
          if (v) setVideoSrc(toBlobUrl(v));
          return;
        }
        if (st.status === "failed") { setGenState("failed"); return; }
      }
      setGenState("failed");
    } catch {
      setGenState("failed");
    }
  }

  return (
    <>
      {videoSrc ? (
        <>
          <video src={videoSrc} autoPlay loop muted={!sound} playsInline onClick={() => setSound(s => !s)} />
          <button className="reel-sound" onClick={() => setSound(s => !s)} aria-label={sound ? "mute" : "unmute"}>
            {sound ? <IconSpeaker size={14} /> : <><IconSpeakerOff size={14} /> tap for sound</>}
          </button>
        </>
      ) : (
        <div className="reel-placeholder" style={topic.image ? { backgroundImage: `url(${topic.image})` } : {}}>
          {checked && role === "teacher" && (
            <button className="reel-gen" onClick={generate} disabled={genState === "generating"}>
              {genState === "generating" ? <><IconVideo size={14} /> filming… ~2 min</> : genState === "failed" ? <><IconVideo size={14} /> try again</> : <><IconVideo size={14} /> Make it a video (~$1)</>}
            </button>
          )}
        </div>
      )}
      <div className="reel-caption">
        <span className="reel-num">{videoSrc && topic.video_caption ? "spot the concept" : `topic ${String(index + 1).padStart(2, "0")}`}{topic.mastered ? " · taught ✓" : ""}</span>
        <h4>{topic.title}</h4>
        <p>{(videoSrc && topic.video_caption) || topic.key_idea}</p>
        <button className="teach-btn" onClick={() => onTeach(topic)} disabled={!!teachBusy}>
          {teachBusy === topic.id ? "…" : role === "teacher" ? "Preview lesson" : "Now teach it"}
        </button>
      </div>
    </>
  );
}

// A "where you'll actually meet this" slide — the real-world application reel.
// Renders INSIDE a .reel-phone provided by the feed. Play = Ken Burns motion
// over the illustration while the application is narrated aloud (TTS).
function AppSlide({ topic, app, appIndex }) {
  const [playing, setPlaying] = useState(false);
  async function narrate() {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    try { await speak(`${app.where}. ${app.how}`, { voice: "coral" }); } catch { /* stays visual */ }
    setPlaying(false);
  }
  return (
    <>
      <div className={`reel-app-bg ${playing ? "kb" : ""}`} style={topic.image ? { backgroundImage: `url(${topic.image})` } : {}} />
      <div className="reel-app">
        <span className="reel-app-kicker">in the real world · {appIndex + 1}/{(topic.applications || []).length}</span>
        <h4>{app.where}</h4>
        <p>{app.how}</p>
        <button className="reel-narrate" onClick={narrate}>
          {playing ? <><IconSpeaker size={14} /> playing — tap to stop</> : <><IconPlay size={14} /> play this reel</>}
        </button>
      </div>
      <div className="reel-caption reel-caption-slim">
        <span className="reel-num">{topic.title}</span>
      </div>
    </>
  );
}

// One thought per card. Reading is the 60-second intake; teaching is the proof.
function chunkText(text, maxLen = 190) {
  const sentences = (text || "").match(/[^.!?]+[.!?]+["']?\s*/g) || [text || ""];
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && (cur + s).length > maxLen) { chunks.push(cur.trim()); cur = s; }
    else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

const readKey = id => `protege_read_${id}`;

// Sweep the topic's own vocabulary with highlighter wherever it appears.
function emphasize(text, terms) {
  if (!terms.length || !text) return text;
  const re = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}|\\b\\d+(?:[/.]\\d+)?°?)`, "gi");
  const parts = text.split(re);
  return parts.map((p, n) => n % 2 === 1 ? <mark key={n} className="hl-word">{p}</mark> : p);
}

function TopicDeck({ topic, index, role, onTeach, teachBusy, onClose }) {
  const apps = Array.isArray(topic.applications) ? topic.applications : [];
  const check = topic.pack?.check_problem;
  const terms = [...new Set((topic.title || "").split(/\W+/).filter(w => w.length >= 5).map(w => w.toLowerCase()))].slice(0, 4);
  const steps = chunkText(topic.explanation);
  const cards = [
    { kind: "cover" },
    ...steps.map((text, n) => ({ kind: "step", text, n })),
    ...(topic.summary ? [{ kind: "short", text: topic.summary }] : []),
    ...(apps.length ? [{ kind: "world", app: apps[0] }] : []),
    ...(check ? [{ kind: "check", check }] : []),
    { kind: "finale" }
  ];
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const go = n => {
    const next = Math.max(0, Math.min(cards.length - 1, n));
    setDir(next >= i ? 1 : -1);
    setI(next);
    setRevealed(false);
    if (next === cards.length - 1) localStorage.setItem(readKey(topic.id), "1");
  };

  useEffect(() => {
    const onKey = e => {
      if (e.key === "ArrowRight" || e.key === " ") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });   // eslint-disable-line

  const c = cards[i];
  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="deck" onClick={e => e.stopPropagation()}>
        <div className="deck-progress">
          {cards.map((_, n) => (
            <button key={n} className={`deck-dot ${n === i ? "on" : n < i ? "done" : ""}`} onClick={() => go(n)} aria-label={`card ${n + 1}`} />
          ))}
          <button className="deck-close" onClick={onClose}>✕</button>
        </div>

        <div
          key={i}
          className={`deck-card ${dir > 0 ? "from-right" : "from-left"}`}
          onClick={() => { if (c.kind === "check" && !revealed) { setRevealed(true); return; } go(i + 1); }}
        >
          {c.kind === "cover" && (
            <>
              {topic.image && <img className="deck-art" src={topic.image} alt="" />}
              {topic.image && <span className="deck-art-caption">hold this picture in your head — it's the idea, drawn</span>}
              <span className="topic-num">topic {String(index + 1).padStart(2, "0")}</span>
              <h3 className="deck-title">{topic.title}</h3>
              <p className="deck-key">{topic.key_idea}</p>
            </>
          )}
          {c.kind === "step" && (
            <>
              {topic.image && <img className="deck-doodle" src={topic.image} alt="" />}
              <span className="deck-kicker">idea {c.n + 1} of {steps.length}</span>
              <p className="deck-step">{emphasize(c.text, terms)}</p>
            </>
          )}
          {c.kind === "short" && (
            <>
              <span className="deck-kicker">in short</span>
              <p className="deck-step">{emphasize(c.text, terms)}</p>
            </>
          )}
          {c.kind === "world" && (
            <>
              <span className="deck-kicker">spot it in the wild</span>
              <h3 className="deck-title deck-world-title">{c.app.where}</h3>
              <p className="deck-step deck-world-how">{c.app.how}</p>
            </>
          )}
          {c.kind === "check" && (
            <>
              <span className="deck-kicker">quick check — answer in your head first</span>
              <h3 className="deck-title deck-check-q">{c.check.question}</h3>
              {!revealed ? (
                <button className="check-reveal" onClick={e => { e.stopPropagation(); setRevealed(true); }}>
                  I've got my answer — show me
                </button>
              ) : (
                <div className="deck-answer">
                  <p className="deck-answer-main">{c.check.correct_answer}</p>
                  {c.check.correct_reasoning && <p className="deck-answer-why">{c.check.correct_reasoning}</p>}
                </div>
              )}
            </>
          )}
          {c.kind === "finale" && (
            <>
              <span className="deck-kicker">that's the whole idea</span>
              <h3 className="deck-title">Think you've got it?</h3>
              {topic.image && (
                <span className="deck-finale-art">
                  <img src={topic.image} alt="" />
                  <span className="deck-art-caption">borrow this picture — describing what's happening in it IS the explanation</span>
                </span>
              )}
              <p className="deck-key">Reading isn't proof — teaching is. {role === "teacher" ? "Preview the lesson your students get." : "Explain it until it clicks for them."}</p>
              <button
                className="hero-cta deck-teach"
                onClick={e => { e.stopPropagation(); onTeach(topic); }}
                disabled={!!teachBusy}
              >
                {teachBusy === topic.id ? "Preparing your protégé…" : role === "teacher" ? "Preview lesson" : "Teach it now →"}
              </button>
              <button className="link-btn" onClick={e => { e.stopPropagation(); go(0); }}>read it again</button>
            </>
          )}
          {c.kind !== "finale" && <span className="deck-tap-hint">tap / → for next</span>}
        </div>

        <div className="deck-nav">
          <button onClick={() => go(i - 1)} disabled={i === 0}>← back</button>
          <span className="deck-count">{i + 1} / {cards.length}</span>
          <button onClick={() => go(i + 1)} disabled={i === cards.length - 1}>next →</button>
        </div>
      </div>
    </div>
  );
}

function CoverCard({ topic, index, onOpen }) {
  const read = !!localStorage.getItem(readKey(topic.id));
  return (
    <button className={`cover-card ${topic.mastered ? "mastered" : ""}`} onClick={onOpen}>
      {topic.scheduled_week && (
        <span className={`week-badge ${topic.dueNow ? "due" : ""}`}>
          {topic.dueNow ? <><IconPin size={12} /> this week's homework</> : <><IconCalendar size={12} /> week {topic.scheduled_week}</>}
        </span>
      )}
      <span className="topic-art">
        {topic.image
          ? <img src={topic.image} alt="" loading="lazy" />
          : <span className="topic-art-loading"><span className="dot" /><span className="dot" /><span className="dot" /> sketching…</span>}
        {topic.mastered && <span className="mastered-stamp">taught ✓</span>}
      </span>
      <span className="flip-front-body">
        <span className="topic-num">{String(index + 1).padStart(2, "0")}{read && !topic.mastered ? " · read ✓" : ""}</span>
        <span className="flip-title">{topic.title}</span>
        <span className="topic-key">{topic.key_idea}</span>
        <span className="flip-hint">open the deck ↗</span>
      </span>
    </button>
  );
}

export default function Workspace({ chapter, role, packs, onStartSession, onResume, onViewReport, onBack, demoCmd }) {
  const [tab, setTab] = useState("learn");
  const [learnView, setLearnView] = useState("cards");   // cards | reels
  const [openDeck, setOpenDeck] = useState(null);        // topic id whose deck is open
  const [topics, setTopics] = useState(null);
  const [reelTopics, setReelTopics] = useState(null);   // global: only topics with a real video

  useEffect(() => {
    if (learnView !== "reels" || reelTopics) return;
    videoReelTopics().then(setReelTopics).catch(() => setReelTopics([]));
  }, [learnView]);   // eslint-disable-line

  // Demo mode drives the workspace from outside: tab, cards/reels, open deck.
  useEffect(() => {
    if (!demoCmd) return;
    if (demoCmd.tab) setTab(demoCmd.tab);
    if (demoCmd.learnView) setLearnView(demoCmd.learnView);
  }, [demoCmd]);   // eslint-disable-line
  useEffect(() => {
    if (!demoCmd || demoCmd.deck === undefined || !topics) return;
    setOpenDeck(demoCmd.deck === null ? null : (topics[demoCmd.deck]?.id ?? null));
  }, [demoCmd, topics]);   // eslint-disable-line
  const [teachBusy, setTeachBusy] = useState(null);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [newTopic, setNewTopic] = useState("");
  const [adding, setAdding] = useState(false);
  const [learnerId, setLearnerId] = useState(learnersSeed.demo_learner_id);
  const [level, setLevel] = useState(personas.default);
  const [confirmDelete, setConfirmDelete] = useState(null);   // session row pending delete
  const [notice, setNotice] = useState(null);
  const [growText, setGrowText] = useState("");
  const [growing, setGrowing] = useState(false);
  const illustrating = useRef(false);

  // Current course week from its creation date; topics scheduled for it are "due now".
  const currentWeek = chapter.created_at
    ? Math.floor((Date.now() - new Date(chapter.created_at).getTime()) / 604800000) + 1
    : 1;

  async function loadTopics() {
    const raw = await chapterTopics(chapter.id);
    const ts = raw.map(t => ({ ...t, dueNow: !t.mastered && t.scheduled_week === currentWeek }));
    setTopics(ts);
    if (illustrating.current) return;
    illustrating.current = true;
    for (const t of ts.filter(t => !t.image)) {
      try {
        const { image } = await illustrateTopic(t.id);
        setTopics(prev => prev?.map(x => x.id === t.id ? { ...x, image } : x));
      } catch (err) { console.warn("[milo] illustrate failed:", err.message); }
    }
    illustrating.current = false;
  }

  useEffect(() => { loadTopics().catch(err => setError(err.message)); }, [chapter.id]);   // eslint-disable-line
  useEffect(() => {
    if (tab === "sessions") listSessions().then(setSessions).catch(() => setSessions([]));
  }, [tab]);

  // Reels: make sure every topic has its real-world application slides (cheap LLM text).
  useEffect(() => {
    if (learnView !== "reels" || !topics) return;
    let cancelled = false;
    (async () => {
      for (const t of topics.filter(t => !t.applications)) {
        try {
          const { applications } = await applicationsFor(t.id);
          if (cancelled) return;
          setTopics(prev => prev?.map(x => x.id === t.id ? { ...x, applications } : x));
        } catch { /* slide simply doesn't render */ }
      }
    })();
    return () => { cancelled = true; };
  }, [learnView, topics === null]);   // eslint-disable-line

  async function teach(topic) {
    if (teachBusy) return;
    setTeachBusy(topic.id);
    setError(null);
    try {
      const { pack } = await packForTopic(topic.id);
      onStartSession({ packObj: pack, learnerId, level, startInCall: true, chapterId: chapter.id });
    } catch (err) {
      setError(`Couldn't build the lesson: ${err.message}`);
    } finally {
      setTeachBusy(null);
    }
  }

  async function submitGrow() {
    const text = growText.trim();
    if (!text || growing) return;
    setGrowing(true);
    setError(null);
    try {
      const res = await extendCourse(chapter.id, text);
      setGrowText("");
      illustrating.current = false;
      await loadTopics();
      setNotice(`Added ${res.added} topic${res.added === 1 ? "" : "s"}: ${res.topics.join(", ")}`);
      setTab("learn");
    } catch (err) {
      setError(err.message);
    } finally {
      setGrowing(false);
    }
  }

  function onGrowFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(t => setGrowText(t.slice(0, 24000)));
  }

  async function submitTopic() {
    const t = newTopic.trim();
    if (!t || adding) return;
    setAdding(true);
    setError(null);
    try {
      await addTopic(chapter.id, t);
      setNewTopic("");
      illustrating.current = false;
      await loadTopics();
      setTab("learn");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function removeSession(s) {
    setConfirmDelete(null);
    try {
      await deleteSession(s.id);
      setSessions(prev => prev.filter(x => x.id !== s.id));
    } catch (err) { setNotice(`Delete failed: ${err.message}`); }
  }

  const learnerName = id => learnersSeed.learners.find(l => l.id === id)?.name || id;
  const agentFirst = learnerName(learnerId).split(" ")[0];
  const mastered = topics?.filter(t => t.mastered).length || 0;

  return (
    <div className="workspace">
      <aside className="side-nav">
        <button className="side-back" onClick={onBack}>← Bookshelf</button>
        <div className="side-course">
          <h3>{chapter.title}</h3>
          {topics && (
            <div className="course-progress">
              <span className="book-progress"><span className="book-progress-fill" style={{ width: `${topics.length ? (mastered / topics.length) * 100 : 0}%` }} /></span>
              <span className="course-progress-label">{mastered}/{topics?.length || 0} taught</span>
            </div>
          )}
        </div>
        <nav>
          {NAV.filter(n => (n.id !== "add" || role === "teacher") && (n.id !== "teach" || role === "student")).map(n => (
            <button key={n.id} className={`side-item ${tab === n.id ? "active" : ""}`} onClick={() => setTab(n.id)}>
              <n.Icon size={15} className="side-icon" /> {n.label}
            </button>
          ))}
        </nav>
        <p className="side-foot">{role === "teacher" ? "Teacher view — your evidence lives in Class insights" : "Student view — learn it, then teach your protégé"}</p>
      </aside>

      <section className="work-pane">
        {error && <p className="drawpad-error">{error}</p>}

        {tab === "learn" && (
          <>
            <div className="learn-head">
              <div>
                <h2 className="work-title">Learn {chapter.title}</h2>
                <p className="home-hint">
                  {learnView === "cards"
                    ? "Open a deck — one idea per card, a minute per topic. The last card hands you the chalk."
                    : "The hook reel: where each idea shows up in the real world."}
                </p>
              </div>
              <div className="role-toggle learn-toggle">
                <button className={learnView === "cards" ? "active" : ""} onClick={() => setLearnView("cards")}><IconCards size={14} /> Cards</button>
                <button className={learnView === "reels" ? "active" : ""} onClick={() => setLearnView("reels")}><IconFilm size={14} /> Reels</button>
              </div>
            </div>
            {!topics && <Loader label="fetching the chapter…" />}
            {learnView === "cards" && (
              <div className="cards-grid">
                {topics?.map((t, i) => (
                  <CoverCard key={t.id} topic={t} index={i} onOpen={() => setOpenDeck(t.id)} />
                ))}
              </div>
            )}
            {openDeck && topics && (() => {
              const t = topics.find(x => x.id === openDeck);
              return t ? (
                <TopicDeck
                  topic={t}
                  index={topics.indexOf(t)}
                  role={role}
                  onTeach={teach}
                  teachBusy={teachBusy}
                  onClose={() => setOpenDeck(null)}
                />
              ) : null;
            })()}
            {learnView === "reels" && !reelTopics && <Loader label="loading the reels…" />}
            {learnView === "reels" && reelTopics && reelTopics.length === 0 && (
              <p className="home-hint">No video reels yet — a teacher can film one from a topic's reel slot.</p>
            )}
            {learnView === "reels" && reelTopics && reelTopics.length > 0 && (
              <div className="reel-feed">
                {reelTopics.map((t, n) => (
                  <div className="reel-slide" key={t.id}>
                    <div className="reel-phone">
                      <span className="reel-counter">{n + 1} / {reelTopics.length}</span>
                      <ReelMain topic={t} index={n} onTeach={teach} teachBusy={teachBusy} role={role} />
                      {n === 0 && reelTopics.length > 1 && (
                        <span className="swipe-hint">swipe ↓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "path" && topics && (
          <>
            <h2 className="work-title">Learning path</h2>
            <p className="home-hint">Arrows show what unlocks what. Teach a topic to strike it through.</p>
            <PathGraph topics={topics} />
          </>
        )}

        {tab === "teach" && (
          <>
            <h2 className="work-title">{role === "teacher" ? "Preview what your students get" : `Teach it to ${agentFirst}`}</h2>
            {role === "teacher" && (
              <p className="home-hint">Each topic becomes a Milo who's confused about exactly that. Your students teach him — you get the evidence in Class insights. Preview any lesson below.</p>
            )}
            <div className="teach-config">
              <label><span>Your protégé</span>
                <select value={learnerId} onChange={e => setLearnerId(e.target.value)}>
                  {learnersSeed.learners.map(l => <option key={l.id} value={l.id}>{l.name} · {l.grade}</option>)}
                </select>
              </label>
              <p className="teach-note">Sessions open as a live call — talk, write, or open the chat.</p>
            </div>
            <ul className="teach-list">
              {topics?.map((t, i) => (
                <li key={t.id}>
                  <span className={`teach-status ${t.mastered ? "done" : ""}`}>{t.mastered ? "✓" : String(i + 1).padStart(2, "0")}</span>
                  <span className="teach-topic">{t.title}</span>
                  <button className="teach-btn" onClick={() => teach(t)} disabled={!!teachBusy}>
                    {teachBusy === t.id ? "…" : role === "teacher" ? "Preview" : `Teach ${agentFirst}`}
                  </button>
                </li>
              ))}
            </ul>
            <h3 className="work-sub">Classic units</h3>
            <ul className="teach-list">
              {packs.map(p => (
                <li key={p.id}>
                  <span className="teach-status">★</span>
                  <span className="teach-topic">{p.title}</span>
                  <button className="teach-btn" onClick={() => onStartSession({ packId: p.id, learnerId, level, startInCall: true, chapterId: chapter.id })}>
                    {role === "teacher" ? "Preview" : `Teach ${agentFirst}`}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === "sessions" && (
          <>
            <h2 className="work-title">Sessions & reports</h2>
            {sessions === null && <p className="home-hint">Loading…</p>}
            {sessions?.length === 0 && <p className="home-hint">No sessions yet.</p>}
            {sessions?.length > 0 && (
              <table className="session-table">
                <thead><tr><th>When</th><th>Student</th><th>Concept</th><th>Progress</th><th></th></tr></thead>
                <tbody>
                  {sessions.map(s => {
                    const res = Object.values(s.state?.misconceptions || {}).filter(v => v === "resolved").length;
                    const tot = Object.keys(s.state?.misconceptions || {}).length;
                    return (
                      <tr key={s.id}>
                        <td>{new Date(s.updated_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                        <td>{learnerName(s.learner_id)}</td>
                        <td>{s.pack_title || s.pack_id}</td>
                        <td><span className={res === tot && tot > 0 ? "prog done" : "prog"}>{res}/{tot}</span></td>
                        <td className="row-actions">
                          <button onClick={() => onResume(s)}>Open</button>
                          {s.report && <button onClick={() => onViewReport(s)}>Report</button>}
                          <button className="danger" onClick={() => setConfirmDelete(s)}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {confirmDelete && (
          <ConfirmModal
            title="Delete this session?"
            message={`${learnerName(confirmDelete.learner_id)} · ${confirmDelete.pack_title || confirmDelete.pack_id} — the transcript and its report go with it.`}
            onConfirm={() => removeSession(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
        {notice && <NoticeModal title="Hmm." message={notice} onClose={() => setNotice(null)} />}

        {tab === "add" && (
          <>
            <h2 className="work-title">Grow this course</h2>
            <p className="home-hint">Name a single missing topic — it gets written, illustrated, and wired into the learning path.</p>
            <div className="learn-row">
              <input
                className="learn-input"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitTopic()}
                placeholder="e.g. Groundwater and aquifers"
                disabled={adding}
              />
              <button className="start-btn" onClick={submitTopic} disabled={adding || !newTopic.trim()}>
                {adding ? "Writing it…" : "Add topic"}
              </button>
            </div>

            <h3 className="work-sub">…or feed it a whole new chapter</h3>
            <p className="home-hint">Paste the next chapter of the textbook (or upload a .txt) — it becomes 2–4 new topics connected to the ones you already have.</p>
            <textarea
              className="learn-paste"
              value={growText}
              onChange={e => setGrowText(e.target.value)}
              placeholder="Paste the new chapter's text here…"
              rows={6}
              disabled={growing}
            />
            <div className="start-actions" style={{ marginTop: 10 }}>
              <button className="start-btn" onClick={submitGrow} disabled={growing || !growText.trim()}>
                {growing ? "Reading the chapter… ~1 min" : "Grow the course"}
              </button>
              <label className="link-btn file-btn">
                upload .txt
                <input type="file" accept=".txt,.md,text/plain" onChange={onGrowFile} hidden />
              </label>
            </div>

            <h3 className="work-sub">📅 Timeline — when is each topic taught?</h3>
            <p className="home-hint">Set the week for each topic. Students see that week's topics flagged as homework: learn it, then teach their protégé.</p>
            <ul className="teach-list">
              {topics?.map((t, i) => (
                <li key={t.id}>
                  <span className={`teach-status ${t.mastered ? "done" : ""}`}>{t.mastered ? "✓" : String(i + 1).padStart(2, "0")}</span>
                  <span className="teach-topic">{t.title}</span>
                  <select
                    value={t.scheduled_week || ""}
                    onChange={e => {
                      const wk = e.target.value ? Number(e.target.value) : null;
                      setTopics(prev => prev.map(x => x.id === t.id ? { ...x, scheduled_week: wk } : x));
                      setTopicWeek(t.id, wk).catch(() => {});
                    }}
                  >
                    <option value="">unscheduled</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(w => <option key={w} value={w}>week {w}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
