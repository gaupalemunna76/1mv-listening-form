globalThis.window = {}; Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Android" }, configurable: true });
const { mergeText, latestGuess, collapseRepeats } = await import("../speech.js");

// Simulate a phone: each onresult event gives a results list; we keep latestGuess of it, and
// the displayed text is mergeText([prior, sessionFinal], true).
function phone(events) { let shown = ""; for (const ev of events) shown = mergeText(["", latestGuess(ev)], true); return shown; }

const tests = [
  // 1. classic cumulative list in ONE event (the screenshot)
  [phone([["I", "I can", "I can", "I can create", "I can create impact", "I can create impact from", "I can create impact from doing content creation"]]), "I can create impact from doing content creation"],
  // 2. cumulative with a correction in the middle
  [phone([["I can create impact from"], ["I can create impact from", "I can create impact for doing"], ["I can create impact for doing content creation"]]), "I can create impact for doing content creation"],
  // 3. single result updated across events
  [phone([["I"], ["I want"], ["I want to be"], ["I want to be a nurse"]]), "I want to be a nurse"],
  // 4. Hindi cumulative
  [phone([["मैं", "मैं शिक्षक", "मैं शिक्षक बनना चाहती हूँ"]]), "मैं शिक्षक बनना चाहती हूँ"],
  // 5. piecewise (not cumulative) still joins
  [latestGuess(["I want to be", "a teacher in my village"]), "I want to be a teacher in my village"],
  // 6. mergeText cumulative: corrected tail
  [mergeText(["I can create impact from", "create impact for doing"], true), "I can create impact for doing"],
  // 7. desktop (non-cumulative) keeps both sentences that start alike
  [mergeText(["I want to be a teacher.", "I want to help kids"], false), "I want to be a teacher. I want to help kids"],
  // 8. the literal screenshot text as one string
  [collapseRepeats("I I can I can I can I can I can I I can I can I can create I can I can create"), "I can create"],
  // 9. contractions survive
  [phone([["I don't", "I don't know yet"]]), "I don't know yet"],
];
let f = 0; for (const [got, exp] of tests) if (got !== exp) { f++; console.log("FAIL:", JSON.stringify(got), "expected", JSON.stringify(exp)); }
console.log(tests.length - f, "/", tests.length, "passed");
