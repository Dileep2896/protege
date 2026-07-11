// Teacher view — the misconception checklist. The signature moment lives here:
// a resolved row gets a hand-drawn strikethrough + highlighter sweep.
export default function TeacherPanel({ pack, state, evidence, flash, thinking, done, onQuiz, onEndSession, reportBusy, hasReport, agentNames, agentName = "Milo" }) {
  return (
    <aside className="teacher-panel" aria-label="Teacher view">
      <header>
        <span className="panel-kicker">Teacher view</span>
        <h2>{agentNames ? "What the class still gets wrong" : `What ${agentName} still gets wrong`}</h2>
      </header>

      <ul className="checklist">
        {pack.misconceptions.map((m, mi) => {
          const resolved = state.misconceptions[m.id] === "resolved";
          const justNow = flash.includes(m.id);
          return (
            <li key={m.id} className={`row ${resolved ? "resolved" : ""} ${justNow ? "just-now" : ""}`}>
              <span className="checkbox" aria-hidden="true">{resolved ? "✓" : ""}</span>
              <div className="row-body">
                {agentNames && <span className="agent-chip">{agentNames[mi]}</span>}
                <span className="belief">
                  <span className="belief-text">{m.belief}</span>
                  {resolved && (
                    <svg className="strike" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M1 5 Q25 2.5 50 4.5 Q75 6.5 99 3.5" />
                    </svg>
                  )}
                </span>
                {resolved && evidence[m.id] && (
                  <blockquote className="evidence">“{evidence[m.id]}”</blockquote>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="panel-actions">
        <button className="quiz-btn" onClick={onQuiz} disabled={thinking || done}>
          Quiz {agentName}
        </button>
        <p className="quiz-hint">
          {done
            ? "All confusions resolved — the check problem passed."
            : "Quiz them early and the mistake will match the unresolved confusion."}
        </p>
        <button className="report-btn" onClick={onEndSession} disabled={thinking || reportBusy}>
          {reportBusy ? "Writing report…" : hasReport ? "View teaching report" : "End session and write report"}
        </button>
      </div>
    </aside>
  );
}
