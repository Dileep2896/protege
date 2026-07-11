// scripts/load_learner.mjs — JS port of the data pack's load_learner.py
// Usage: node scripts/load_learner.mjs packs/data_pack/maya_chen.json
// Loads a learner's session transcripts into EverOS: synchronous add + flush per
// session, so extraction is complete (and searchable) the moment the script ends.
// Per the pack README: async_mode=false is for one-time preloading ONLY — the live
// app uses the default async add and flushes at session end (src/lib/memory.js).

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env))
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const KEY = process.env.EVEROS_API_KEY;
if (!KEY) { console.error("Set EVEROS_API_KEY in .env"); process.exit(1); }
const BASE = process.env.EVEROS_API_URL || "https://api.evermind.ai";

const file = process.argv[2];
if (!file) { console.error("Usage: node scripts/load_learner.mjs <learner.json>"); process.exit(1); }
const pack = JSON.parse(readFileSync(resolve(file), "utf8"));

async function api(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${KEY}` },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${text}`);
  return JSON.parse(text);
}

console.log(`Loading ${pack.learner.display_name} (${pack.learner.user_id}) — ${pack.sessions.length} sessions\n`);

for (const s of pack.sessions) {
  process.stdout.write(`• ${s.session_id} (${s.messages.length} messages) ... `);
  const add = await api("/api/v1/memories", {
    user_id: s.user_id,
    session_id: s.session_id,
    async_mode: false,
    messages: s.messages
  });
  const flush = await api("/api/v1/memories/flush", { user_id: s.user_id, session_id: s.session_id });
  console.log(`add=${add.data?.status} flush=${flush.data?.status}`);
}

console.log(`\nDone. Verify with: node scripts/verify_memory.mjs ${pack.learner.user_id}`);
