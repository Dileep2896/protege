import { useEffect, useRef, useState } from "react";
import MiloFace from "./MiloFace.jsx";
import DrawPad from "./DrawPad.jsx";

export default function ChatPane({ messages, thinking, restoring, error, done, onSend, agentName = "Milo" }) {
  const [draft, setDraft] = useState("");
  const [drawing, setDrawing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || thinking || restoring) return;   // never drop a turn while loading
    setDraft("");
    onSend(text);
  }

  return (
    <section className="chat-pane" aria-label="Chat with Milo">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) =>
          m.who === "milo" ? (
            <div key={i} className={`msg milo ${m.failed ? "failed" : ""}`}>
              <MiloFace mood={m.mood} />
              <div className="bubble">
                {m.name && <span className="agent-name">{m.name}</span>}
                {m.failed && <span className="fail-tag">✗ quiz attempt</span>}
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="msg student">
              <div className="bubble">{m.text}</div>
            </div>
          )
        )}
        {(thinking || (restoring && messages.length === 0)) && (
          <div className="msg milo">
            <MiloFace mood="thinking" />
            <div className="bubble thinking-bubble" aria-live="polite">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        {error && <div className="error-note">Something hiccuped: {error} — try sending again.</div>}
        {done && <div className="done-banner">{agentName} got it — restated it and solved the check problem.</div>}
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          placeholder={done ? `${agentName} gets it now — but you can keep talking` : `Explain it to ${agentName}…`}
          rows={2}
          aria-label="Your explanation"
        />
        <button
          type="button"
          className="write-btn"
          title="Write by hand (tablet/stylus)"
          onClick={() => setDrawing(true)}
          disabled={thinking || restoring}
        >
          ✏️ Write
        </button>
        <button type="submit" disabled={thinking || restoring || !draft.trim()}>
          {restoring ? "Opening notebook…" : thinking ? `${agentName} is thinking…` : `Teach ${agentName}`}
        </button>
      </form>
      {drawing && (
        <DrawPad
          agentName={agentName}
          lastMilo={[...messages].reverse().find(m => m.who === "milo")}
          onText={text => setDraft(d => (d ? d + " " + text : text))}
          onSend={text => onSend(text)}
          onClose={() => setDrawing(false)}
        />
      )}
    </section>
  );
}
