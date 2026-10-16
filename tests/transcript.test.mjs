globalThis.window = {}; Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Android" }, configurable: true });
const { mergeText, collapseRepeats } = await import("../speech.js");
const cum = ["I", "I can", "I can", "I can", "I can", "I can", "I", "I can", "I can", "I can create", "I can", "I can create", "I can create impact", "I can create impact from", "I can create impact from doing", "I can create impact from doing content", "I can create impact from doing content creation"];
const tests = [
  [mergeText(cum), "I can create impact from doing content creation"],
  [mergeText(["I want to be", "a teacher in my village"]), "I want to be a teacher in my village"],
  [mergeText(["I want to be a teacher", "a teacher because I like kids"]), "I want to be a teacher because I like kids"],
  [mergeText(["", "hello"]), "hello"],
  [collapseRepeats("I I can I can I can create I can create impact"), "I can create impact"],
  [mergeText(["मैं शिक्षक", "मैं शिक्षक बनना चाहती हूँ"]), "मैं शिक्षक बनना चाहती हूँ"],
  // The raw screenshot text joined as one string
  [collapseRepeats("I I can I can I can I can I can I I can I can I can create I can I can create"), "I can create"],
];
let f = 0; for (const [got, exp] of tests) if (got !== exp) { f++; console.log("FAIL:", JSON.stringify(got), "expected", JSON.stringify(exp)); }
console.log(tests.length - f, "/", tests.length, "passed");
