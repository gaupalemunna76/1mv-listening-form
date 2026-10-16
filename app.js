import { TOOLS } from "./questions.js?v=20261016-2127";
import { LANGS, UI, t } from "./i18n.js?v=20261016-2127";
import { assess, isDistress } from "./probe.js?v=20261016-2127";
import { SHEET_URL } from "./config.js?v=20261016-2127";
import { canSpeak, canListen, loadVoices, pickVoice, speak, stopSpeaking, unlockSpeech, listen } from "./speech.js?v=20261016-2127";

const VERSION = "20261016-2127";
const DRAFT = "lf.draft.v1";
const STORE = "lf.responses.v1";
const TOOL_NAME = "1MV Listening Form";
const $ = sel => document.querySelector(sel);
const app = $("#app");
const params = new URLSearchParams(location.search);

const S = { lang: "en", tool: null, sec: -1, A: {}, P: {}, V: {}, flag: false, sid: "", started: "", source: params.get("src") || "" };

// ---------------- storage (wrapped: private windows can refuse storage) ----------------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const saveDraft = () => S.tool && save(DRAFT, { tool: S.tool.key, lang: S.lang, sec: S.sec, A: S.A, P: S.P, V: S.V, flag: S.flag, sid: S.sid, started: S.started, source: S.source });
const clearDraft = () => { try { localStorage.removeItem(DRAFT); } catch {} };

