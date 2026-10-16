import { TOOLS } from "./questions.js?v=20261016-2113";
import { LANGS, UI, t } from "./i18n.js?v=20261016-2113";
import { assess, isDistress } from "./probe.js?v=20261016-2113";
import { SHEET_URL } from "./config.js?v=20261016-2113";

const VERSION = "20261016-2113";
const DRAFT = "lf.draft.v1";
const STORE = "lf.responses.v1";
const TOOL_NAME = "1MV Listening Form";
const $ = sel => document.querySelector(sel);
const app = $("#app");
const params = new URLSearchParams(location.search);

const S = { lang: "en", tool: null, sec: -1, A: {}, P: {}, flag: false, sid: "", started: "", source: params.get("src") || "" };

// ---------------- storage (wrapped: private windows can refuse storage) ----------------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const saveDraft = () => S.tool && save(DRAFT, { tool: S.tool.key, lang: S.lang, sec: S.sec, A: S.A, P: S.P, flag: S.flag, sid: S.sid, started: S.started, source: S.source });
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
  Object.assign(S, { tool: TOOLS[key], sec: -1, A: {}, P: {}, flag: false, sid: newSid(), started: new Date().toISOString() });
  saveDraft(); render(); scrollTo(0, 0);
}
function restore(d) {
  Object.assign(S, { tool: TOOLS[d.tool], sec: d.sec, A: d.A || {}, P: d.P || {}, flag: !!d.flag, sid: d.sid || newSid(), started: d.started || new Date().toISOString(), source: d.source || S.source });
  setLang(d.lang || S.lang);
}

function renderIntro() {
  const tool = S.tool;
  app.innerHTML = `
    <div class="card head">
      <h1>${tx(tool.title)}</h1>
      <p>${tx(tool.intro)}</p>
      <p class="note">${tx(UI.privacy)}</p>
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
  $("#back").onclick = () => { S.sec -= 1; saveDraft(); render(); scrollTo(0, 0); };
  $("#next").onclick = onNext;
}

function itemHTML(q) {
  const v = S.A[q.id];
  const req = q.required ? `<span class="req" aria-label="${tx(UI.required)}">*</span>` : "";
  let body = "";
  if (q.type === "short") body = `<input type="text" id="f_${q.id}" maxlength="600" placeholder="${tx(UI.yourAnswer)}" value="${esc(v)}" autocomplete="off">`;
  else if (q.type === "para") body = `<textarea id="f_${q.id}" maxlength="1500" placeholder="${tx(UI.yourAnswer)}">${esc(v)}</textarea>`;
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
    <label class="q-label" for="f_${q.id}">${tx(q.label)}${req}</label>
    ${q.hint ? `<div class="hint">${tx(q.hint)}</div>` : ""}
    ${body}
    <div class="errmsg" id="e_${q.id}" hidden></div>
    <div class="probe" id="p_${q.id}" ${p ? "" : "hidden"}>${p ? probeInner(q, p) : ""}</div>
  </div>`;
}

function probeInner(q, p) {
  const lead = { empty: UI.probeEmpty, nonanswer: UI.probeShort, short: UI.probeShort, vague: UI.probeVague, unclear: UI.probeUnclear }[p.reason] || UI.probeShort;
  return `<span>${tx(lead)} <b>${tx(q.probe.ask)}</b></span>
    <input type="text" id="pa_${q.id}" maxlength="600" placeholder="${tx(UI.moreHere)}" value="${esc(p.answer)}" autocomplete="off">
    <span class="muted small">${tx(UI.probeSkipNote)}</span>`;
}

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
    box.innerHTML = probeInner(q, S.P[q.id]); box.hidden = false;
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
