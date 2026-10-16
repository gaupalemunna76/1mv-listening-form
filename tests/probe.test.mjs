// Run: node tests/probe.test.mjs
// Cases are real answer shapes from the 1MV pilot (Form + Mitra), Oct 2026.
import assert from "node:assert/strict";
import { assess, isDistress } from "../probe.js";
import { TOOLS } from "../questions.js";

const item = id => Object.values(TOOLS).flatMap(t => t.sections.flatMap(s => s.items)).find(q => q.id === id);
let n = 0;
const check = (id, text, want) => { const got = assess(text, item(id).probe); assert.equal(got, want, `${id}: "${text}" -> ${got}, expected ${want}`); n++; };

// Empty, non-answers, gibberish
check("Y12_reason", "", "empty");
check("Y12_reason", "   ", "empty");
check("Y12_reason", "Yes", "nonanswer");
check("Y12_reason", "yess", "nonanswer");
check("Y16_onething", "Nothing.", "nonanswer");
check("P15_onething", "पता नहीं", "nonanswer");
check("Y12_reason", "!!! ???", "unclear");
check("Y12_reason", "aaaaaa", "unclear");

// Too short
check("Y11a_work", "Teacher", "short");
check("Y13_skills", "skills", "vague");
check("Y15_helped", "teacher", "short");

// Vague words only (pilot: "Peaceful", "Good job", "Hard work", "study hard", "Support")
check("Y11b_life", "Peaceful and happy life", "vague");
check("Y11a_work", "a good job", "vague");
check("Y13_skills", "Hard work and continuous learning", "vague");
check("Y16_onething", "Give more support and guidance", "vague");
check("P11_change", "Good study", "vague");
check("P11_change", "Better education and good teaching", "vague");

// Good answers pass
check("Y11a_work", "Running my own tailoring shop with two helpers", null);
check("Y11a_work", "Nurse in AIIMS", null);
check("Y11b_life", "In my own house in Gaya near my parents", null);
check("Y12_reason", "My family supports me but fees are a worry", null);
check("Y13_skills", "Spoken English and typing", null);
check("Y16_onething", "Career counselling in Class 10", null);
check("P11_change", "More regular teachers and clean toilets", null);
check("P14_why", "मैंने सिर्फ़ पाँचवीं तक पढ़ाई की है", null);
check("G10_worry", "Too much time on mobile phones", null);

// Allowed short answers
check("Y17_asked", "No one", null);
check("Y17_asked", "किसी से नहीं", null);
check("P13_lastweek", "Nothing this week", null);
check("P10_work", "Whatever my child chooses", null);
check("P10_work", "jo bachcha chahe", null);

// Distress detection (pilot had "Aatmhatya" in a Mitra parent answer)
assert.equal(isDistress("Aatmhatya"), true); n++;
assert.equal(isDistress("Sometimes I want to die"), true); n++;
assert.equal(isDistress("मैं आत्महत्या के बारे में सोचता हूँ"), true); n++;
assert.equal(isDistress("I want a peaceful life"), false); n++;

// Every short/para question has a follow-up in English and Hindi; every text has en + hi
for (const tool of Object.values(TOOLS)) for (const s of tool.sections) for (const q of s.items) {
  assert.ok(q.label.en && q.label.hi, `${q.id} label`);
  if (q.type === "short" && !q.id.match(/district/)) assert.ok(q.probe?.ask?.en && q.probe?.ask?.hi, `${q.id} probe`);
  if (q.hint) assert.ok(q.hint.en && q.hint.hi, `${q.id} hint`);
  for (const o of q.options || []) assert.ok(o.en && o.hi, `${q.id} option ${o.v}`);
  n++;
}
console.log(`ok - ${n} checks passed`);