// ---------------- helpers ----------------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tx = (entry, vars) => esc(t(entry, S.lang, vars));
const visible = q => !q.showIf || !!q.showIf(S.A);
const textTypes = new Set(["short", "para"]);
const newSid = () => {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return `LF-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};
const allItems = tool => tool.sections.flatMap(s => s.items);

function setLang(code) {
  S.lang = LANGS.some(l => l.code === code) ? code : "en";
  document.documentElement.lang = S.lang;
  renderLangs();
  saveDraft();
  render();
}
function renderLangs() {
  $("#langs").innerHTML = LANGS.map(l => `<button type="button" data-lang="${l.code}" aria-pressed="${l.code === S.lang}">${esc(l.name)}</button>`).join("");
  $("#langs").querySelectorAll("button").forEach(b => b.onclick = () => setLang(b.dataset.lang));
  $("#brand").textContent = t(UI.appName, S.lang);
}

// ---------------- screens ----------------
function render() {
  stopVoice();
  if (params.has("admin")) return renderAdmin();
  if (!S.tool) return renderChoose();
  if (S.sec === -1) return renderIntro();
  if (S.sec >= S.tool.sections.length) return renderThanks();
  return renderSection();
}

function renderChoose() {
  const d = load(DRAFT, null);
  const resume = d && TOOLS[d.tool] ? `
    <div class="card"><p>${tx(UI.resume)}</p>
      <div class="nav"><button class="btn" id="resumeYes">${tx(UI.resumeYes)}</button><button class="btn ghost" id="resumeNo">${tx(UI.resumeNo)}</button></div></div>` : "";
  app.innerHTML = `
    <div class="card head"><h1>${tx(UI.chooseTitle)}</h1><p class="muted">${tx(UI.chooseLead)}</p></div>
    ${resume}
    <button class="pick" data-tool="youth"><b>${tx(TOOLS.youth.title)}</b><span class="muted">${tx(UI.pickYouth)}</span></button>
    <button class="pick" data-tool="parent"><b>${tx(TOOLS.parent.title)}</b><span class="muted">${tx(UI.pickParent)}</span></button>
    <button class="pick" data-tool="public"><b>${tx(TOOLS.public.title)}</b><span class="muted">${tx(UI.pickPublic)}</span></button>`;
  app.querySelectorAll(".pick").forEach(b => b.onclick = () => startTool(b.dataset.tool));
  if (resume) {
    $("#resumeYes").onclick = () => restore(d);
    $("#resumeNo").onclick = () => { clearDraft(); renderChoose(); };
  }
}

function startTool(key) {
  Object.assign(S, { tool: TOOLS[key], sec: -1, A: {}, P: {}, V: {}, flag: false, sid: newSid(), started: new Date().toISOString() });
  saveDraft(); render(); scrollTo(0, 0);
}
function restore(d) {
  Object.assign(S, { tool: TOOLS[d.tool], sec: d.sec, A: d.A || {}, P: d.P || {}, V: d.V || {}, flag: !!d.flag, sid: d.sid || newSid(), started: d.started || new Date().toISOString(), source: d.source || S.source });
  setLang(d.lang || S.lang);
}

function renderIntro() {
  const tool = S.tool;
  app.innerHTML = `
    <div class="card head">
      <h1>${tx(tool.title)}</h1>
      <p>${tx(tool.intro)}</p>
      <p class="note">${tx(UI.privacy)}</p>
      ${canSpeak || canListen ? `<p class="muted small">${tx(UI.voiceHelp)}</p>` : ""}
      ${S.lang === "hi" ? `<p class="muted small">${tx(UI.hindiDraft)}</p>` : ""}
      <label class="check"><input type="checkbox" id="consent"><span>${tx(UI.consent)}</span></label>
      <div class="nav"><button class="btn ghost" id="back">${tx(UI.back)}</button><button class="btn" id="start" disabled>${tx(UI.start)}</button></div>
    </div>`;
  $("#consent").onchange = e => { $("#start").disabled = !e.target.checked; };
  $("#back").onclick = () => { S.tool = null; clearDraft(); render(); };
  $("#start").onclick = () => { S.sec = 0; saveDraft(); render(); scrollTo(0, 0); };
}

function supportBox() {
  return `<div class="support" role="note"><b>${tx(UI.supportTitle)}</b><span>${tx(UI.supportText)}</span></div>`;
}

function renderSection() {
  const tool = S.tool, sec = tool.sections[S.sec], n = tool.sections.length;
  app.innerHTML = `
    <div class="card head">
      <h1>${tx(tool.title)}</h1>
      <div class="progress" aria-hidden="true"><i style="width:${Math.round((S.sec / n) * 100)}%"></i></div>
      <p class="muted small">${tx(UI.sectionOf, { i: S.sec + 1, n })}</p>
      <h2 class="section-title">${tx(sec.title)}</h2>
      ${sec.note ? `<p class="note">${tx(sec.note)}</p>` : ""}
    </div>
    <div id="supportSlot">${S.flag ? supportBox() : ""}</div>
    ${sec.items.map(itemHTML).join("")}
    <div class="nav">
      <button class="btn ghost" id="back">${tx(UI.back)}</button>
      <button class="btn" id="next">${tx(S.sec === n - 1 ? UI.submit : UI.next)}</button>
    </div>`;
  sec.items.forEach(wireItem);
  updateVisibility();
  app.querySelectorAll("textarea.grow").forEach(autoGrow);
  $("#back").onclick = () => { S.sec -= 1; saveDraft(); render(); scrollTo(0, 0); };
  $("#next").onclick = onNext;
}

function itemHTML(q) {
  const v = S.A[q.id];
  const req = q.required ? `<span class="req" aria-label="${tx(UI.required)}">*</span>` : "";
  let body = "";
  if (q.type === "short") body = withMic(`f_${q.id}`, `<textarea rows="1" class="grow" id="f_${q.id}" maxlength="1500" placeholder="${tx(UI.yourAnswer)}">${esc(v)}</textarea>`, q.id === "Y4_district" || /district/.test(q.id));
  else if (q.type === "para") body = withMic(`f_${q.id}`, `<textarea id="f_${q.id}" maxlength="3000" placeholder="${tx(UI.yourAnswer)}">${esc(v)}</textarea>`);
  else if (q.type === "number") body = `<input type="number" id="f_${q.id}" inputmode="numeric" min="${q.min}" max="${q.max}" value="${esc(v)}" placeholder="${tx(UI.yourAnswer)}">`;
  else if (q.type === "dropdown") {
    body = `<select id="f_${q.id}"><option value="">${tx(UI.choose)}</option>
      ${q.options.map(o => `<option value="${esc(o.v)}"${v === o.v ? " selected" : ""}>${tx(o)}</option>`).join("")}
      ${q.other ? `<option value="__other"${v === "__other" ? " selected" : ""}>${tx(UI.other).replace(/:$/, "")}</option>` : ""}</select>
      ${q.other ? `<input type="text" id="o_${q.id}" maxlength="200" placeholder="${tx(UI.yourAnswer)}" value="${esc(S.A[q.id + "_other"])}" ${v === "__other" ? "" : "hidden"}>` : ""}`;
  } else if (q.type === "choice" || q.type === "multi") {
    const kind = q.type === "choice" ? "radio" : "checkbox";
    const sel = q.type === "multi" ? (v || []) : [v];
    body = `<div class="opts" role="${kind === "radio" ? "radiogroup" : "group"}">
      ${q.options.map(o => `<label class="opt"><input type="${kind}" name="f_${q.id}" value="${esc(o.v)}"${sel.includes(o.v) ? " checked" : ""}><span>${tx(o)}</span></label>`).join("")}
      ${q.other ? `<div class="other-row"><label class="opt"><input type="${kind}" name="f_${q.id}" value="__other"${sel.includes("__other") ? " checked" : ""}><span>${tx(UI.other)}</span></label>
        <input type="text" id="o_${q.id}" maxlength="200" value="${esc(S.A[q.id + "_other"])}"></div>` : ""}</div>`;
  }
  const p = S.P[q.id];
  return `<div class="card q" id="q_${q.id}" data-id="${q.id}">
    <div class="q-top"><label class="q-label" for="f_${q.id}">${tx(q.label)}${req}</label>${sayBtn(q.id)}</div>
    ${q.hint ? `<div class="hint">${tx(q.hint)}</div>` : ""}
    ${body}
    <div class="errmsg" id="e_${q.id}" hidden></div>
    <div class="probe" id="p_${q.id}" ${p ? "" : "hidden"}>${p ? probeInner(q, p) : ""}</div>
  </div>`;
}

function probeInner(q, p) {
  const lead = { empty: UI.probeEmpty, nonanswer: UI.probeShort, short: UI.probeShort, vague: UI.probeVague, unclear: UI.probeUnclear }[p.reason] || UI.probeShort;
  return `<div class="q-top"><span>${tx(lead)} <b>${tx(q.probe.ask)}</b></span>${sayBtn(q.id, true)}</div>
    ${withMic(`pa_${q.id}`, `<textarea rows="1" class="grow" id="pa_${q.id}" maxlength="1500" placeholder="${tx(UI.moreHere)}">${esc(p.answer)}</textarea>`)}
    <span class="muted small">${tx(UI.probeSkipNote)}</span>`;
}

// ---------------- optional speech: 🔊 read a question, 🎤 speak an answer ----------------
const ICON_SAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_MIC = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const sayBtn = (id, probe = false) => canSpeak ? `<button type="button" class="icon say" data-say="${id}" data-probe="${probe ? 1 : ""}" aria-label="${tx(UI.listen)}" title="${tx(UI.listen)}">${ICON_SAY}</button>` : "";
const withMic = (fieldId, field, noMic = false) => (!canListen || noMic) ? field
  : `<div class="field-mic">${field}<button type="button" class="icon mic" data-mic="${fieldId}" aria-label="${tx(UI.micStart)}" title="${tx(UI.micStart)}">${ICON_MIC}</button></div>
     <div class="mic-msg muted small" id="m_${fieldId}" hidden></div>`;
const speechLang = () => (LANGS.find(l => l.code === S.lang) || LANGS[0]).speech;

function sayText(id, probe) {
  const q = allItems(S.tool).find(x => x.id === id);
  if (!q) return "";
  if (probe) return t(q.probe.ask, S.lang);
  let s = t(q.label, S.lang).replace(/\s*\(.*?\)\s*$/, "");
  if (q.hint) s += ". " + t(q.hint, S.lang);
  if (q.options && (q.type !== "dropdown" || q.options.length <= 12)) s += ". " + q.options.map(o => t(o, S.lang)).join(", ");
  return s;
}

let saying = null;
async function onSay(btn) {
  stopMic();
  if (saying === btn) { stopSpeaking(); btn.classList.remove("on"); saying = null; return; }
  if (saying) saying.classList.remove("on");
  unlockSpeech();
  saying = btn; btn.classList.add("on");
  await loadVoices();
  const lang = speechLang();
  const voice = pickVoice(lang);
  const r = await speak(sayText(btn.dataset.say, !!btn.dataset.probe), { voice, lang, rate: S.lang === "hi" ? 0.95 : 1 });
  btn.classList.remove("on");
  if (saying === btn) saying = null;
  if (!r.ok && !voice) {
    const card = btn.closest(".q");
    const note = document.createElement("div"); note.className = "muted small"; note.textContent = t(UI.noVoice, S.lang);
    card && !card.querySelector(".novoice") && (note.classList.add("novoice"), btn.closest(".q-top").after(note));
  }
}

let mic = null; // { btn, field, handle }
function stopMic() { if (mic) mic.handle.cancel(); }
function stopVoice() { stopMic(); if (saying) { stopSpeaking(); saying = null; } }

function onMic(btn) {
  if (mic) { const same = mic.btn === btn; stopMic(); if (same) return; }
  stopSpeaking(); if (saying) { saying.classList.remove("on"); saying = null; }
  const field = document.getElementById(btn.dataset.mic);
  const msg = document.getElementById("m_" + btn.dataset.mic);
  const base = field.value.trim();
  const put = text => { field.value = (base && text ? base + " " : base) + (text || ""); field.dispatchEvent(new Event("input", { bubbles: true })); autoGrow(field); };
  btn.classList.add("on"); btn.setAttribute("aria-label", t(UI.micStop, S.lang)); btn.title = t(UI.micStop, S.lang);
  msg.hidden = false; msg.textContent = t(UI.micStop, S.lang);
  const handle = listen({ lang: speechLang(), silenceMs: 5000, maxMs: 180000, noSpeechMs: 9000, onInterim: put });
  mic = { btn, field, handle };
  handle.promise.then(r => {
    if (mic && mic.handle === handle) mic = null;
    btn.classList.remove("on"); btn.setAttribute("aria-label", t(UI.micStart, S.lang)); btn.title = t(UI.micStart, S.lang);
    if (r.text) {
      put(r.text);
      const id = btn.dataset.mic.replace(/^(f|pa)_/, ""), part = btn.dataset.mic.startsWith("pa_") ? "followup" : "answer";
      S.V[id] = S.V[id] && S.V[id] !== part ? "both" : part; saveDraft();
    }
    const err = { "not-allowed": UI.micDenied, network: UI.micNoNet, "no-mic": UI.micNoMic, "start-failed": UI.micDenied }[r.error];
    msg.textContent = err ? t(err, S.lang) : r.text ? t(UI.micAgain, S.lang) : r.cancelled ? "" : t(UI.micNothing, S.lang);
    msg.hidden = !msg.textContent;
    if (r.text) checkDistress(field.value);
  });
}

function autoGrow(el) { if (el.classList.contains("grow")) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; } }
app.addEventListener("click", e => {
  const say = e.target.closest("[data-say]"); if (say) return onSay(say);
  const m = e.target.closest("[data-mic]"); if (m) return onMic(m);
});
app.addEventListener("input", e => { if (e.target.classList?.contains("grow")) autoGrow(e.target); });
app.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.classList?.contains("grow")) e.preventDefault(); });

function wireItem(q) {
  const card = $(`#q_${q.id}`);
  const changed = () => { card.classList.remove("err"); $(`#e_${q.id}`).hidden = true; saveDraft(); updateVisibility(); };
  if (textTypes.has(q.type) || q.type === "number") {
    const f = $(`#f_${q.id}`);
    f.addEventListener("input", () => { S.A[q.id] = f.value; changed(); });
    f.addEventListener("blur", () => checkDistress(f.value));
  } else if (q.type === "dropdown") {
    const f = $(`#f_${q.id}`), o = $(`#o_${q.id}`);
    f.addEventListener("change", () => { S.A[q.id] = f.value; if (o) { o.hidden = f.value !== "__other"; if (!o.hidden) o.focus(); } changed(); });
    if (o) o.addEventListener("input", () => { S.A[q.id + "_other"] = o.value; saveDraft(); });
  } else {
    const boxes = [...card.querySelectorAll(`input[name="f_${q.id}"]`)];
    boxes.forEach(b => b.addEventListener("change", () => {
      if (q.type === "choice") S.A[q.id] = b.value;
      else {
        if (b.checked && q.exclusive?.includes(b.value)) boxes.forEach(x => { if (x !== b) x.checked = false; });
        else if (b.checked && q.exclusive) boxes.forEach(x => { if (q.exclusive.includes(x.value)) x.checked = false; });
        S.A[q.id] = boxes.filter(x => x.checked).map(x => x.value);
      }
      changed();
    }));
    const o = $(`#o_${q.id}`);
    if (o) o.addEventListener("input", () => {
      S.A[q.id + "_other"] = o.value;
      const ob = boxes.find(x => x.value === "__other");
      if (ob && o.value && !ob.checked) { ob.checked = true; ob.dispatchEvent(new Event("change")); }
      saveDraft();
    });
  }
  const pa = () => $(`#pa_${q.id}`);
  card.addEventListener("input", e => {
    if (e.target === pa()) { S.P[q.id].answer = e.target.value; saveDraft(); }
  });
  card.addEventListener("focusout", e => { if (e.target === pa()) checkDistress(e.target.value); });
}

