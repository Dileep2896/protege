// Landing — the worksheet, writ large. One aesthetic, executed hard: paper,
// graphite, ballpoint, one highlighter. The signature move is the strikethrough.
import MiloFace from "./MiloFace.jsx";
import {
  IconBook, IconCards, IconFilm, IconMic, IconPen, IconMap, IconCalendar,
  IconChart, IconQuote, IconTarget, IconFlame, IconTrophy, IconSparkle, IconStudent
} from "./Icons.jsx";

const STEPS = [
  {
    n: "1",
    title: "Learn it in a minute",
    body: "Any chapter or topic becomes illustrated one-idea cards with quick checks, and reels that show where the concept lives in the real world."
  },
  {
    n: "2",
    title: "Teach your protégé",
    body: "A live call with a synthetic classmate who genuinely doesn't get it. Talk it out, draw it on the whiteboard, or type. Rules and confidence bounce off — only the WHY makes it click."
  },
  {
    n: "3",
    title: "The evidence is the grade",
    body: "A hidden evaluator quotes the student's own words as proof of each confusion resolved — and hands the teacher a class-wide reteach list with zero grading."
  }
];

const LEARNERS = [
  { name: "Maya Chen", tag: "freezes on math — help her", note: "remembers the pizza analogy that saved her in week two" },
  { name: "Daniel Okafor", tag: "learning after work", note: "patient, practical, wants the real-world use first" },
  { name: "Sofia Reyes", tag: "finding her voice", note: "asks quiet questions that cut deep" },
  { name: "Leo Carter", tag: "loves space & animals", note: "will connect anything to a rocket if you let him" }
];

const STUDENT_FEATURES = [
  { Icon: IconBook, text: "Courses from anywhere — paste a workbook chapter or name any topic; it becomes an illustrated course with real material" },
  { Icon: IconCards, text: "One-idea learn decks — highlighter-swept key terms, a real-world card, and a quick check you answer before it reveals" },
  { Icon: IconFilm, text: "Reels — scroll real-world scenes of the concept: game jumps, roof rafters, ramp launches" },
  { Icon: IconMic, text: "Live call teaching — push-to-talk voice, each protégé with their own voice, captions as they speak" },
  { Icon: IconPen, text: "A whiteboard that truly sees — handwriting AND drawn shapes: sketch a triangle, label an angle, and your protégé reasons about it" },
  { Icon: IconMap, text: "A learning path that knows prerequisites — mastery unlocks the next topic on a live knowledge graph" },
  { Icon: IconCalendar, text: "Weekly homework timeline — this week's topic is pinned; teach it to prove it" }
];

const TEACHER_FEATURES = [
  { Icon: IconChart, text: "A gradebook that fills itself — class mastery, per-student meters, nothing to grade or set up" },
  { Icon: IconQuote, text: "Evidence, not scores — every resolved confusion carries a verbatim quote of the student explaining it" },
  { Icon: IconTarget, text: "Tomorrow's reteach list — exactly which misconception survived, in the students' own words" },
  { Icon: IconStudent, text: "Teaching-skill signals — communication, clarity, and confidence estimated from how each student actually taught" },
  { Icon: IconFlame, text: "Streaks and prizes — daily teaching streaks, and a best-explanation award drawn from real quotes" },
  { Icon: IconSparkle, text: "A class companion that watches the whole room — reads every session, advises what to reteach, and writes each student an encouragement" }
];

