/**
 * 1MV Listening Form -> Google Sheet receiver.
 * Paste into Extensions -> Apps Script of the Google Sheet that should collect responses, then
 * Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone). Copy the /exec URL into config.js.
 * Each response becomes one row on its form's tab (Youth / Parents / General Public). Sending the same response again updates its row.
 * Locks: responses submitted before LOCK_AFTER are rejected, and a tab's columns never change after it is created.
 */
const TABS = { youth: "Youth", parent: "Parents", public: "General Public" };
const MAX_COLS = 300;
// Lock: responses submitted before this time are rejected (the tabs were created after it).
const LOCK_AFTER = "2026-10-16T18:12:00Z";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.tool !== "1MV Listening Form" || !TABS[data.persona] || !Array.isArray(data.columns) || !Array.isArray(data.values)
        || data.columns.length !== data.values.length || data.columns.length > MAX_COLS
        || data.columns[0] !== "session_id" || !/^LF-\d{8}-[A-Z0-9]{4,10}$/.test(String(data.values[0]))) {
      return text_("rejected");
    }
    const sub = data.columns.indexOf("Submitted at");
    if (sub === -1 || String(data.values[sub]) < LOCK_AFTER) return text_("rejected: before lock");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const name = TABS[data.persona];
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);

    // Header row: received_at + the form's columns. New columns are added at the end, never reordered.
    if (sh.getLastRow() === 0) {
      sh.appendRow(["received_at"].concat(data.columns));
      sh.setFrozenRows(1);
    }
    let headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    // Lock the columns: once a tab exists, a response with any column the tab doesn't have is rejected
    // (no new columns are ever added). To change questions, rename the old tab and let a new one be created.
    const missing = data.columns.filter(c => headers.indexOf(c) === -1);
    if (missing.length) return text_("rejected: columns differ");
    const row = headers.map(h => {
      if (h === "received_at") return new Date();
      const i = data.columns.indexOf(h);
      return i === -1 ? "" : clean_(data.values[i]);
    });

    const idCol = headers.indexOf("session_id") + 1;
    const last = sh.getLastRow();
    let target = -1;
    if (last > 1) {
      const ids = sh.getRange(2, idCol, last - 1, 1).getValues();
      for (let r = 0; r < ids.length; r++) if (ids[r][0] === data.values[0]) { target = r + 2; break; }
    }
    if (target > 0) sh.getRange(target, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
    return text_("ok");
  } catch (err) {
    return text_("error");
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return text_("1MV Listening Form endpoint is running.");
}

// Store everything as plain text so an answer can never run as a spreadsheet formula.
function clean_(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  let s = String(v).slice(0, 5000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function text_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}