function updateVisibility() {
  S.tool.sections[S.sec].items.forEach(q => { const c = $(`#q_${q.id}`); if (c) c.hidden = !visible(q); });
}

function checkDistress(text) {
  if (!S.flag && isDistress(text)) {
    S.flag = true; saveDraft();
    const slot = $("#supportSlot");
    if (slot) { slot.innerHTML = supportBox(); slot.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }
}

function isEmpty(q) {
  const v = S.A[q.id];
  if (q.type === "multi") return !v || !v.length;
  if (v === "__other") return !String(S.A[q.id + "_other"] || "").trim();
  return v === undefined || v === null || String(v).trim() === "";
}

function onNext() {
  stopVoice();
  const items = S.tool.sections[S.sec].items.filter(visible);
  let first = null;
  const fail = (q, msg) => { const c = $(`#q_${q.id}`); c.classList.add("err"); const e = $(`#e_${q.id}`); e.textContent = msg; e.hidden = false; first ??= c; };
  for (const q of items) {
    if (q.required && isEmpty(q)) fail(q, t(UI.requiredError, S.lang));
    else if (q.type === "number" && !isEmpty(q)) {
      const n = Number(S.A[q.id]);
      if (!Number.isFinite(n) || n < q.min || n > q.max) fail(q, t(UI.numberError, S.lang, { min: q.min, max: q.max }));
    } else if (q.type === "multi" && q.max && (S.A[q.id] || []).length > q.max) fail(q, t(UI.maxError, S.lang, { max: q.max }));
  }
  if (first) { first.scrollIntoView({ behavior: "smooth", block: "center" }); return; }

  // Follow-ups: each short answer gets at most one, the first time Next is pressed with a weak answer.
  for (const q of items) {
    if (!q.probe || S.P[q.id]) continue;
    const reason = assess(S.A[q.id], q.probe);
    if (!reason) continue;
    S.P[q.id] = { reason, answer: "" };
    const box = $(`#p_${q.id}`);
    box.innerHTML = probeInner(q, S.P[q.id]); box.hidden = false; box.querySelectorAll("textarea.grow").forEach(autoGrow);
    first ??= $(`#q_${q.id}`);
  }
  if (first) { saveDraft(); first.scrollIntoView({ behavior: "smooth", block: "center" }); $(`#pa_${first.dataset.id}`)?.focus({ preventScroll: true }); return; }

  S.sec += 1;
  if (S.sec >= S.tool.sections.length) return submit();
  saveDraft(); render(); scrollTo(0, 0);
}

// ---------------- records ----------------
function columns(tool) {
  const cols = ["session_id", "tool", "language", "source", "started_at", "submitted_at", "duration_sec", "app_version", "safeguard_flag"];
  for (const q of allItems(tool)) {
    cols.push(q.id);
    if (q.other) cols.push(q.id + "_other");
    if (q.probe) cols.push(q.id + "_probe_reason", q.id + "_probe_answer");
    if (textTypes.has(q.type)) cols.push(q.id + "_spoken");
  }
  return cols;
}

function valueOf(q) {
  const v = S.A[q.id];
  const label = code => code === "__other" ? "Other" : (q.options.find(o => o.v === code)?.en ?? code);
  if (q.type === "multi") return (v || []).map(label).join("; ");
  if (q.type === "choice" || q.type === "dropdown") return v ? label(v) : "";
  return String(v ?? "").trim();
}

function buildRecord() {
  const now = new Date();
  const row = {
    session_id: S.sid, tool: S.tool.key, language: S.lang, source: S.source, started_at: S.started, submitted_at: now.toISOString(),
    duration_sec: Math.round((now - new Date(S.started)) / 1000), app_version: VERSION, safeguard_flag: S.flag ? "YES" : "",
  };
  for (const q of allItems(S.tool)) {
    const show = visible(q);
    row[q.id] = show ? valueOf(q) : "";
    if (q.other) row[q.id + "_other"] = show ? String(S.A[q.id + "_other"] || "").trim() : "";
    if (q.probe) {
      const p = show ? S.P[q.id] : null;
      row[q.id + "_probe_reason"] = p ? p.reason : "";
      row[q.id + "_probe_answer"] = p ? String(p.answer || "").trim() : "";
    }
    if (textTypes.has(q.type)) row[q.id + "_spoken"] = show ? (S.V[q.id] || "") : "";
  }
  const cols = columns(S.tool);
  return { sid: S.sid, tool: S.tool.key, cols, values: cols.map(c => row[c] ?? ""), sent: false, saved: now.toISOString() };
}

async function submit() {
  const rec = buildRecord();
  const all = load(STORE, []);
  all.push(rec); save(STORE, all);
  clearDraft();
  render();
  scrollTo(0, 0);
  await syncWaiting();
  if (S.sec >= (S.tool?.sections.length ?? 0)) render();
}

let syncing = false;
async function syncWaiting() {
  if (!SHEET_URL || syncing || !navigator.onLine) return;
  syncing = true;
  try {
    for (const r of load(STORE, []).filter(r => !r.sent)) {
      try {
        await fetch(SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ tool: TOOL_NAME, persona: r.tool, columns: r.cols, values: r.values }) });
      } catch { break; }
      const all = load(STORE, []);
      const x = all.find(y => y.sid === r.sid); if (x) { x.sent = true; save(STORE, all); }
    }
  } finally { syncing = false; }
}

