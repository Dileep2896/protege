// Teaching report view — printable-clean. Renders the report markdown with a tiny
// purpose-built converter (headers, bold/italic, lists, hr) — no dependencies.

function inline(text, key) {
  const parts = [];
  let rest = text, i = 0;
  const rx = /\*\*([^*]+)\*\*|\*([^*]+)\*/;
  while (rest) {
    const m = rest.match(rx);
    if (!m) { parts.push(rest); break; }
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    if (m[1] !== undefined) parts.push(<strong key={`${key}-${i++}`}>{m[1]}</strong>);
    else parts.push(<em key={`${key}-${i++}`}>{m[2]}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}

function renderMarkdown(md) {
  const out = [];
  let list = null, listOrdered = false, k = 0;
  const flushList = () => {
    if (!list) return;
    out.push(listOrdered
      ? <ol key={k++}>{list}</ol>
      : <ul key={k++}>{list}</ul>);
    list = null;
  };

  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    if (line === "---") { flushList(); out.push(<hr key={k++} />); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flushList();
      const Tag = `h${Math.min(h[1].length + 1, 5)}`;
      out.push(<Tag key={k++}>{inline(h[2], k)}</Tag>);
      continue;
    }
    const li = line.match(/^[-•]\s+(.*)/);
    const oli = line.match(/^(\d+)\.\s+(.*)/);
    if (li || oli) {
      if (list && listOrdered !== !!oli) flushList();
      listOrdered = !!oli;
      list = list || [];
      list.push(<li key={k++}>{inline(li ? li[1] : oli[2], k)}</li>);
      continue;
    }
    flushList();
    out.push(<p key={k++}>{inline(line, k)}</p>);
  }
  flushList();
  return out;
}

export default function ReportView({ report, onClose }) {
  return (
    <div className="report-overlay" role="dialog" aria-label="Teaching report">
      <div className="report-sheet">
        <div className="report-toolbar no-print">
          <button onClick={onClose}>Back to session</button>
          <button onClick={() => window.print()}>Print</button>
        </div>
        <article className="report-body">{renderMarkdown(report)}</article>
      </div>
    </div>
  );
}
