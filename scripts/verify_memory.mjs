// scripts/verify_memory.mjs — Slice 4.1 acceptance, run early:
// "pulling <learner> returns their sessions with EverOS OFF and ON."
// Usage: node scripts/verify_memory.mjs [learner_id]   (default maya_chen)

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createMemoryService } from "../src/lib/memory.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env))
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const learnerId = process.argv[2] || "maya_chen";
const seedLearners = JSON.parse(readFileSync(join(root, "packs", "learners.json"), "utf8"));

console.log(`Learner: ${learnerId}\n`);

// 1. EverOS ON — real read
const live = createMemoryService({
  apiKey: process.env.EVEROS_API_KEY,
  seedLearners,
  log: m => console.log(`   [warn] ${m}`)
});
const on = await live.getLearnerMemory(learnerId);
console.log(`EverOS ON:  ${on.length} memories, source=${on[0]?.source}`);
for (const m of on) console.log(`   - ${(m.session_id || m.concept || "").padEnd(28)} ${String(m.summary).slice(0, 80)}...`);

// 2. EverOS OFF — unreachable URL must fall back to seed within the 2s budget
const dead = createMemoryService({
  apiKey: process.env.EVEROS_API_KEY,
  apiUrl: "https://127.0.0.1:9",       // nothing listens here
  seedLearners,
  timeoutMs: 2000,
  log: m => console.log(`   [warn] ${m}`)
});
const t0 = Date.now();
const off = await dead.getLearnerMemory(learnerId);
const ms = Date.now() - t0;
console.log(`\nEverOS OFF: ${off.length} memories, source=${off[0]?.source}, resolved in ${ms}ms`);

const okOn = on.length > 0 && on[0].source === "everos";
const okOff = off.length > 0 && off[0].source === "seed" && ms < 2500;
console.log(`\n${okOn ? "PASS" : "FAIL"} — live read from EverOS`);
console.log(`${okOff ? "PASS" : "FAIL"} — silent fallback to seed under 2.5s`);
process.exit(okOn && okOff ? 0 : 1);
