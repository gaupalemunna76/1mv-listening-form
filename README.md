# 1MV Listening Form

A Google-Forms-style web form for the **1 Million Voices** listening tools (Short Answer Focused version, 16 Oct 2026). It works like a Google Form: sections, choice questions, dropdowns and short answers. It adds what Google Forms cannot do:

- **Follow-up questions (probing).** When a short answer is empty, a non-answer ("yes", "ok", "pata nahi"), too short, or only general words ("good", "peaceful", "hard work"), the form asks **one** follow-up under that question. It is asked once only; pressing Next again moves on.
- **If-conditions.** Questions appear only when they apply. For example, the class question shows only for youth in school or college, "What is stopping you?" shows only after "Not yet", and parents who never visited the school get "What makes it hard to visit?" instead of "Why did you visit?".
- **Languages.** English and Hindi, switchable at any point without losing answers. More can be added (see below).
- **Safeguarding.** If an answer suggests self-harm, the form shows the free Tele-MANAS helpline (14416) and flags the response.
- **Works offline.** Answers are saved on the device as people type, so an unfinished form can be resumed. Finished forms are sent to the Google Sheet when the device is online.

- **Optional voice, never on by default:**
  - 🔊 next to every question (and every follow-up) reads it aloud, only when tapped. Uses the browser's built-in voices, which every modern browser has. Hindi needs a Hindi voice on the device; if there is none, the form says so.
  - 🎤 next to every short-answer box turns speech into text in that box. People can talk for as long as they like (up to 3 minutes per tap; tap again to add more) and then edit the text. Uses the browser's free speech recognition: Chrome, Edge, Safari and Android Chrome (needs internet). In Firefox the mic button doesn't show, and people type.
  - Only text is stored, never audio. The `<id>_spoken` column says whether the answer, the follow-up or both were spoken.

## Links
- **Live form:** https://gaupalemunna76.github.io/1mv-listening-form/
- Straight to one form: `?t=youth`, `?t=parent`, `?t=public` (e.g. `…/1mv-listening-form/?t=parent&lang=hi`)
- Track a partner or channel: add `&src=<code>` (saved in the `source` column)
- Responses saved on this device and CSV download: `?admin`

## The three forms
| Form | Sections | Questions (incl. conditional) |
|---|---|---|
| Youth (12–25) | About you · Your future · Learning and support | 9 profile + 11 listening |
| Parents | About you and your child · School and learning · Home and future | 6 profile + 13 listening |
| General public | About you · Young people today | 5 profile + 7 listening |

Questions, examples, follow-ups and conditions are all in `questions.js`. Follow-up rules are in `probe.js`.

## Send responses to a Google Sheet (one-time, about 5 minutes)
1. Create a Google Sheet, for example "1MV Listening Form responses".
2. **Extensions → Apps Script.** Delete what is there, paste all of `google_sheet/Code.gs`, press **Save**.
3. **Deploy → New deployment →** gear icon **→ Web app.** *Execute as:* **Me**. *Who has access:* **Anyone**. **Deploy**, allow access, copy the **Web app URL** (ends in `/exec`).
4. Put the URL in `config.js` (`SHEET_URL = "…/exec"`), run `python set_version.py`, commit and push.

Each form gets its own tab (Youth, Parents, General Public), one row per response. Every short answer has three extra columns: `<id>_probe_reason` (why a follow-up was asked), `<id>_probe_answer` (what they added) and `<id>_spoken` (answer / followup / both, if the mic was used). Answers are stored as plain text, never as formulas.

## Add a language
1. Add it to `LANGS` in `i18n.js`, for example `{ code: "mr", name: "मराठी", speech: "mr-IN" }` (`speech` is the language the 🔊 and 🎤 buttons use).
2. Add the same code next to `en`/`hi` in every entry of `UI` (`i18n.js`), `questions.js` and `states.js`. Anything not translated shows in English.
3. Add common non-answers in that language to `NON_ANSWERS` in `probe.js` (e.g. "हो", "माहीत नाही").

The Hindi text is a working draft. Have a native speaker review it before field use.

## Change and publish
```
node tests/probe.test.mjs                       # follow-up rules (87 checks)
node tests/transcript.test.mjs && node tests/phone_speech.test.mjs   # speech-to-text clean-up (16 checks)
python -m http.server 8790                      # in another window, then:
node tests/e2e_edge.mjs                         # full Youth form in headless Edge (33 checks)
python set_version.py                           # stamp a new version so phones get the new files
git add -A && git commit -m "…" && git push     # GitHub Pages updates in about a minute
```
