// CallView — the classroom call. Meet-style: agent tiles + your camera tile, a
// shared stage (whiteboard / chapter slides), chat rail with push-to-talk.
// Purely presentational over the same useSession state as the classic view.
import { useEffect, useRef, useState } from "react";
import MiloFace from "./MiloFace.jsx";
import DrawPad from "./DrawPad.jsx";
import { speechToText, speak, stopSpeaking, createRecorder } from "../lib/voice.js";
import { listChapters, chapterTopics } from "../lib/backend.js";
import { IconBook, IconMic, IconChat, IconSpeaker, IconSpeakerOff, IconFolder, IconHangup } from "./Icons.jsx";
import Loader from "./Loader.jsx";

function YouTile({ name }) {
  const videoRef = useRef(null);
  const [cam, setCam] = useState(false);
  useEffect(() => {
    let stream;
    navigator.mediaDevices?.getUserMedia({ video: { width: 480 } })
      .then(s => { stream = s; if (videoRef.current) { videoRef.current.srcObject = s; setCam(true); } })
      .catch(() => setCam(false));
    return () => stream?.getTracks().forEach(t => t.stop());
  }, []);
  return (
    <div className="tile you-tile">
      <video ref={videoRef} autoPlay muted playsInline style={{ display: cam ? "block" : "none" }} />
      {!cam && <div className="tile-avatar">{(name || "You")[0]}</div>}
      <span className="tile-name">{name || "You"} · teaching</span>
    </div>
  );
}

function Slides({ chapterId }) {
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState(null);
  const [busy, setBusy] = useState(!!chapterId);
  const [i, setI] = useState(0);
  useEffect(() => { listChapters().then(setChapters).catch(() => {}); }, []);

  function open(id) {
    setBusy(true);
    chapterTopics(id)
      .then(ts => { setTopics(ts); setI(0); })
      .catch(() => {})
      .finally(() => setBusy(false));
  }

  // The session already knows its course — open its slides directly.
  useEffect(() => { if (chapterId) open(chapterId); }, [chapterId]);   // eslint-disable-line

  if (busy && !topics) return <Loader label="laying out the slides…" />;
  if (!topics) {
    return (
      <div className="slides-picker">
        <p className="section-label">Present a chapter</p>
        {chapters.length === 0 && <p className="home-hint">No chapters yet — build one from the home screen.</p>}
        {chapters.map(c => (
          <button key={c.id} className="chapter-chip" onClick={() => open(c.id)}>
            <IconBook size={13} /> {c.title}
          </button>
        ))}
      </div>
    );
  }
  const t = topics[i];
  return (
    <div className="slides">
      <div className="slide">
        {t.image && <img src={t.image} alt="" />}
        <div className="slide-caption">
          <h4>{String(i + 1).padStart(2, "0")} · {t.title}</h4>
          <p>{t.key_idea}</p>
        </div>
      </div>
      <div className="slide-nav">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>← Prev</button>
        <span>{i + 1} / {topics.length}</span>
        <button onClick={() => setI(Math.min(topics.length - 1, i + 1))} disabled={i === topics.length - 1}>Next →</button>
        <button className="link-btn" onClick={() => setTopics(null)}>change chapter</button>
      </div>
    </div>
  );
}

