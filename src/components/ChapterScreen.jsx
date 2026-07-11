// ChapterScreen — illustrated topic cards + the learning path graph.
// Images stream in (generated once, cached in DB). "Teach Milo this" generates a
// concept pack for the topic and opens a session; completing it marks the topic
// mastered in the Neo4j graph, which unlocks the next recommendation.
import { useEffect, useRef, useState } from "react";
import { chapterTopics, illustrateTopic, packForTopic } from "../lib/backend.js";

function PathGraph({ topics }) {
  // Layout by prerequisite depth: columns = depth levels, simple and readable.
  const depth = {};
  topics.forEach((t, i) => {
    depth[i] = (t.prereqs || []).length
      ? Math.max(...t.prereqs.map(p => depth[p] ?? 0)) + 1
      : 0;
  });
  const cols = {};
  topics.forEach((t, i) => { (cols[depth[i]] = cols[depth[i]] || []).push(i); });
  const colW = 190, rowH = 74, pad = 40;
  const nCols = Object.keys(cols).length;
  const maxRows = Math.max(...Object.values(cols).map(c => c.length));
  const posOf = {};
  Object.entries(cols).forEach(([d, idxs]) => {
    idxs.forEach((i, r) => {
      posOf[i] = { x: pad + d * colW, y: pad + r * rowH + (maxRows - idxs.length) * rowH / 2 };
    });
  });
  const W = pad * 2 + (nCols - 1) * colW + 150;
  const H = pad * 2 + (maxRows - 1) * rowH + 40;

  // First unmastered topic whose prereqs are all mastered = "up next".
  const nextIdx = topics.findIndex((t, i) =>
    !t.mastered && (t.prereqs || []).every(p => topics[p]?.mastered));

  return (
    <div className="path-graph-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="path-graph" role="img" aria-label="Learning path">
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0.5 0.8 L7.2 4 L0.5 7.2" fill="none" stroke="#22252A" strokeWidth="1.4" strokeLinecap="round" />
          </marker>
        </defs>
        {topics.map((t, i) => (t.prereqs || []).map(p => {
          const a = posOf[p], b = posOf[i];
          if (!a || !b) return null;
          const midX = (a.x + 150 + b.x) / 2;
          return (
            <path key={`${p}-${i}`}
              d={`M ${a.x + 152} ${a.y + 16} C ${midX} ${a.y + 16}, ${midX} ${b.y + 16}, ${b.x - 4} ${b.y + 16}`}
              className="path-edge" markerEnd="url(#arrow)" />
          );
        }))}
        {topics.map((t, i) => {
          const p = posOf[i];
          return (
            <g key={t.id} transform={`translate(${p.x}, ${p.y})`}>
              <rect width="152" height="34" rx="4"
                className={`path-node ${t.mastered ? "mastered" : ""} ${i === nextIdx ? "next" : ""}`} />
              {t.mastered && <path d="M6 17 Q40 12 76 16 Q112 20 146 15" className="path-node-strike" />}
              <text x="76" y="21" textAnchor="middle" className="path-node-label">
                {t.title.length > 21 ? t.title.slice(0, 20) + "…" : t.title}
              </text>
              {i === nextIdx && <text x="76" y="46" textAnchor="middle" className="path-next-tag">↑ learn this next</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ChapterScreen({ chapter, onTeach, onBack }) {
  const [topics, setTopics] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [packBusy, setPackBusy] = useState(null);
  const [error, setError] = useState(null);
  const illustrating = useRef(false);

  useEffect(() => {
    let cancelled = false;
    chapterTopics(chapter.id).then(async ts => {
      if (cancelled) return;
      setTopics(ts);
      // Stream illustrations in, one at a time, for topics that don't have one yet.
      if (illustrating.current) return;
      illustrating.current = true;
      for (const t of ts.filter(t => !t.image)) {
        try {
          const { image } = await illustrateTopic(t.id);
          if (cancelled) return;
          setTopics(prev => prev.map(x => x.id === t.id ? { ...x, image } : x));
        } catch (err) {
          console.warn("[milo] illustrate failed:", err.message);
        }
      }
    }).catch(err => setError(err.message));
    return () => { cancelled = true; };
  }, [chapter.id]);

  async function teach(topic) {
    if (packBusy) return;
    setPackBusy(topic.id);
    setError(null);
    try {
      const { pack } = await packForTopic(topic.id);
      onTeach(pack);
    } catch (err) {
      setError(`Couldn't get Milo confused about that yet: ${err.message}`);
    } finally {
      setPackBusy(null);
    }
  }

  return (
    <div className="chapter">
      <div className="chapter-head">
        <button className="start-over" onClick={onBack}>← All chapters</button>
        <h2>{chapter.title}</h2>
        <span className="chapter-source">{chapter.source}</span>
      </div>

      {error && <p className="drawpad-error">{error}</p>}
      {!topics && <p className="home-hint">Opening the chapter…</p>}

      {topics && (
        <>
          <section className="path-section">
            <h3 className="section-label">Learning path</h3>
            <PathGraph topics={topics} />
          </section>

          <section className="cards-grid">
            {topics.map((t, i) => (
              <article key={t.id} className={`topic-card ${t.mastered ? "mastered" : ""}`}>
                <div className="topic-art">
                  {t.image
                    ? <img src={t.image} alt="" loading="lazy" />
                    : <div className="topic-art-loading"><span className="dot" /><span className="dot" /><span className="dot" /> sketching…</div>}
                  {t.mastered && <span className="mastered-stamp">taught ✓</span>}
                </div>
                <div className="topic-body">
                  <span className="topic-num">{String(i + 1).padStart(2, "0")}</span>
                  <h4>{t.title}</h4>
                  <p className="topic-key">{t.key_idea}</p>
                  <p className="topic-summary">
                    {expanded === t.id ? t.explanation : t.summary}
                  </p>
                  <div className="topic-actions">
                    <button className="link-btn" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                      {expanded === t.id ? "Less" : "Explain it to me"}
                    </button>
                    <button className="teach-btn" onClick={() => teach(t)} disabled={!!packBusy}>
                      {packBusy === t.id ? "Confusing Milo…" : t.mastered ? "Teach again" : "Teach Milo this"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
