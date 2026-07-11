// scripts/everos_smoke.mjs — ISSUES.md item 0.3: "Done when: a value round-trips."
// Usage: node scripts/everos_smoke.mjs
// Adds a distinctive message for a throwaway user, flushes to force extraction,
// then polls search until the value comes back (extraction is async server-side).

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

const USER = "smoke_test_user";
const SESSION = `smoke_${Date.now()}`;
const SECRET = `bumblebee-${Date.now() % 100000}`;
const now = Date.now();

console.log(`1. add    — user=${USER} session=${SESSION} secret="${SECRET}"`);
const add = await api("/api/v1/memories", {
  user_id: USER,
  session_id: SESSION,
  async_mode: false,
  messages: [
    { role: "user", timestamp: now, content: `For the Milo hackathon smoke test, remember this: my secret code word is ${SECRET}. It is very important.` },
    { role: "assistant", timestamp: now + 1000, content: `Got it — your secret code word is ${SECRET}. I will remember it.` }
  ]
});
console.log(`   status=${add.data?.status}`);

console.log("2. flush  — forcing extraction");
const flush = await api("/api/v1/memories/flush", { user_id: USER, session_id: SESSION });
console.log(`   status=${flush.data?.status}`);

console.log("3. search — polling until the value round-trips (up to 90s)");
const deadline = Date.now() + 90_000;
let found = null;
while (Date.now() < deadline && !found) {
  const res = await api("/api/v1/memories/search", {
    filters: { user_id: USER },
    query: "secret code word",
    method: "hybrid",
    memory_types: ["episodic_memory", "profile", "raw_message"],
    top_k: 5
  });
  const blob = JSON.stringify(res.data || {});
  if (blob.includes(SECRET)) found = res.data;
  else { process.stdout.write("   ...not indexed yet, retrying in 6s\n"); await new Promise(r => setTimeout(r, 6000)); }
}

if (found) {
  const ep = (found.episodes || [])[0];
  console.log(`\nROUND-TRIP OK ✅  secret "${SECRET}" came back from EverOS`);
  if (ep) console.log(`   episode: ${JSON.stringify(ep.summary || ep.episode || "").slice(0, 200)}`);
} else {
  console.error(`\nROUND-TRIP FAILED ❌  "${SECRET}" not found within 90s (extraction may still be queued — re-run search later)`);
  process.exit(1);
}
