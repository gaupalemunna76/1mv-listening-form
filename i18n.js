// Languages and screen text. To add a language: add it to LANGS, then add its code to every
// entry in UI below and in questions.js. Missing text falls back to English.
export const LANGS = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी" },
];

export const UI = {
  appName: { en: "1 Million Voices", hi: "10 लाख आवाज़ें" },
  chooseTitle: { en: "Share your voice", hi: "अपनी बात रखिए" },
  chooseLead: { en: "Choose the form that fits you.", hi: "वह फ़ॉर्म चुनिए जो आप पर लागू होता है।" },
  pickYouth: { en: "I am 12–25 years old", hi: "मेरी उम्र 12–25 साल है" },
  pickParent: { en: "I am a parent or guardian of a school-going child", hi: "मैं स्कूल जाने वाले बच्चे का माता-पिता या अभिभावक हूँ" },
  pickPublic: { en: "I am anyone else (adult)", hi: "मैं कोई और (वयस्क) हूँ" },
  privacy: { en: "Your answers are anonymous. Please do not write your name, phone number or address anywhere in the form.",
             hi: "आपके जवाब गुमनाम रहेंगे। कृपया फ़ॉर्म में कहीं भी अपना नाम, फ़ोन नंबर या पता न लिखें।" },
  consent: { en: "I agree to share my answers for this study.", hi: "मैं इस अध्ययन के लिए अपने जवाब देने के लिए सहमत हूँ।" },
  start: { en: "Start", hi: "शुरू करें" },
  next: { en: "Next", hi: "आगे" },
  back: { en: "Back", hi: "पीछे" },
  submit: { en: "Submit", hi: "जमा करें" },
  required: { en: "Required", hi: "ज़रूरी" },
  requiredError: { en: "Please answer this question.", hi: "कृपया इस सवाल का जवाब दें।" },
  numberError: { en: "Please enter a number between {min} and {max}.", hi: "कृपया {min} से {max} के बीच कोई संख्या लिखें।" },
  maxError: { en: "Please tick up to {max}.", hi: "कृपया ज़्यादा से ज़्यादा {max} चुनें।" },
  choose: { en: "Choose", hi: "चुनें" },
  other: { en: "Other:", hi: "अन्य:" },
  yourAnswer: { en: "Your answer", hi: "आपका जवाब" },
  sectionOf: { en: "Section {i} of {n}", hi: "भाग {i} / {n}" },
  probeEmpty: { en: "You left this blank. Your answer really helps us.", hi: "आपने यह खाली छोड़ा है। आपका जवाब हमारे लिए बहुत काम का है।" },
  probeShort: { en: "Thank you. Could you tell us a little more?", hi: "धन्यवाद। क्या आप थोड़ा और बता सकते हैं?" },
  probeVague: { en: "Thank you, that's a start. Could you be more specific?", hi: "धन्यवाद, यह अच्छी शुरुआत है। क्या आप थोड़ा और साफ़ बता सकते हैं?" },
  probeUnclear: { en: "We could not understand this answer.", hi: "हम यह जवाब समझ नहीं पाए।" },
  probeSkipNote: { en: "If you prefer not to add more, press Next again.", hi: "अगर आप और नहीं लिखना चाहते, तो फिर से \"आगे\" दबाएँ।" },
  moreHere: { en: "Write a bit more here", hi: "यहाँ थोड़ा और लिखें" },
  supportTitle: { en: "If you are going through a hard time", hi: "अगर आप किसी मुश्किल दौर से गुज़र रहे हैं" },
  supportText: { en: "You are not alone. Tele-MANAS is a free, confidential 24×7 helpline from the Government of India. Call 14416 or 1-800-891-4416.",
                 hi: "आप अकेले नहीं हैं। टेली-मानस भारत सरकार की मुफ़्त और गोपनीय 24×7 हेल्पलाइन है। 14416 या 1-800-891-4416 पर कॉल करें।" },
  thanksTitle: { en: "Thank you for sharing your voice!", hi: "अपनी बात रखने के लिए धन्यवाद!" },
  thanksText: { en: "Your answers have been saved.", hi: "आपके जवाब सेव हो गए हैं।" },
  thanksSent: { en: "They have been sent.", hi: "जवाब भेज दिए गए हैं।" },
  thanksQueued: { en: "They will be sent automatically when this device is online.", hi: "इंटरनेट मिलते ही जवाब अपने-आप भेज दिए जाएँगे।" },
  refCode: { en: "Reference code", hi: "संदर्भ कोड" },
  another: { en: "Fill another response", hi: "एक और जवाब भरें" },
  resume: { en: "You have an unfinished form on this device.", hi: "इस डिवाइस पर आपका एक अधूरा फ़ॉर्म है।" },
  resumeYes: { en: "Continue it", hi: "उसे पूरा करें" },
  resumeNo: { en: "Start fresh", hi: "नया शुरू करें" },
  hindiDraft: { en: "", hi: "हिंदी अनुवाद अभी समीक्षा में है।" },
};

export function t(entry, lang, vars) {
  if (!entry) return "";
  let s = entry[lang] || entry.en || "";
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