export default function CallView({ session, pack, agents, onClassic, onLeave, chapterId, startMuted = false }) {
  const [stage, setStage] = useState("board");           // board | slides
  const [micState, setMicState] = useState("idle");      // idle | recording | transcribing
  const [voiceOn, setVoiceOn] = useState(!startMuted);
  const [chatOpen, setChatOpen] = useState(false);       // talk-first; chat on demand
  const [speaking, setSpeaking] = useState(null);        // agent name currently speaking
  const [pendingVoice, setPendingVoice] = useState(() => new Set());   // msg indices held until audio starts
  const [draft, setDraft] = useState("");
  const recorder = useRef(createRecorder());
  const spokenCount = useRef(session.messages.length);
  const chatRef = useRef(null);

  // Speak each new agent message aloud (queued in order). The text stays
  // hidden until the audio actually starts, so voice and words land together.
  // leaving the call must silence any in-flight line
  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    // a restored transcript is history, not new speech — never re-speak it,
    // and never speak at all while the guided demo narrator has the floor
    if (!voiceOn || session.restoring || window.__protegeDemo) { spokenCount.current = session.messages.length; setPendingVoice(new Set()); return; }
    const startIdx = spokenCount.current;
    const fresh = session.messages.slice(startIdx)
      .map((m, j) => ({ m, idx: startIdx + j }))
      .filter(x => x.m.who === "milo");
    if (!fresh.length) { spokenCount.current = session.messages.length; return; }
    spokenCount.current = session.messages.length;
    setPendingVoice(prev => { const s = new Set(prev); fresh.forEach(x => s.add(x.idx)); return s; });
    // failsafe: autoplay-blocked browsers must still get the text
    const failsafe = setTimeout(() => {
      setPendingVoice(prev => { const s = new Set(prev); fresh.forEach(x => s.delete(x.idx)); return s; });
    }, 6000);
    (async () => {
      for (const { m, idx } of fresh) {
        const agent = agents.find(a => a.name === m.name) || agents[0];
        setSpeaking(agent.name);
        const reveal = () => setPendingVoice(prev => { const s = new Set(prev); s.delete(idx); return s; });
        try { await speak(m.text, { voice: agent.voice, onStart: reveal }); } catch { /* keep going */ }
        reveal();   // safety: never leave a reply hidden
      }
      clearTimeout(failsafe);
      setSpeaking(null);
    })();
  }, [session.messages, voiceOn]);   // eslint-disable-line

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages, micState]);

  async function micDown() {
    if (micState !== "idle" || session.thinking) return;
    stopSpeaking();
    try {
      await recorder.current.start();
      setMicState("recording");
    } catch {
      setMicState("idle");
    }
  }

  async function micUp() {
    if (micState !== "recording") return;
    setMicState("transcribing");
    try {
      const blob = await recorder.current.stop();
      if (blob && blob.size > 2000) {
        const text = await speechToText(blob);
        if (text) session.sendTurn(text);
      }
    } catch (err) {
      console.warn("[milo] stt failed:", err.message);
    } finally {
      setMicState("idle");
    }
  }

  function sendDraft(e) {
    e?.preventDefault();
    const t = draft.trim();
    if (!t || session.thinking) return;
    setDraft("");
    session.sendTurn(t);
  }

  const visibleMessages = session.messages.filter((_, i) => !pendingVoice.has(i));
  const lastAgentMsg = name =>
    [...visibleMessages].reverse().find(m => m.who === "milo" && (m.name || agents[0].name) === name);
  const lastMsg = visibleMessages[visibleMessages.length - 1];
  const voiceBrewing = pendingVoice.size > 0;

  return (
    <div className={`call ${chatOpen ? "" : "chat-closed"}`}>
      <div className="call-main">
        <div className="stage">
          <div className="stage-tabs">
            <button className={stage === "board" ? "active" : ""} onClick={() => setStage("board")}>Whiteboard</button>
            <button className={stage === "slides" ? "active" : ""} onClick={() => setStage("slides")}>Slides</button>
            <button className="stage-exit" onClick={onClassic}><IconFolder size={13} /> Checklist view</button>
          </div>
          <div className="stage-body">
            {stage === "board" && (
              <DrawPad
                inline
                agentName={agents[0].name}
                lastMilo={null}
                onText={t => { setDraft(d => (d ? d + " " + t : t)); setChatOpen(true); }}
                onSend={t => session.sendTurn(t)}
                onClose={() => {}}
              />
            )}
            {stage === "slides" && <Slides chapterId={chapterId} />}
          </div>
        </div>

        {!chatOpen && (voiceBrewing || lastMsg) && (
          <div className={`call-caption ${voiceBrewing ? "brewing" : ""}`}>
            {voiceBrewing ? (
              <>
                <span className="rail-who">{speaking || agents[0].name}</span>
                <span className="brew-dots" aria-label="about to speak"><i /><i /><i /></span>
                <span className="brew-hint">about to say it out loud…</span>
              </>
            ) : (
              <>
                <span className="rail-who">{lastMsg.who === "milo" ? (lastMsg.name || agents[0].name) : "You"}:</span>{" "}
                {lastMsg.text}
              </>
            )}
          </div>
        )}

        <div className="tiles">
          {agents.map(a => {
            const m = lastAgentMsg(a.name);
            const mood = speaking === a.name ? "clicking" : (m?.mood || "confused");
            return (
              <div key={a.name} className={`tile agent-tile ${speaking === a.name ? "speaking" : ""} ${session.thinking ? "waiting" : ""}`} title={`${a.name} · ${a.tag}`}>
                <MiloFace mood={session.thinking ? "thinking" : mood} size={64} />
                <span className="tile-name">{a.name}</span>
              </div>
            );
          })}
          <YouTile name="You" />
        </div>

        <div className="call-bar">
          {onLeave && (
            <button className="call-leave" onClick={() => { stopSpeaking(); onLeave(); }} title="leave the call">
              <IconHangup size={22} />
            </button>
          )}
          <div className="ptt-cluster">
            <button
              className={`ptt-round ${micState}`}
              onPointerDown={micDown}
              onPointerUp={micUp}
              onPointerLeave={micUp}
              disabled={session.thinking || session.restoring}
              aria-label="hold to talk"
            >
              <IconMic size={24} />
            </button>
            <span className={`ptt-hint ${micState}`}>
              {micState === "recording" ? "listening — let go to send"
                : micState === "transcribing" ? "got it — sending…"
                : session.thinking ? `${agents[0].name} is thinking…`
                : "hold to talk"}
            </span>
          </div>
          <div className="call-bar-side">
            <button className="voice-toggle" onClick={() => setChatOpen(!chatOpen)}>
              <IconChat size={14} /> {chatOpen ? "hide chat" : "chat"}
            </button>
            <button className="voice-toggle" onClick={() => { if (voiceOn) stopSpeaking(); setVoiceOn(!voiceOn); }}>
              {voiceOn ? <IconSpeaker size={15} /> : <IconSpeakerOff size={15} />}
            </button>
          </div>
        </div>
      </div>

      {chatOpen && (
        <aside className="call-rail">
          <p className="section-label">Class chat · {pack.title}</p>
          <div className="rail-chat" ref={chatRef}>
            {visibleMessages.map((m, i) => (
              <div key={i} className={`rail-msg ${m.who}`}>
                <span className="rail-who">{m.who === "milo" ? (m.name || agents[0].name) : "You"}</span>
                <span className="rail-text">{m.text}</span>
              </div>
            ))}
            {voiceBrewing && (
              <div className="rail-msg milo">
                <span className="rail-who">{speaking || agents[0].name}</span>
                <span className="rail-text brew-dots-inline"><span className="brew-dots"><i /><i /><i /></span></span>
              </div>
            )}
            {session.thinking && <div className="rail-msg milo"><span className="rail-who">…</span><span className="rail-text">thinking</span></div>}
          </div>
          <form className="rail-composer" onSubmit={sendDraft}>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={micState === "transcribing" ? "hearing you…" : "type here…"}
              disabled={session.thinking || session.restoring}
            />
            <button type="submit" disabled={!draft.trim() || session.thinking} aria-label="send">→</button>
          </form>
        </aside>
      )}
    </div>
  );
}
