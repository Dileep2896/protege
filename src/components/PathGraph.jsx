// PathGraph — the course learning path, drawn worksheet-style.
// Mastered = highlighter + strikethrough; the unlocked frontier gets a blue ring.
export default function PathGraph({ topics }) {
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
