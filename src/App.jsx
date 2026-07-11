import { useState } from "react";
import { useSession, lastSessionId } from "./viewmodels/useSession.js";
import { topicPack, listChapters, listSessions } from "./lib/backend.js";
import DemoMode from "./components/DemoMode.jsx";
import Landing from "./components/Landing.jsx";
import Library from "./components/Library.jsx";
import Workspace from "./components/Workspace.jsx";
import ChatPane from "./components/ChatPane.jsx";
import TeacherPanel from "./components/TeacherPanel.jsx";
import ReportView from "./components/ReportView.jsx";
import CallView from "./components/CallView.jsx";
import { NoticeModal } from "./components/Modal.jsx";
import MiloFace from "./components/MiloFace.jsx";
import fractionsPack from "../packs/fractions_division.json";
import photosynthesisPack from "../packs/photosynthesis.json";
import personas from "../packs/personas.json";
import { IconStudent, IconApple, IconVideo } from "./components/Icons.jsx";

const PACKS = [fractionsPack, photosynthesisPack];

// Voices per EverMind learner-agent (Butterbase gpt-audio voices).
const AGENT_VOICES = { maya_chen: "coral", daniel_okafor: "ash", sofia_reyes: "shimmer", leo_carter: "echo" };
const AGENT_TAGS = {
  maya_chen: "freezes on math — help her",
  daniel_okafor: "learning after work",
  sofia_reyes: "finding her voice",
  leo_carter: "loves space & animals"
};
const CLASS_AGENTS = [
  { name: "Zoe", tag: "confident", voice: "jess" },
  { name: "Sam", tag: "thinks in pictures", voice: "leo" },
  { name: "Ravi", tag: "asks why", voice: "dan" }
];

