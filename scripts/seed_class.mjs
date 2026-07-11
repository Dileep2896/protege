// seed_class.mjs — hand-authored demo sessions for the 5 classmates.
// No LLM calls: every transcript, resolution, and evidence quote is written by
// hand so the teacher dashboard has a full class to show. Evidence quotes are
// verbatim substrings of the student turns (same invariant the evaluator keeps).
// Run: node scripts/seed_class.mjs        Re-run safe: deletes prior classmate rows first.
import { readFileSync } from "fs";

const env = Object.fromEntries(readFileSync(".env", "utf8").split("\n").filter(l => l.includes("=")).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const KEY = env.BUTTERBASE_API_KEY;
const BASE = "https://api.butterbase.ai/v1/app_c3jiru08r6vi";

const TRIG = "topic_a13e4360-1efb-4a9a-894a-9404e55b0fc8";   // Right Triangles and Their Parts
const WATER = "topic_23b0a212-6b8f-4f15-bf2c-e6e2f73a3413";  // Water Changes Its Form
const EVAP = "topic_d1ed6dcd-c268-4c86-9849-3d8379842f2a";   // Evaporation and Transpiration
const FRAC = "fractions_division";

const TITLES = {
  [TRIG]: "Right Triangles and Their Parts",
  [WATER]: "Water Changes Its Form",
  [EVAP]: "Evaporation and Transpiration: Water Enters the Air",
  [FRAC]: "Dividing fractions"
};

const day = (d, h = 16, m = 10) => `2026-07-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${m}:00.000Z`;

// One session row. `resolved` = {mid: evidenceQuote}; quotes MUST appear verbatim in a student turn.
function S(learner, pack, created, turns, resolved, unresolvedIds, report = null) {
  const misconceptions = {};
  for (const mid of Object.keys(resolved)) misconceptions[mid] = "resolved";
  for (const mid of unresolvedIds) misconceptions[mid] = "unresolved";
  return {
    learner_id: learner, pack_id: pack, pack_title: TITLES[pack], milo_level: "11",
    created_at: created,
    state: { phase: unresolvedIds.length ? "teaching" : "done", misconceptions },
    messages: { turns },
    evidence: resolved,
    report
  };
}
const st = text => ({ who: "student", text });
const ag = text => ({ who: "agent", mood: "thinking", text });

const ROWS = [
  // ── Ava Patel — the star: long turns, analogies, 4-day streak ─────────────
  S("ava_patel", FRAC, day(8, 15, 5), [
    ag("Why would I flip the second fraction? That feels like a magic trick."),
    st("It's not magic, it comes from what dividing means. Think of it like sharing pizza: dividing by a half is really asking how many halves fit inside the number. So 3 divided by 1/2 asks how many half-pizzas fit in 3 pizzas — and two halves fit in each pizza, so six fit total. Multiplying by 2/1 counts the exact same thing, which is why flipping works."),
    ag("Ohh, so the flip is just the counting trick written down?"),
    st("Exactly. And that's why dividing by a fraction smaller than 1 makes the answer BIGGER, not smaller — you are counting little pieces, and more little pieces fit. Dividing only shrinks things when the divisor is bigger than 1."),
    st("And you can only flip the second fraction, the divisor, because the question is how many of THAT thing fit. Imagine flipping the first one instead — you'd be answering a completely different question about a completely different pizza.")
  ], {
    m1: "dividing by a half is really asking how many halves fit inside the number",
    m2: "dividing by a fraction smaller than 1 makes the answer BIGGER, not smaller — you are counting little pieces, and more little pieces fit",
    m3: "you can only flip the second fraction, the divisor, because the question is how many of THAT thing fit"
  }, [],
  "## Teaching report — Ava Patel · Dividing fractions\n\n**All 3 confusions resolved.**\n\nAva taught flip-and-multiply through the how-many-fit meaning of division, predicted why answers grow when dividing by fractions under 1, and explained why only the divisor flips. Every resolution carried a mechanism, not a rule restated.\n\n> \"Dividing by a half is really asking how many halves fit inside the number\""),
  S("ava_patel", WATER, day(9, 15, 20), [
    ag("When a puddle dries up, the water is just gone, right?"),
    st("It's not gone — picture the puddle as a crowd of tiny water molecules. The sun gives the fastest ones enough energy to break away and float into the air as vapor. The water still exists, you just can't see it because the molecules are spread out and invisible."),
    ag("Then why does my cold soda can get wet on the OUTSIDE?"),
    st("Because the air already carries that invisible vapor everywhere. When vapor bumps into the cold can it loses energy, slows down, and turns back into liquid drops on the surface. The water comes from the air around the can, not through the can."),
    st("And melting is different from evaporating — melting is solid to liquid, evaporating is liquid to gas. Same molecules, different jumps between forms.")
  ], {
    m1: "The water still exists, you just can't see it because the molecules are spread out and invisible",
    m2: "The water comes from the air around the can, not through the can",
    m3: "melting is different from evaporating — melting is solid to liquid, evaporating is liquid to gas"
  }, []),
  S("ava_patel", TRIG, day(10, 16, 40), [
    ag("The hypotenuse is just whichever side looks longest, isn't it?"),
    st("Don't measure — look for the right angle. Picture the right angle as a flashlight: the side it shines on is the hypotenuse. The hypotenuse is the side sitting directly across from the 90-degree corner, always. That's its definition, so even in a badly drawn triangle you find it by the angle, not by eyeballing lengths."),
    ag("Okay... and opposite and adjacent are like, labeled on the triangle permanently?"),
    st("No — opposite and adjacent are relative to whichever angle you pick, like left and right depend on which way you're facing. Pick a different angle and the same side switches names. Only the hypotenuse never changes.")
  ], {
    m2: "The hypotenuse is the side sitting directly across from the 90-degree corner, always",
    m1: "opposite and adjacent are relative to whichever angle you pick, like left and right depend on which way you're facing"
  }, ["m3"]),
  S("ava_patel", TRIG, day(11, 15, 55), [
    ag("But couldn't the hypotenuse BE the adjacent side sometimes, if I pick the right angle itself?"),
    st("You never measure trig ratios FROM the right angle, so that case never happens. The hypotenuse can't be adjacent because adjacent means the leg touching your chosen angle that isn't the hypotenuse — the hypotenuse already has its own permanent job across from the right angle.")
  ], {
    m3: "The hypotenuse can't be adjacent because adjacent means the leg touching your chosen angle that isn't the hypotenuse"
  }, []),

  // ── Marcus Lee — hedger: knows it, doesn't trust it ──────────────────────
  S("marcus_lee", FRAC, day(9, 17, 15), [
    ag("Why flip and multiply though? It seems random."),
    st("I think it's because dividing asks how many times the bottom fraction fits into the top one. Like 4 divided by 1/2 is maybe asking how many halves are in 4, and there are 8, so it's kind of the same as 4 times 2."),
    ag("Hm. So dividing made it bigger? Dividing is supposed to make things smaller..."),
    st("Not always, I guess. If the thing you divide by is smaller than 1, the answer gets bigger because more small pieces fit. I'm not sure about which fraction to flip though, I always mix that up.")
  ], {
    m1: "dividing asks how many times the bottom fraction fits into the top one",
    m2: "If the thing you divide by is smaller than 1, the answer gets bigger because more small pieces fit"
  }, ["m3"]),
  S("marcus_lee", EVAP, day(11, 14, 30), [
    ag("Water only evaporates when it boils, right? That's why we boil kettles."),
    st("No, I think evaporation happens at any temperature, even from a cold puddle. The fastest molecules at the surface escape even when the rest are slow. Boiling is just when it happens everywhere at once really fast."),
    ag("So when the ocean evaporates, does the salt go up too?"),
    st("Maybe... actually I'm not sure. I guess the salt stays behind? I don't remember why though.")
  ], {
    m2: "evaporation happens at any temperature, even from a cold puddle. The fastest molecules at the surface escape"
  }, ["m1", "m3"]),

  // ── Priya Sharma — fragments: right ideas, four words at a time ──────────
  S("priya_sharma", TRIG, day(10, 18, 5), [
    ag("So the hypotenuse is the longest-looking side?"),
    st("No. Across from the right angle."),
    ag("Always across from it? Even if it doesn't look longest?"),
    st("Yes. The right angle points at it. That's the rule, the hypotenuse is the side opposite the 90 degree angle no matter how it looks."),
    ag("And opposite and adjacent, those are printed on the sides forever?"),
    st("Depends which angle you pick.")
  ], {
    m2: "the hypotenuse is the side opposite the 90 degree angle no matter how it looks"
  }, ["m1", "m3"]),
  S("priya_sharma", WATER, day(11, 13, 45), [
    ag("Where does a dried puddle go?"),
    st("Into the air. The molecules get energy from the sun and escape as invisible vapor, the water is still there just spread out in the air."),
    ag("And the wet cold glass? Water leaking through?"),
    st("No. Vapor in the air touches the cold glass, cools down and condenses into drops on the outside.")
  ], {
    m1: "The molecules get energy from the sun and escape as invisible vapor, the water is still there just spread out in the air",
    m2: "Vapor in the air touches the cold glass, cools down and condenses into drops on the outside"
  }, ["m3"]),

  // ── Jake Turner — rambler: lots of words, mechanism sometimes ────────────
  S("jake_turner", EVAP, day(10, 15, 30), [
    ag("Evaporation only happens when water boils, right?"),
    st("Okay so imagine you have like a swimming pool and it's summer and the pool level drops even though nobody boiled the pool, obviously, because that would be insane, so water clearly leaves somehow without boiling. My uncle has a pool so I've literally watched this happen all summer."),
    ag("But WHY does it leave if it's not boiling?"),
    st("Because the sun is hot? Like the sun is basically cooking it a little bit. It just evaporates slower, it's like a slow-motion boil kind of, the water gets tired of being water."),
    ag("The water gets... tired? What about the salt in the ocean then?"),
    st("The salt probably evaporates too honestly, like sea spray, that's why beach air tastes salty. Pretty sure that's the vapor carrying it.")
  ], {}, ["m1", "m2", "m3"]),
  S("jake_turner", FRAC, day(10, 19, 10), [
    ag("Why would flipping the second fraction work at all?"),
    st("Think of it like this, dividing by a half is asking how many half-slices of pizza you can hand out, so if you have 3 pizzas you can hand out 6 half-slices because every pizza gives you two halves. So dividing by 1/2 is secretly the same as multiplying by 2, which is the flip. That part I actually get."),
    ag("So which one do I flip when both are fractions?"),
    st("Whichever one is uglier? I usually just flip one and see if the answer looks reasonable, not gonna lie.")
  ], {
    m1: "dividing by a half is asking how many half-slices of pizza you can hand out"
  }, ["m2", "m3"]),

  // ── Emma Rossi — steady: quietly resolves almost everything ──────────────
  S("emma_rossi", WATER, day(10, 14, 20), [
    ag("A dried puddle means the water stopped existing, right?"),
    st("It still exists — think of the puddle as a crowd slowly leaving a stadium. The puddle's molecules absorbed heat and escaped into the air as water vapor. You can't see vapor, but the same water is up there and can come back down as rain."),
    ag("Then what's the water on the outside of a cold glass? A leak?"),
    st("It never leaked. The air holds invisible vapor, and when that vapor touches the cold glass it loses heat and condenses back into liquid on the surface. Condensation is evaporation running in reverse."),
    st("Melting isn't the same thing either — ice melting is solid becoming liquid. Evaporation is liquid becoming gas. They're two different steps on the same ladder.")
  ], {
    m1: "The puddle's molecules absorbed heat and escaped into the air as water vapor",
    m2: "when that vapor touches the cold glass it loses heat and condenses back into liquid on the surface",
    m3: "ice melting is solid becoming liquid. Evaporation is liquid becoming gas"
  }, [],
  "## Teaching report — Emma Rossi · Water Changes Its Form\n\n**All 3 confusions resolved.**\n\nEmma taught conservation through the molecular story, condensation via energy loss on contact, and cleanly separated melting from evaporation. Calm, complete, mechanism-first teaching.\n\n> \"when that vapor touches the cold glass it loses heat and condenses back into liquid on the surface\""),
  S("emma_rossi", TRIG, day(11, 16, 25), [
    ag("Opposite and adjacent are permanent labels on the sides, right?"),
    st("They're relative, not permanent — like how 'left' and 'right' swap when you turn around. Opposite is the side across from the angle you chose, adjacent is the leg touching it. Choose the other angle and the two sides swap names."),
    ag("And the hypotenuse is just the longest-looking one?"),
    st("You find it from the right angle, not by looking — it's always the side facing the 90-degree corner. It happens to be longest, but that's a consequence, not the definition.")
  ], {
    m1: "Opposite is the side across from the angle you chose, adjacent is the leg touching it",
    m2: "it's always the side facing the 90-degree corner. It happens to be longest, but that's a consequence, not the definition"
  }, ["m3"]),
  S("emma_rossi", EVAP, day(11, 17, 40), [
    ag("Does the salt evaporate with the ocean water?"),
    st("No — only the water molecules gain enough energy to escape. Salt is dissolved in the liquid and gets left behind, which is why evaporated seawater leaves salt crusts and why rain is fresh water."),
    ag("And water needs to boil to evaporate?"),
    st("It evaporates at any temperature. The fastest surface molecules always escape a little at a time; boiling just makes it happen all through the liquid at once.")
  ], {
    m3: "only the water molecules gain enough energy to escape. Salt is dissolved in the liquid and gets left behind",
    m2: "It evaporates at any temperature. The fastest surface molecules always escape a little at a time"
  }, ["m1"])
];

// Sanity: every evidence quote must be a verbatim substring of one of that session's student turns.
for (const r of ROWS)
  for (const [mid, q] of Object.entries(r.evidence))
    if (!r.messages.turns.some(t => t.who === "student" && t.text.includes(q)))
      throw new Error(`evidence not verbatim: ${r.learner_id} ${r.pack_id} ${mid}`);

const CLASSMATES = ["ava_patel", "marcus_lee", "priya_sharma", "jake_turner", "emma_rossi"];
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// wipe previous classmate rows (idempotent re-runs) — delete is per-id on this API
for (const id of CLASSMATES) {
  const old = await fetch(`${BASE}/sessions?learner_id=eq.${id}&select=id`, { headers: H }).then(r => r.json()).catch(() => []);
  for (const row of old) await fetch(`${BASE}/sessions/${row.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${KEY}` } });
}

let ok = 0;
for (const row of ROWS) {
  const res = await fetch(`${BASE}/sessions`, { method: "POST", headers: H, body: JSON.stringify(row) });
  if (res.ok) ok++;
  else console.log("FAIL", row.learner_id, row.pack_id, res.status, (await res.text()).slice(0, 200));
}
console.log(`${ok}/${ROWS.length} sessions seeded`);

// verify created_at was honored (streaks depend on it)
const check = await fetch(`${BASE}/sessions?learner_id=eq.ava_patel&select=created_at,pack_title&order=created_at.asc`, { headers: H }).then(r => r.json());
console.log("ava dates:", check.map(r => r.created_at.slice(0, 10)).join(", "));
