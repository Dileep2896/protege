// Landing — the worksheet, writ large. One aesthetic, executed hard: paper,
// graphite, ballpoint, one highlighter. The signature move is the strikethrough.
import MiloFace from "./MiloFace.jsx";

const STEPS = [
  {
    n: "1",
    title: "Your protégé doesn't get it",
    body: "Maya freezes on math. Her misconceptions are real, and she remembers every session — the pizza analogy that saved her in week two, the sign error she keeps making."
  },
  {
    n: "2",
    title: "You teach them",
    body: "Talk it out on a live call, write it by hand, or type. Rules and confidence bounce off. Only the WHY makes it click."
  },
  {
    n: "3",
    title: "The evidence is the grade",
    body: "A hidden evaluator quotes your own words as proof of each confusion you resolved — and hands the teacher a class-wide reteach list."
  }
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

      <section className="landing-steps">
        {STEPS.map(s => (
          <article key={s.n} className="step-card">
            <span className="step-num">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </article>
        ))}
      </section>

      <section className="landing-strip">
        <div className="strip-item">
          <h4>Explicit state, not vibes</h4>
          <p>Every "he got it" is gated by a strict hidden evaluator demanding causal mechanism — with a verbatim quote as the receipt.</p>
        </div>
        <div className="strip-item">
          <h4>They remember everything</h4>
          <p>Week six feels like week six: your protégé brings up the analogy that worked in week two — their memory lives in EverOS.</p>
        </div>
        <div className="strip-item">
          <h4>Learn anything, then teach it</h4>
          <p>Point it at a textbook chapter or any topic — illustrated study cards, a learning path, and a protégé confused about exactly that.</p>
        </div>
      </section>

      <footer className="landing-footer">
        Protégé · Reinvented Education hackathon · built on Butterbase, EverOS memory & a Neo4j learning graph
      </footer>
    </div>
  );
}
