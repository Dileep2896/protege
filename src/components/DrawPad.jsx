// DrawPad — handwriting input for tablets (pointer events: stylus, finger, mouse).
// Feels like a shared worksheet: Milo's current question stays visible while the
// student writes their answer under it. Read -> preview what Milo will read ->
// send straight to him (or edit in the text box first).
import { useEffect, useRef, useState } from "react";
import { transcribeDrawing } from "../lib/backend.js";
import MiloFace from "./MiloFace.jsx";

const W = 880, H = 400;

export default function DrawPad({ lastMilo, onText, onSend, onClose, inline = false, agentName = "Milo" }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [tool, setTool] = useState("pen");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [empty, setEmpty] = useState(true);
  const [preview, setPreview] = useState(null);   // transcription awaiting send

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (W / r.width),
      y: (e.clientY - r.top) * (H / r.height),
      p: e.pressure && e.pressure > 0 ? e.pressure : 0.5
    };
  }

  function down(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    setEmpty(false);
    setPreview(null);          // new strokes invalidate an old reading
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#2456A6";
      ctx.lineWidth = 2 + p.p * 3;
    } else {
      ctx.globalCompositeOperation = "destination-out";   // erase to the ruled paper
      ctx.lineWidth = 28;
    }
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }

  function up() { drawing.current = false; }

  function clear() {
    canvasRef.current.getContext("2d").clearRect(0, 0, W, H);
    setEmpty(true);
    setPreview(null);
    setError(null);
  }

  // Export strokes composited onto paper so the vision model sees ink on paper.
  function exportImage() {
    const tmp = document.createElement("canvas");
    tmp.width = W; tmp.height = H;
    const ctx = tmp.getContext("2d");
    ctx.fillStyle = "#FDFCF8";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(canvasRef.current, 0, 0);
    return tmp.toDataURL("image/jpeg", 0.85);
  }

  async function read() {
    if (busy || empty) return;
    setBusy(true);
    setError(null);
    try {
      const { text } = await transcribeDrawing(exportImage());
      setPreview(text);
    } catch (err) {
      setError(`Couldn't read it: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const body = (
      <div className={`drawpad-sheet ${inline ? "inline" : ""}`}>
        {lastMilo && (
          <div className="drawpad-question">
            <MiloFace mood={busy ? "thinking" : lastMilo.mood || "confused"} size={38} />
            <div className="drawpad-question-bubble">{lastMilo.text}</div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="drawpad-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />

        {!preview && (
          <div className="drawpad-toolbar">
            <div className="drawpad-tools">
              <button className={tool === "pen" ? "active" : ""} onClick={() => setTool("pen")}>✏️ Pen</button>
              <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}>Eraser</button>
              <button onClick={clear}>Clear</button>
            </div>
            <div className="drawpad-tools">
              {!inline && <button onClick={onClose}>Cancel</button>}
              <button className="drawpad-send" onClick={read} disabled={busy || empty}>
                {busy ? `${agentName} is reading…` : `Show ${agentName}`}
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div className="drawpad-preview">
            <p className="drawpad-preview-label">{agentName} reads this as:</p>
            <blockquote className="drawpad-preview-text">“{preview}”</blockquote>
            <div className="drawpad-tools">
              <button className="drawpad-send" onClick={() => { onSend(preview); inline ? clear() : onClose(); }}>
                Yes — teach them that
              </button>
              <button onClick={() => { onText(preview); inline ? setPreview(null) : onClose(); }}>Fix it in the text box</button>
              <button onClick={() => setPreview(null)}>Keep writing</button>
            </div>
          </div>
        )}

        {!preview && !inline && (
          <p className="drawpad-hint">
            Write your answer to Milo like on paper — he'll read your handwriting and you'll see what he understood before it counts.
          </p>
        )}
        {error && <p className="drawpad-error">{error}</p>}
      </div>
  );

  if (inline) return body;
  return (
    <div className="report-overlay" role="dialog" aria-label="Write your explanation">
      {body}
    </div>
  );
}