function renderThanks() {
  const rec = load(STORE, []).find(r => r.sid === S.sid);
  app.innerHTML = `
    <div class="card head">
      <h1>${tx(UI.thanksTitle)}</h1>
      <p>${tx(UI.thanksText)} ${rec?.sent ? tx(UI.thanksSent) : SHEET_URL ? tx(UI.thanksQueued) : ""}</p>
      <p class="muted small">${tx(UI.refCode)}: <span class="ref">${esc(S.sid)}</span></p>
      ${S.flag ? supportBox() : ""}
      <div class="nav"><span></span><button class="btn ghost" id="again">${tx(UI.another)}</button></div>
    </div>`;
  $("#again").onclick = () => { const key = S.tool.key; startTool(key); };
}

// ---------------- device admin: ?admin ----------------
function csvOf(recs) {
  if (!recs.length) return "";
  const cols = recs[recs.length - 1].cols;
  const cell = v => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + [cols.map(cell).join(","), ...recs.map(r => cols.map(c => cell(r.values[r.cols.indexOf(c)])).join(","))].join("\n");
}
function renderAdmin() {
  const all = load(STORE, []);
  const rows = Object.values(TOOLS).map(tool => {
    const recs = all.filter(r => r.tool === tool.key);
    return `<tr><td>${esc(tool.title.en)}</td><td>${recs.length}</td><td>${recs.filter(r => r.sent).length}</td><td>${recs.filter(r => !r.sent).length}</td>
      <td><button class="btn ghost" data-csv="${tool.key}" ${recs.length ? "" : "disabled"}>CSV</button></td></tr>`;
  }).join("");
  app.innerHTML = `
    <div class="card head"><h1>Responses on this device</h1>
      <p class="muted small">Google Sheet: ${SHEET_URL ? "connected" : "not set up — responses stay on this device until it is"}</p></div>
    <div class="card"><div style="overflow-x:auto"><table class="admin"><thead><tr><th>Form</th><th>Saved</th><th>Sent</th><th>Waiting</th><th>Download</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="nav"><button class="btn" id="sync" ${SHEET_URL ? "" : "disabled"}>Send waiting now</button><a class="btn ghost" href="./">Open the form</a></div></div>`;
  app.querySelectorAll("[data-csv]").forEach(b => b.onclick = () => {
    const blob = new Blob([csvOf(all.filter(r => r.tool === b.dataset.csv))], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `1MV_${b.dataset.csv}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  });
  $("#sync").onclick = async () => { await syncWaiting(); renderAdmin(); };
}

// ---------------- start ----------------
$("#ver").textContent = "v " + VERSION;
S.lang = params.get("lang") && LANGS.some(l => l.code === params.get("lang")) ? params.get("lang") : "en";
document.documentElement.lang = S.lang;
renderLangs();
const preset = params.get("t");
if (preset && TOOLS[preset] && !params.has("admin")) {
  const d = load(DRAFT, null);
  if (d && d.tool === preset) restore(d); else startTool(preset);
} else render();
syncWaiting();
addEventListener("online", syncWaiting);
