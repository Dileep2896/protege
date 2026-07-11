// CallView — the classroom call. Meet-style: agent tiles + your camera tile, a
// shared stage (whiteboard / chapter slides), chat rail with push-to-talk.
// Purely presentational over the same useSession state as the classic view.
import { useEffect, useRef, useState } from "react";
import MiloFace from "./MiloFace.jsx";
import DrawPad from "./DrawPad.jsx";
import { speechToText, speak, stopSpeaking, createRecorder } from "../lib/voice.js";
import { listChapters, chapterTopics } from "../lib/backend.js";
import { IconBook, IconMic, IconChat, IconSpeaker, IconSpeakerOff, IconFolder } from "./Icons.jsx";

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

function Slides({ onClose }) {
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState(null);
  const [i, setI] = useState(0);
  useEffect(() => { listChapters().then(setChapters).catch(() => {}); }, []);
  if (!topics) {
    return (
      <div className="slides-picker">
        <p className="section-label">Present a chapter</p>
        {chapters.length === 0 && <p className="home-hint">No chapters yet — build one from the home screen.</p>}
        {chapters.map(c => (
          <button key={c.id} className="chapter-chip" onClick={() => chapterTopics(c.id).then(ts => { setTopics(ts); setI(0); })}>
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

export default function CallView({ session, pack, agents, onClassic }) {
  const [stage, setStage] = useState("board");           // board | slides
  const [micState, setMicState] = useState("idle");      // idle | recording | transcribing
  const [voiceOn, setVoiceOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);       // talk-first; chat on demand
  const [speaking, setSpeaking] = useState(null);        // agent name currently speaking
  const [draft, setDraft] = useState("");
  const recorder = useRef(createRecorder());
  const spokenCount = useRef(session.messages.length);
  const chatRef = useRef(null);

  // Speak each new agent message aloud (queued in order).
  useEffect(() => {
    if (!voiceOn) { spokenCount.current = session.messages.length; return; }
    const fresh = session.messages.slice(spokenCount.current).filter(m => m.who === "milo");
    if (!fresh.length) { spokenCount.current = session.messages.length; return; }
    spokenCount.current = session.messages.length;
    (async () => {
      for (const m of fresh) {
        const agent = agents.find(a => a.name === m.name) || agents[0];
        setSpeaking(agent.name);
        try { await speak(m.text, { voice: agent.voice }); } catch { /* keep going */ }
      }
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

  const lastAgentMsg = name =>
    [...session.messages].reverse().find(m => m.who === "milo" && (m.name || agents[0].name) === name);
  const lastMsg = session.messages[session.messages.length - 1];

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
            {stage === "slides" && <Slides />}
          </div>
        </div>

        {!chatOpen && lastMsg && (
          <div className="call-caption">
            <span className="rail-who">{lastMsg.who === "milo" ? (lastMsg.name || agents[0].name) : "You"}:</span>{" "}
            {lastMsg.text}
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
          <button
            className={`ptt ${micState}`}
            onPointerDown={micDown}
            onPointerUp={micUp}
            onPointerLeave={micUp}
            disabled={session.thinking || session.restoring}
          >
            {micState === "recording" ? "● listening — release to send"
              : micState === "transcribing" ? "…got it, sending"
              : <><IconMic size={14} /> hold to talk</>}
          </button>
          <button className="voice-toggle" onClick={() => setChatOpen(!chatOpen)}>
            <IconChat size={14} /> {chatOpen ? "hide chat" : "chat"}
          </button>
          <button className="voice-toggle" onClick={() => { if (voiceOn) stopSpeaking(); setVoiceOn(!voiceOn); }}>
            {voiceOn ? <IconSpeaker size={15} /> : <IconSpeakerOff size={15} />}
          </button>
        </div>
      </div>

      {chatOpen && (
        <aside className="call-rail">
          <p className="section-label">Class chat · {pack.title}</p>
          <div className="rail-chat" ref={chatRef}>
            {session.messages.map((m, i) => (
              <div key={i} className={`rail-msg ${m.who}`}>
                <span className="rail-who">{m.who === "milo" ? (m.name || agents[0].name) : "You"}</span>
                <span className="rail-text">{m.text}</span>
              </div>
            ))}
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
