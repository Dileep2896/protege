// src/lib/backend.js — ALL Butterbase access goes through this file (CLAUDE.md
// boundary). The browser only ever talks to our serverless functions and the
// data API; no model keys, no direct gateway calls.

const API_BASE = "https://api.butterbase.ai/v1/app_c3jiru08r6vi";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    // content-type only when there IS a body — the API 400s on bodyless JSON requests
    headers: options.body ? { "content-type": "application/json" } : {},
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const detail = typeof data.error === "string" ? data.error : JSON.stringify(data.error || data);
    throw new Error(detail || `${path} failed (${res.status})`);
  }
  return data;
}

// ---- turn engine (serverless function) ----

export function callTurn(payload) {
  return request("/fn/turn", { method: "POST", body: JSON.stringify(payload) });
}

// The agent's first line, memory-aware. Callers must fall back to the pack's static
// learner_opening on any failure — the session never blocks on this.
export function callOpener(payload) {
  return request("/fn/turn", { method: "POST", body: JSON.stringify({ opener: true, ...payload }) });
}

export function callReport(payload) {
  return request("/fn/report", { method: "POST", body: JSON.stringify(payload) });
}

// ---- learn pipeline (chapters, topics, illustrations, graph) ----

export function buildChapter({ topic, text, grade_band }) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "chapter", topic, text, grade_band }) });
}
export function illustrateTopic(topic_id) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "illustrate", topic_id }) });
}
export function addTopic(chapter_id, topic) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "add_topic", chapter_id, topic }) });
}
export function extendCourse(chapter_id, text) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "extend", chapter_id, text }) });
}
export function askCoach(digest) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "coach", digest }) });
}
export function applicationsFor(topic_id) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "applications", topic_id }) });
}
export function setTopicWeek(topic_id, week) {
  return request(`/topics/${topic_id}`, { method: "PATCH", body: JSON.stringify({ scheduled_week: week }) });
}
// Teacher: create an empty course by title alone; grow it with topics/material later.
export async function createCourse(title) {
  const rows = await request("/chapters", {
    method: "POST",
    body: JSON.stringify({ title, source: "pasted text · created by teacher", grade_band: "6-8" })
  });
  return Array.isArray(rows) ? rows[0] : rows;
}
export function reelStart(topic_id) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "reel_start", topic_id }) });
}
export function reelPoll(topic_id, job_id) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "reel_poll", topic_id, job_id }) });
}
export async function topicVideo(topic_id) {
  const rows = await request(`/topics?id=eq.${topic_id}&select=video`, { method: "GET" });
  return rows?.[0]?.video || null;
}
// The reel feed: only THIS course's topics that actually have a generated video
// (metadata only — the multi-MB video itself is fetched lazily per slide).
export async function videoReelTopics(chapter_id) {
  // neq. (empty string) excludes NULLs too — this API has no not.is.null operator
  const rows = await request(
    `/topics?chapter_id=eq.${chapter_id}&video=neq.&select=id,title,key_idea,video_caption,image,mastered,applications&order=position.asc`,
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}
export function packForTopic(topic_id) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "pack", topic_id }) });
}
export function markMastered(topic_id) {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "mastered", topic_id }) })
    .catch(err => console.warn("[milo] mastered failed:", err.message));
}
export function learnNext() {
  return request("/fn/learn", { method: "POST", body: JSON.stringify({ op: "next" }) });
}
export async function listChapters() {
  const rows = await request("/chapters?select=id,title,source,grade_band,created_at&order=created_at.desc&limit=20", { method: "GET" });
  return Array.isArray(rows) ? rows : [];
}
// Resume support for topic sessions: fetch the stored pack by topic id.
export async function topicPack(topic_id) {
  const rows = await request(`/topics?id=eq.${topic_id}&select=pack`, { method: "GET" });
  return rows?.[0]?.pack || null;
}

export async function chapterTopics(chapter_id) {
  const rows = await request(
    `/topics?chapter_id=eq.${chapter_id}&select=id,position,title,key_idea,summary,explanation,image,applications,scheduled_week,prereqs,mastered,pack&order=position.asc`,
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}

// ---- session persistence (data API, sessions table) ----
// Gotcha: the data API rejects top-level JSON arrays in jsonb columns (it treats
// them as Postgres array literals). Arrays must be wrapped in an object — hence
// messages is stored as {turns: [...]}.

export async function createSession({ learner_id, pack_id, pack_title, milo_level, state, messages }) {
  const rows = await request("/sessions", {
    method: "POST",
    body: JSON.stringify({ learner_id, pack_id, pack_title, milo_level, state, messages: { turns: messages }, evidence: {} })
  });
  const row = Array.isArray(rows) ? rows[0] : rows;
  return row;
}

// Handwriting from the drawing canvas -> plain text (vision model via /fn/turn).
export function transcribeDrawing(imageDataUri) {
  return request("/fn/turn", {
    method: "POST",
    body: JSON.stringify({ transcribe: true, image: imageDataUri })
  });
}

export function deleteSession(id) {
  return request(`/sessions/${id}`, { method: "DELETE" });
}

// Teacher dashboard: recent sessions, newest first.
export async function listSessions(limit = 25) {
  const rows = await request(
    `/sessions?select=id,learner_id,pack_id,pack_title,milo_level,state,evidence,messages,report,created_at,updated_at&order=updated_at.desc&limit=${limit}`,
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}

export async function loadSession(id) {
  try {
    const row = await request(`/sessions/${id}`, { method: "GET" });
    if (row) row.messages = row.messages?.turns || [];   // unwrap
    return row;
  } catch {
    return null;   // missing/expired row -> caller starts fresh
  }
}

// Fire-and-forget: persistence must never block or break the conversation.
export function saveSession(id, { state, messages, evidence, report }) {
  const patch = {
    state,
    messages: { turns: messages },
    evidence,
    updated_at: new Date().toISOString()
  };
  if (report !== undefined) patch.report = report;
  request(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
    .catch(err => console.warn("[milo] session save failed:", err.message));
}