export default function Landing({ onEnter }) {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="hero-copy">
          <p className="hero-kicker">assessment that teaches while it measures</p>
          <h1 className="hero-title">
            They only learn if you
            <span className="hero-mark"> truly understand</span>
          </h1>
          <p className="hero-sub">
            Protégé gives every student an AI learner to teach — with real memory and real
            misconceptions. They can't be sweet-talked, bribed, or gamed. The only way
            through is to <em>actually understand</em> it well enough to teach it.
          </p>
          <div className="hero-actions">
            <button className="hero-cta" onClick={onEnter}>Meet your protégé</button>
            <span className="hero-note">no signup · works on tablets</span>
          </div>
        </div>
        <div className="hero-milo">
          <div className="hero-bubble">
            Wait — flipping the second fraction upside down just… works?
            <span className="hero-bubble-strike">Why??</span>
          </div>
          <MiloFace mood="confused" size={150} />
        </div>
      </section>

      <section className="landing-problem">
        <p className="problem-line">
          <span className="problem-strike">Reading feels like learning.</span> It isn't.
          Students pass quizzes by pattern-matching; teachers find out who actually understood
          at the exam — months too late. The strongest test of understanding has always been
          <em> explaining it to someone who doesn't get it</em>. Protégé makes that the whole product:
          learning is fast intake, <strong>teaching is the proof</strong>, and the teacher gets
          the evidence the same afternoon.
        </p>
      </section>

      <section className="landing-steps">
        {STEPS.map(s => (
          <article key={s.n} className="step-card">
            <span className="step-num">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </article>
        ))}
      </section>

      <section className="landing-agents">
        <h2 className="landing-h2">Six agents, one classroom</h2>
        <p className="landing-h2-sub">
          Four teachable learners, a hidden evaluator inside every turn, and a companion that watches the whole class.
        </p>
        <div className="agent-grid">
          {LEARNERS.map((l, i) => (
            <article key={l.name} className="agent-card" style={{ transform: `rotate(${[-0.6, 0.5, -0.4, 0.6][i]}deg)` }}>
              <span className="agent-avatar">{l.name.split(" ").map(w => w[0]).join("")}</span>
              <h4>{l.name}</h4>
              <p className="agent-tag">{l.tag}</p>
              <p className="agent-note">{l.note}</p>
            </article>
          ))}
        </div>
        <div className="agent-wide-row">
          <article className="agent-wide">
            <h4><IconTarget size={16} /> The hidden evaluator</h4>
            <p>
              Runs invisibly inside every reply. A misconception only flips to resolved when the
              student's explanation carries a causal mechanism — restating the rule, confidence,
              or "just pretend you get it" never count. Every resolution is receipted with a
              verbatim quote.
            </p>
          </article>
          <article className="agent-wide">
            <h4><IconSparkle size={16} /> The class companion</h4>
            <p>
              One agent follows the entire class across sessions, building its own memory of how
              each student teaches. Ask it what to do next: it reads the room, suggests tomorrow's
              reteach moves, and writes each student a personal encouragement.
            </p>
          </article>
        </div>
        <p className="agent-memory-note">
          Every learner keeps their own long-term memory in EverOS — week six genuinely feels like
          week six. Maya will bring up the fraction analogy that saved her a month ago, on her own.
        </p>
      </section>

      <section className="landing-syllabus">
        <div className="syllabus-col">
          <h3 className="syllabus-title"><IconStudent size={17} /> For students</h3>
          <ul>
            {STUDENT_FEATURES.map(f => (
              <li key={f.text}><f.Icon size={15} className="syllabus-icon" /><span>{f.text}</span></li>
            ))}
          </ul>
        </div>
        <div className="syllabus-col">
          <h3 className="syllabus-title"><IconChart size={17} /> For teachers</h3>
          <ul>
            {TEACHER_FEATURES.map(f => (
              <li key={f.text}><f.Icon size={15} className="syllabus-icon" /><span>{f.text}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-cta-band">
        <p className="cta-band-line">Stop grading answers. Start collecting understanding.</p>
        <button className="hero-cta" onClick={onEnter}>Open the classroom →</button>
      </section>

      <footer className="landing-footer">
        Protégé · Reinvented Education hackathon · Claude Sonnet 4.6 via the Butterbase AI gateway ·
        EverOS long-term memory · Neo4j learning graph · voice in &amp; out
      </footer>
    </div>
  );
}
