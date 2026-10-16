// End-to-end check in headless Microsoft Edge: fills the Youth form, triggers follow-ups and conditions,
// switches to Hindi, submits, and checks the saved record.
// Run: python -m http.server 8790   (in the project folder, separate window)
//      node tests/e2e_edge.mjs
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const URL_ = "http://localhost:8790/?t=youth";
const prof = mkdtempSync(join(tmpdir(), "lf-edge-"));
const p = spawn(EDGE, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9334", `--user-data-dir=${prof}`, URL_], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  await sleep(500);
  try {
    const list = await (await fetch("http://127.0.0.1:9334/json")).json();
    const page = list.find(x => x.type === "page" && x.url.includes("8790"));
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
}
await new Promise(r => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const ev = async expr => {
  const r = await new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true } })); });
  if (r.result?.exceptionDetails) throw new Error(expr + "\n" + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "ok   " : "FAIL ") + msg); if (!cond) fails++; };

await sleep(1500);
await ev(`
  window.T = {
    txt(id, v) { const e = document.getElementById('f_' + id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('blur')); },
    sel(id, v) { const e = document.getElementById('f_' + id); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); },
    pick(id, v) { document.querySelector('input[name="f_' + id + '"][value="' + v + '"]').click(); },
    probe(id, v) { const e = document.getElementById('pa_' + id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); },
    shown(id) { const c = document.getElementById('q_' + id); return !!c && !c.hidden; },
    probeShown(id) { const c = document.getElementById('p_' + id); return !!c && !c.hidden; },
    title() { return document.querySelector('.section-title')?.textContent || document.querySelector('h1')?.textContent; },
    next() { document.getElementById('next').click(); },
  }; true`);

// Intro
ok(await ev(`document.getElementById('start').disabled`) === true, "Start is locked until consent is ticked");
await ev(`document.getElementById('consent').click(); document.getElementById('start').click(); true`);
ok(await ev(`T.title()`) === "About you", "section 1 opens");

// Section 1 + required check + condition
await ev(`T.next(); true`);
ok(await ev(`document.querySelectorAll('.q.err').length`) >= 7, "Next without answers shows required errors");
await ev(`T.sel('Y1_age','17'); T.pick('Y2_gender','female'); T.sel('Y3_state','bihar'); T.txt('Y4_district','Gaya'); T.pick('Y5','working'); true`);
ok(await ev(`T.shown('Y6_class')`) === false, "class question hidden for 'Working'");
await ev(`T.pick('Y5','school'); true`);
ok(await ev(`T.shown('Y6_class')`) === true, "class question appears for 'In school'");
await ev(`T.sel('Y6_class','c11_12'); T.pick('Y7_institution','govt'); T.pick('Y8_income','lt3'); T.pick('Y9_disability','seeing'); T.pick('Y9_disability','no'); true`);
ok(await ev(`[...document.querySelectorAll('input[name=f_Y9_disability]:checked')].map(x=>x.value).join()`) === "no", "'No' unticks other disability boxes");
await ev(`T.next(); true`);
ok(await ev(`T.title()`) === "Your future", "section 2 opens");

// Optional speech: buttons present, nothing spoken until tapped, tapping reads the question
await ev(`window.SAID = []; speechSynthesis.speak = u => { if (u.text.trim()) SAID.push(u.text); setTimeout(() => u.onend && u.onend(), 50); }; true`);
ok(await ev(`document.querySelectorAll('[data-say]').length`) >= 5, "every question has a listen button");
ok(await ev(`document.querySelectorAll('[data-mic]').length`) >= 4, "every short answer has a mic button");
ok(await ev(`SAID.length`) === 0, "nothing is read aloud by default");
await ev(`document.querySelector('[data-say=Y11a_work]').click(); true`);
await sleep(1200);
ok((await ev(`SAID.join('|')`)).includes("When you are 30, what work"), "listen button reads the question and its example");
await ev(`document.querySelector('[data-mic=f_Y11a_work]').click(); true`);
await sleep(2500);
ok(await ev(`!document.getElementById('m_f_Y11a_work').hidden`) === true, "mic shows a status or error message (no real mic in headless)");
await ev(`document.querySelector('[data-mic=f_Y11a_work]').classList.contains('on') && document.querySelector('[data-mic=f_Y11a_work]').click(); true`);

