// DemoMode — the self-driving 2-minute tour. Hit record, hit start: the app
// navigates itself while a narrator explains the problem, the agents, and every
// feature, with subtitles. All narration is synthesized up front so the run is
// gap-free and lands under the 2:00 cap.
import { useEffect, useRef, useState } from "react";
import { synthesizeSpeech, playAudioUrl, speak, stopSpeaking } from "../lib/voice.js";

const VOICE = "ash";

// ~190 words total ≈ 100 seconds of speech + transitions < 2:00.
// focus: selector the spotlight ring tracks. during: timed mid-step moves.
const SCRIPT = [
  {
    id: "problem",
    caption: "Reading feels like learning. It isn't.",
    say: "Every student can pass a quiz by pattern matching. Reading feels like learning — it isn't. And teachers find out who truly understood months too late, at the exam.",
    drive: "landing",
    focus: ".problem-line"
  },
  {
    id: "agents",
    caption: "Six agents, one classroom — with real long-term memory.",
    say: "Protégé flips the classroom with six AI agents: four teachable classmates with real long-term memory, a hidden evaluator inside every reply, and a companion watching the whole class.",
    drive: "landingAgents",
    focus: ".agent-grid",
    during: [{ at: 8000, focus: ".agent-wide-row" }]
  },
  {
    id: "shelf",
    caption: "Any chapter becomes an illustrated course.",
    say: "Teachers drop in any workbook chapter and it becomes an illustrated course. Students also chase their own curiosities — anything becomes learnable.",
    drive: "shelf",
    focus: ".shelf"
  },
  {
    id: "cards",
    caption: "One idea per card · quick checks · a minute per topic.",
    say: "Learning is fast intake. One idea per card, key terms swept in highlighter, and a quick self check — about a minute per topic.",
    drive: "cards",
    focus: ".deck-card"
  },
  {
    id: "reels",
    caption: "Cinematic reels — the concept where you actually meet it.",
    say: "Then the hook: cinematic reels and narrated real-world uses. Trigonometry as a skate ramp, not a formula.",
    drive: "reels",
    focus: ".reel-phone"
  },
  {
    id: "teach",
    caption: "Teaching is the proof. Maya only gets it if YOU do.",
    say: "But reading isn't proof — teaching is. Meet Maya. She remembers past sessions, freezes on math, and asks why. Talk, type, or draw — she reads your shapes. A hidden evaluator credits only real explanations, quoting the student's own words as evidence.",
    drive: "call",
    focus: ".stage",
    during: [{ at: 9000, focus: ".call-caption" }, { at: 15000, focus: ".ptt-cluster" }]
  },
  {
    id: "teacher",
    caption: "The gradebook fills itself — evidence, not grading.",
    say: "Flip to teacher. The gradebook fills itself: mastery by concept, communication and confidence per student, streaks and prizes — and a class companion that says exactly what to reteach tomorrow.",
    drive: "insights",
    focus: ".ledger",
    during: [
      { at: 4500, focus: ".viz-grid" },
      { at: 8000, focus: ".gradebook", scrollTo: ".gradebook" },
      { at: 12500, focus: ".companion", scrollTo: ".companion" }
    ]
  },
  {
    id: "close",
    caption: "Protégé — they only learn if you truly understand.",
    say: "Protégé. They only learn — if you truly understand.",
    drive: "landing",
    focus: ".hero-title"
  }
];