function SessionScreen({ config, onHome }) {
  const pack = config.packObj || PACKS.find(p => p.id === config.packId) || PACKS[0];
  const session = useSession(pack, config.learnerId, {
    sessionId: config.sessionId,
    level: config.level,
    dynamic: !!config.packObj,
    classroom: !!config.classroom
  });
  const [view, setView] = useState(config.startInCall ? "call" : "classic");
  const classroom = !!config.classroom || !!session.state.classroom;
  const agents = classroom
    ? CLASS_AGENTS
    : [{
        name: session.agentName,
        tag: AGENT_TAGS[config.learnerId] || "needs your help",
        voice: AGENT_VOICES[config.learnerId] || "ballad"
      }];

  if (view === "call") {
    return (
      <>
        <CallView session={session} pack={pack} agents={agents} onClassic={() => setView("classic")} chapterId={config.chapterId} />
        {session.showReport && session.report && (
          <ReportView report={session.report} onClose={() => session.setShowReport(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="session-tag">
        <span className="unit">Unit: {pack.title}</span>
        <span className="learner">
          {classroom ? "Class of 3" : `Your protégé: ${session.learner?.name || session.agentName}`}
        </span>
        <button className="start-over" onClick={() => setView("call")}><IconVideo size={13} /> Call view</button>
        <button className="start-over" onClick={onHome}>Back</button>
      </div>
      <main className="panes">
        <ChatPane
          messages={session.messages}
          thinking={session.thinking}
          restoring={session.restoring}
          error={session.error}
          done={session.done}
          onSend={session.sendTurn}
          agentName={session.agentName}
        />
        <TeacherPanel
          pack={pack}
          state={session.state}
          evidence={session.evidence}
          flash={session.flash}
          thinking={session.thinking}
          done={session.done}
          onQuiz={session.quizMilo}
          onEndSession={session.endSession}
          reportBusy={session.reportBusy}
          hasReport={!!session.report}
          agentNames={classroom ? CLASS_AGENTS.map(a => a.name) : null}
          agentName={session.agentName}
        />
      </main>
      {session.showReport && session.report && (
        <ReportView report={session.report} onClose={() => session.setShowReport(false)} />
      )}
    </>
  );
}

export default function App() {
  // screen: {name:"landing"|"library"|"workspace"|"session"} — plain state, no router.
  const [screen, setScreen] = useState({ name: "landing" });
  const [role, setRole] = useState(() => localStorage.getItem("milo_role") || "student");
  const [workspaceChapter, setWorkspaceChapter] = useState(null);
  const [reportOverlay, setReportOverlay] = useState(null);
  const [notice, setNotice] = useState(null);

  function switchRole(r) {
    setRole(r);
    localStorage.setItem("milo_role", r);
  }

  const goLibrary = () => setScreen({ name: "library" });
  const backFromSession = () =>
    setScreen(workspaceChapter ? { name: "workspace" } : { name: "library" });

  async function resumeRow(row, extra = {}) {
    const base = { learnerId: row.learner_id, level: row.milo_level || "11", sessionId: row.id, key: row.id, ...extra };
    if (row.pack_id.startsWith("topic_")) {
      const pack = await topicPack(row.pack_id.slice(6));
      if (!pack) return setNotice("That topic's pack is gone — its course may have been deleted.");
      setScreen({ name: "session", config: { ...base, packObj: pack } });
    } else {
      setScreen({ name: "session", config: { ...base, packId: row.pack_id } });
    }
  }

  // ── Demo mode: a driver the self-running tour uses to steer the app ──────
  const [demoOn, setDemoOn] = useState(false);
  const [demoCmd, setDemoCmd] = useState(null);
  const settle = (ms = 700) => new Promise(r => setTimeout(r, ms));
  const demoDriver = {
    async landing() {
      setScreen({ name: "landing" });
      await settle(400);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    async landingAgents() {
      setScreen({ name: "landing" });
      await settle(300);
      document.querySelector(".landing-agents")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    async shelf() {
      switchRole("student");
      setScreen({ name: "library" });
      await settle();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    async cards() {
      const cs = await listChapters().catch(() => []);
      const c = cs.find(x => /trig/i.test(x.title)) || cs[0];
      if (!c) return;
      setWorkspaceChapter(c);
      setScreen({ name: "workspace" });
      setDemoCmd({ tab: "learn", learnView: "cards", deck: 0, n: 1 });
      await settle(900);
    },
    async reels() {
      setDemoCmd({ tab: "learn", learnView: "reels", deck: null, n: 2 });
      await settle(800);
    },
    async call() {
      setDemoCmd({ deck: null, n: 3 });
      const rows = await listSessions(20).catch(() => []);
      const row = rows.find(r => r.learner_id === "maya_chen") || rows[0];
      if (row) await resumeRow(row, { startInCall: true });
      await settle(900);
    },
    async insights() {
      switchRole("teacher");
      setWorkspaceChapter(null);
      setScreen({ name: "library" });
      await settle(800);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const inApp = screen.name === "library" || screen.name === "workspace";

  return (
    <div className={`page ${screen.name === "landing" ? "page-landing" : ""}`}>
      <header className="masthead">
        <div className="masthead-brand" onClick={() => setScreen({ name: "landing" })} style={{ cursor: "pointer" }}>
          <MiloFace mood="confused" size={30} />
          <h1>Protégé</h1>
        </div>
        <p className="tagline">they only learn if you truly understand</p>
        {inApp && (
          <div className="role-toggle" role="tablist" aria-label="View as">
            <button className={role === "student" ? "active" : ""} onClick={() => switchRole("student")}><IconStudent size={14} /> Student</button>
            <button className={role === "teacher" ? "active" : ""} onClick={() => switchRole("teacher")}><IconApple size={14} /> Teacher</button>
          </div>
        )}
        {screen.name === "landing" && (
          <button className="masthead-enter" onClick={goLibrary}>Open the classroom →</button>
        )}
        {!demoOn && screen.name === "landing" && (
          <button className="demo-btn" onClick={() => setDemoOn(true)}>▶ 2-min demo</button>
        )}
      </header>

      {screen.name === "landing" && <Landing onEnter={goLibrary} />}

      {screen.name === "library" && (
        <Library
          role={role}
          lastId={lastSessionId()}
          onResume={resumeRow}
          onViewReport={row => setReportOverlay(row.report)}
          onOpenChapter={chapter => { setWorkspaceChapter(chapter); setScreen({ name: "workspace" }); }}
        />
      )}

      {screen.name === "workspace" && workspaceChapter && (
        <Workspace
          chapter={workspaceChapter}
          role={role}
          packs={PACKS}
          demoCmd={demoCmd}
          onBack={goLibrary}
          onResume={resumeRow}
          onViewReport={row => setReportOverlay(row.report)}
          onStartSession={cfg => setScreen({ name: "session", config: { ...cfg, sessionId: null, key: Date.now() } })}
        />
      )}

      {screen.name === "session" && (
        <SessionScreen key={screen.config.key} config={screen.config} onHome={backFromSession} />
      )}

      {reportOverlay && (
        <ReportView report={reportOverlay} onClose={() => setReportOverlay(null)} />
      )}
      {notice && <NoticeModal title="Hmm." message={notice} onClose={() => setNotice(null)} />}
      {demoOn && (
        <DemoMode
          driver={demoDriver}
          onExit={() => { setDemoOn(false); setDemoCmd(null); setScreen({ name: "landing" }); }}
        />
      )}
    </div>
  );
}