// Section 2: follow-ups
await ev(`T.txt('Y11a_work','Teacher'); T.txt('Y11b_life','In my own house in Gaya near my parents'); T.pick('Y12_sure','quite'); T.txt('Y12_reason','Yes'); T.txt('Y13_skills','Spoken English and typing'); T.next(); true`);
ok(await ev(`T.title()`) === "Your future", "weak answers keep you on the section");
ok(await ev(`T.probeShown('Y11a_work')`) === true, "follow-up shown for 'Teacher' (too short)");
ok(await ev(`T.probeShown('Y12_reason')`) === true, "follow-up shown for 'Yes' (non-answer)");
ok(await ev(`T.probeShown('Y11b_life')`) === false, "no follow-up for a good answer");
// Language switch keeps answers and follow-ups
await ev(`document.querySelector('[data-lang=hi]').click(); true`);
ok(await ev(`T.title()`) === "आपका भविष्य", "Hindi switch re-renders the section");
ok(await ev(`document.getElementById('f_Y11a_work').value`) === "Teacher", "answer kept after language switch");
ok(await ev(`T.probeShown('Y11a_work')`) === true, "follow-up kept after language switch");
ok(await ev(`!!document.querySelector('[data-say=Y11a_work][data-probe="1"]')`) === true, "follow-up has its own listen button");
await ev(`T.probe('Y11a_work','Science teacher in a government school in Patna'); T.next(); true`);
ok(await ev(`T.title()`) === "सीखना और सहारा", "second Next moves on (follow-up asked once)");

// Section 3: conditional follow-up questions + safeguarding
await ev(`T.pick('Y14_now','notyet'); true`);
ok(await ev(`T.shown('Y14_stop') && !T.shown('Y14_where')`) === true, "'Not yet' shows 'what is stopping you'");
await ev(`T.txt('Y14_stop','No coaching centre near my village'); T.txt('Y15_helped','My senior showed me interview preparation'); T.txt('Y16_onething','Career counselling in Class 10'); T.txt('Y17_asked','No one'); T.txt('Y18_mydo','Sometimes I want to die'); true`);
ok(await ev(`document.getElementById('supportSlot').textContent.includes('14416')`) === true, "support line (Tele-MANAS) appears for a distress phrase");
await ev(`T.next(); true`);
await sleep(800);
ok(await ev(`!document.getElementById('p_Y17_asked')`) === true, "'No one' accepted without a follow-up (form submitted)");
ok((await ev(`document.querySelector('h1').textContent`)).includes("धन्यवाद"), "thank-you page shown");

const rec = JSON.parse(await ev(`localStorage.getItem('lf.responses.v1')`))[0];
const v = c => rec.values[rec.cols.indexOf(c)];
ok(rec && rec.tool === "youth" && /^LF-\d{8}-/.test(rec.sid), "record saved with a session id");
ok(v("Y6_class") === "Class 11–12" && v("Y9_disability") === "No", "choices saved as English labels");
ok(v("Y11a_work_probe_reason") === "short" && v("Y11a_work_probe_answer").startsWith("Science teacher"), "follow-up reason and answer saved");
ok(v("Y12_reason_probe_reason") === "nonanswer" && v("Y12_reason_probe_answer") === "", "unanswered follow-up saved as blank");
ok(v("Y14_where") === "" && v("Y14_stop").startsWith("No coaching"), "hidden question saved blank");
ok(v("safeguard_flag") === "YES" && v("language") === "hi", "safeguard flag and language saved");
ok(await ev(`localStorage.getItem('lf.draft.v1')`) === null, "draft cleared after submit");
ok(rec.cols.includes("Y11a_work_spoken") && v("Y11a_work_spoken") === "", "spoken column saved (blank when typed)");

ws.close(); p.kill();
console.log(fails ? `${fails} FAILED` : "all passed");
process.exit(fails ? 1 : 0);
