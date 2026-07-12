// src/viewmodels/useSession.js — the session viewmodel. Owns ALL React state for a
// teaching session; views call actions and render props, nothing else.
// Config comes from the Home screen: which learner, which pack, Milo's level, and
// (for resume) an existing session id. Persistence: a row in the Butterbase sessions
// table; saves are fire-and-forget — the chat never waits on the DB.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  callTurn, callOpener, callReport, createSession, loadSession, saveSession, markMastered
} from "../lib/backend.js";
import { createMemoryService } from "../lib/memory.js";
import {
  initSession, applyTurnResult, evidenceFrom, transcriptText, allResolved
} from "../model/session.js";
import learnersSeed from "../../packs/learners.json";

const STORAGE_KEY = "milo_session_id";

// `pack` may be a built-in pack (sent by id) or a generated topic pack (sent inline).
export function useSession(pack, learnerId, { sessionId = null, level = "11", dynamic = false, classroom = false } = {}) {
  const packPayload = dynamic ? pack : undefined;   // built-ins stay id-only (demo path unchanged)
  // No API key in the browser: memory service resolves from the seed mirror of the
  // learner's EverOS history (a proxy function can swap in live reads later).
  const memory = useMemo(
    () => createMemoryService({ seedLearners: learnersSeed }),
    []
  );
  // The learner IS the agent being taught — an EverMind learner with real memory.
  const learner = learnersSeed.learners.find(l => l.id === learnerId);
  const agentName = learner ? learner.name.split(" ")[0] : "Milo";
  const agentPersona = learner
    ? `${learner.name}, ${learner.age}, ${learner.grade}: ${learner.notes}`
    : undefined;

  const [state, setState] = useState(() =>
    classroom ? { ...initSession(pack), classroom: true } : initSession(pack));
  const [messages, setMessages] = useState([]);   // opener arrives during restore
  const [evidence, setEvidence] = useState({});      // id -> verbatim quote
  const [flash, setFlash] = useState([]);            // ids struck through this turn
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(true);
  const [report, setReport] = useState(null);          // markdown once generated
  const [reportBusy, setReportBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [miloLevel, setMiloLevel] = useState(level);
  const sessionIdRef = useRef(null);

  // Resume the given session, or open a fresh one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const openFresh = async () => {
        // Memory-aware opener (demo beat 2); static pack opener on ANY failure.
        // Classroom: Zoe (m1's owner) opens with the pack's confusion, no memory call.
        let opening = classroom
          ? { who: "milo", name: "Zoe", text: pack.learner_opening, mood: "confused" }
          : { who: "milo", text: pack.learner_opening, mood: "confused" };
        try {
          const learnerMemory = await memory.getLearnerMemory(learnerId);
          if (!classroom && learnerMemory.length > 0) {
            const { milo } = await callOpener({
              pack_id: pack.id,
              pack: packPayload,
              agent_name: agentName,
              agent_persona: agentPersona,
              learner_memory: learnerMemory,
              learner_name: "friend",
              milo_level: level
            });
            if (milo?.reply) opening = { who: "milo", text: milo.reply, mood: milo.mood || "confused" };
          }
        } catch (err) {
          console.warn("[milo] opener failed, using static opening:", err.message);
        }
        if (cancelled) return;
        // The opener is LIVE speech, not restored history — flip restoring off
        // BEFORE it lands so the call view speaks it aloud. (Restored sessions
        // set their history while restoring=true, which correctly stays silent.)
        setRestoring(false);
        setMessages([opening]);
        try {
          const row = await createSession({
            learner_id: learnerId, pack_id: pack.id, pack_title: pack.title, milo_level: level,
            state: classroom ? { ...initSession(pack), classroom: true } : initSession(pack),
            messages: [opening]
          });
          if (row?.id) {
            sessionIdRef.current = row.id;
            localStorage.setItem(STORAGE_KEY, row.id);
          }
        } catch (err) {
          console.warn("[milo] session create failed:", err.message);  // chat still works
        }
      };

      if (sessionId) {
        const row = await loadSession(sessionId);
        if (cancelled) return;
        // jsonb quirk: empty arrays can round-trip as {} — only restore real turns
        if (row && row.pack_id === pack.id && row.learner_id === learnerId &&
            row.state?.misconceptions && Array.isArray(row.messages) && row.messages.length > 0) {
          sessionIdRef.current = row.id;
          setState({
            phase: row.state.phase || "teaching",
            misconceptions: row.state.misconceptions,
            ...(row.state.classroom && { classroom: true })
          });
          setMessages(row.messages);
          setEvidence(row.evidence && !Array.isArray(row.evidence) ? row.evidence : {});
          if (row.report) setReport(row.report);
          if (row.milo_level) setMiloLevel(row.milo_level);
          localStorage.setItem(STORAGE_KEY, row.id);
          setRestoring(false);
          return;
        }
      }
      await openFresh();
      if (!cancelled) setRestoring(false);
    })();
    return () => { cancelled = true; };
  }, [pack.id, learnerId, sessionId]);

  async function runTurn(studentText, { forceCheck = false } = {}) {
    if (thinking || restoring) return;
    setError(null);
    setThinking(true);
    const shownMessages = studentText
      ? [...messages, { who: "student", text: studentText }]
      : messages;
    if (studentText) setMessages(shownMessages);

    try {
      const learnerMemory = await memory.getLearnerMemory(learnerId);
      const result = await callTurn({
        pack_id: pack.id,
        pack: packPayload,
        agent_name: agentName,
        agent_persona: agentPersona,
        classroom: classroom || undefined,
        state: forceCheck ? { ...state, force_check: true } : state,
        transcript: transcriptText(shownMessages),
        student_turn: studentText || (classroom ? "Can one of you try the check problem?" : "Can you try the check problem, Milo?"),
        learner_memory: learnerMemory,
        milo_level: miloLevel
      });

      const { state: nextState, resolvedNow } = applyTurnResult(state, result);
      // A completed topic session updates the learning graph (dynamic packs only).
      if (dynamic && allResolved(nextState) && !allResolved(state) && pack.id.startsWith("topic_"))
        markMastered(pack.id.slice(6));
      const nextEvidence = { ...evidence, ...evidenceFrom(result) };
      const agentReplies = result.class
        ? result.class.map((c, i) => ({
            who: "milo", name: c.name, text: c.reply, mood: c.mood || "confused",
            failed: i === 0 && forceCheck && !allResolved(nextState)
          }))
        : [{
            who: "milo",
            text: result.milo.reply,
            mood: result.milo.mood || "confused",
            failed: forceCheck && !allResolved(nextState)
          }];
      const nextMessages = [...shownMessages, ...agentReplies];

      setState(nextState);
      setEvidence(nextEvidence);
      setFlash(resolvedNow);
      setMessages(nextMessages);

      if (sessionIdRef.current)
        saveSession(sessionIdRef.current, {
          state: nextState, messages: nextMessages, evidence: nextEvidence
        });
    } catch (err) {
      setError(err.message);
    } finally {
      setThinking(false);
    }
  }

  // End of session: generate the teaching report (the product — never cut),
  // store it on the session row, and open the report view.
  async function endSession() {
    if (reportBusy) return;
    if (report) { setShowReport(true); return; }       // already written -> just view
    setError(null);
    setReportBusy(true);
    try {
      const learnerMemory = await memory.getLearnerMemory(learnerId);
      const { report: md } = await callReport({
        pack_id: pack.id,
        pack: packPayload,
        agent_name: agentName,
        state,
        transcript: transcriptText(messages),
        learner_memory: learnerMemory,
        learner_name: `the student (teaching ${agentName})`
      });
      setReport(md);
      setShowReport(true);
      if (sessionIdRef.current)
        saveSession(sessionIdRef.current, { state, messages, evidence, report: md });
    } catch (err) {
      setError(err.message);
    } finally {
      setReportBusy(false);
    }
  }

  return {
    learner,
    agentName,
    miloLevel,
    state,
    messages,
    evidence,
    flash,
    thinking,
    restoring,
    error,
    done: allResolved(state),
    report,
    reportBusy,
    showReport,
    setShowReport,
    sendTurn: text => runTurn(text),
    quizMilo: () => runTurn(null, { forceCheck: true }),
    endSession
  };
}

export function lastSessionId() {
  return localStorage.getItem(STORAGE_KEY);
}
