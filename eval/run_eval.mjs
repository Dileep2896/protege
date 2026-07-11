// eval/run_eval.mjs
// Usage: node eval/run_eval.mjs
// Reads BUTTERBASE_API_KEY from the environment or from .env at the repo root.
// Runs each case in cases.json through prompts/turn.md and checks the evaluator's
// decision, evidence-quote validity (verbatim substring), and Milo leak-safety.
// This is the gate: keep iterating prompts/turn.md until it prints ALL PASS.
//
// Model calls go through the Butterbase AI gateway (OpenAI-compatible), billed
// against Butterbase AI credits — no Anthropic key anywhere in this project.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

// minimal .env loader (no dependency): KEY=value lines, # comments
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env))
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const API_KEY = process.env.BUTTERBASE_API_KEY;
if (!API_KEY) {
  console.error("Set BUTTERBASE_API_KEY (env var or .env at repo root).");
  console.error("Mint one with scope ai:gateway — see ARCHITECTURE.md → Credentials.");
  process.exit(1);
}

const GATEWAY = process.env.BUTTERBASE_API_URL || "https://api.butterbase.ai";
const MODEL = process.env.MILO_MODEL || "anthropic/claude-sonnet-4.6";
const template = readFileSync(join(root, "prompts", "turn.md"), "utf8");
const casesFile = JSON.parse(readFileSync(join(__dir, "cases.json"), "utf8"));
const pack = JSON.parse(readFileSync(join(root, "packs", `${casesFile.pack}.json`), "utf8"));
const personasFile = JSON.parse(readFileSync(join(root, "packs", "personas.json"), "utf8"));
const PERSONA = personasFile.personas[personasFile.default];   // harness always tests the demo persona

// words Milo must never say in his reply
const LEAK = ["misconception", "criteria", "rubric", "evaluat", "resolved", "unresolved",
  "state object", "session data", "\"m1\"", "\"m2\"", "\"m3\"", " m1", " m2", " m3"];

function buildPrompt(c) {
  return template
    .replace("{{PACK_JSON}}", JSON.stringify(pack, null, 2))
    .replace("{{MILO_PERSONA}}", PERSONA)
    .replace("{{STATE_JSON}}", JSON.stringify(c.state, null, 2))
    .replace("{{LEARNER_MEMORY}}", "[]")
    .replace("{{TRANSCRIPT}}", "(start of session)")
    .replace("{{STUDENT_TURN}}", c.student_turn);
}

let totalTokens = 0;

async function callModel(prompt) {
  const res = await fetch(`${GATEWAY}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1400, temperature: 0, stream: false,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  totalTokens += data.usage?.total_tokens || 0;
  const text = data.choices?.[0]?.message?.content || "";
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const eq = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const norm = s => s.replace(/\s+/g, " ").trim();

function check(c, out) {
  const errs = [];
  const resolvedIds = (out.evaluation?.resolved_this_turn || []).map(r => r.id).sort();
  const e = c.expect;

  // resolution-set assertions (three supported shapes)
  if (e.resolved) {
    if (!eq(resolvedIds, [...e.resolved].sort()))
      errs.push(`resolved=[${resolvedIds}] expected exactly [${e.resolved}]`);
  }
  if (e.resolved_superset_of) {
    for (const id of e.resolved_superset_of)
      if (!resolvedIds.includes(id)) errs.push(`missing required resolve ${id}`);
  }
  if (e.max_resolved) {
    for (const id of resolvedIds)
      if (!e.max_resolved.includes(id)) errs.push(`over-resolved ${id} (not allowed)`);
  }

  // evidence quotes must be verbatim contiguous substrings of the student's turn
  for (const r of out.evaluation?.resolved_this_turn || []) {
    if (!r.evidence_quote || !norm(c.student_turn).includes(norm(r.evidence_quote)))
      errs.push(`evidence_quote for ${r.id} not a verbatim substring: "${r.evidence_quote}"`);
  }

  // updated_state must agree with resolved set (monotonic from prior state)
  const st = out.updated_state?.misconceptions || {};
  for (const id of resolvedIds)
    if (st[id] !== "resolved") errs.push(`state disagrees: ${id} resolved but state=${st[id]}`);
  for (const [id, was] of Object.entries(c.state.misconceptions))
    if (was === "resolved" && st[id] !== "resolved") errs.push(`non-monotonic: ${id} un-resolved`);

  // Milo leak-safety
  if (e.leak_check) {
    const reply = (out.milo?.reply || "").toLowerCase();
    for (const w of LEAK)
      if (reply.includes(w.toLowerCase())) errs.push(`Milo leaked "${w.trim()}"`);
    if (!out.milo?.reply) errs.push("Milo reply empty");
  }
  return errs;
}

const run = async () => {
  console.log(`model: ${MODEL} via ${GATEWAY}\n`);
  let pass = 0;
  for (const c of casesFile.cases) {
    process.stdout.write(`• ${c.name} ... `);
    try {
      const out = await callModel(buildPrompt(c));
      const errs = check(c, out);
      if (errs.length === 0) { console.log("PASS"); pass++; }
      else { console.log("FAIL"); errs.forEach(e => console.log("    - " + e));
             console.log("    reply: " + JSON.stringify(out.milo?.reply)); }
    } catch (err) { console.log("ERROR"); console.log("    " + err.message); }
  }
  console.log(`\n${pass}/${casesFile.cases.length} passed  (${totalTokens.toLocaleString()} tokens this run)`);
  if (pass === casesFile.cases.length) console.log("ALL PASS ✅  safe to build UI");
  else { console.log("Fix prompts/turn.md and re-run. Do NOT edit cases to pass.");
         process.exit(1); }
};
run();