export default function DemoMode({ driver, onExit }) {
  const [phase, setPhase] = useState("prep");   // prep | count | run | done
  const [count, setCount] = useState(3);
  const [stepIdx, setStepIdx] = useState(-1);
  const [focusSel, setFocusSel] = useState(null);
  const [focusRect, setFocusRect] = useState(null);
  const audioRef = useRef({});
  const cancelled = useRef(false);

  // Spotlight ring: track the focused element through scrolls and layout shifts.
  useEffect(() => {
    if (!focusSel) { setFocusRect(null); return; }
    const track = () => {
      const el = document.querySelector(focusSel);
      if (!el) { setFocusRect(null); return; }
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.bottom < 0 || r.top > window.innerHeight) { setFocusRect(null); return; }
      setFocusRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    track();
    const iv = setInterval(track, 200);
    return () => clearInterval(iv);
  }, [focusSel]);

  // StrictMode double-mounts: reset the flag on (re)mount or the remounted
  // effect sees the first cleanup's cancel and the whole tour never starts.
  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; stopSpeaking(); };
  }, []);

  // Phase 1: pipelined synthesis, STRICTLY sequential — the voice fn wedges on
  // concurrent streams, but a lone line renders in ~6-8s while playback of the
  // previous line takes ~12s, so one worker stays ahead of the narrator.
  // Promises are stored per line; the tour starts the moment line 1 is ready.
  useEffect(() => {
    const resolvers = {};
    for (const s of SCRIPT) audioRef.current[s.id] = new Promise(r => { resolvers[s.id] = r; });
    (async () => {
      for (const s of SCRIPT) {
        if (cancelled.current) return;
        resolvers[s.id](await synthesizeSpeech(s.say, { voice: VOICE }).catch(() => null));
      }
    })();
    audioRef.current[SCRIPT[0].id].then(() => { if (!cancelled.current) setPhase("count"); });
  }, []);

  // Phase 2: countdown so the user can hit record.
  useEffect(() => {
    if (phase !== "count") return;
    if (count === 0) { setPhase("run"); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Phase 3: the run.
  useEffect(() => {
    if (phase !== "run") return;
    (async () => {
      for (let i = 0; i < SCRIPT.length; i++) {
        if (cancelled.current) return;
        const s = SCRIPT[i];
        setStepIdx(i);
        try { await driver[s.drive]?.(); } catch { /* keep the tour moving */ }
        setFocusSel(s.focus || null);
        const timers = (s.during || []).map(d => setTimeout(() => {
          if (cancelled.current) return;
          if (d.scrollTo) document.querySelector(d.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "center" });
          if (d.focus) setFocusSel(d.focus);
        }, d.at));
        const url = await Promise.race([audioRef.current[s.id], new Promise(r => setTimeout(() => r(null), 30000))]);
        if (cancelled.current) { timers.forEach(clearTimeout); return; }
        try {
          if (url) await playAudioUrl(url);
          else await speak(s.say, { voice: VOICE });
        } catch { await new Promise(r => setTimeout(r, 6000)); }
        timers.forEach(clearTimeout);
        setFocusSel(null);
        await new Promise(r => setTimeout(r, 350));
      }
      if (!cancelled.current) { setPhase("done"); setTimeout(() => onExit(), 2500); }
    })();
  }, [phase]);   // eslint-disable-line

  const step = SCRIPT[stepIdx];
  return (
    <div className="demo-layer">
      {phase === "run" && focusRect && (
        <div
          className="demo-focus"
          style={{ top: focusRect.top - 8, left: focusRect.left - 8, width: focusRect.width + 16, height: focusRect.height + 16 }}
        />
      )}
      {phase === "prep" && (
        <div className="demo-center">
          <p className="demo-big">Preparing the narrator…</p>
          <p className="demo-small">synthesizing the voiceover — a few seconds</p>
        </div>
      )}
      {phase === "count" && (
        <div className="demo-center">
          <p className="demo-count">{count === 0 ? "go" : count}</p>
          <p className="demo-small">start your screen recording now</p>
        </div>
      )}
      {phase === "run" && step && (
        <div className="demo-subtitle">
          <span className="demo-badge">DEMO</span>
          <p className="demo-caption">{step.caption}</p>
          <span className="demo-ticks">
            {SCRIPT.map((_, n) => <i key={n} className={n <= stepIdx ? "on" : ""} />)}
          </span>
        </div>
      )}
      {phase === "done" && (
        <div className="demo-center">
          <p className="demo-big">That's Protégé.</p>
        </div>
      )}
      <button className="demo-exit" onClick={() => { cancelled.current = true; stopSpeaking(); onExit(); }} aria-label="exit demo">✕</button>
    </div>
  );
}
