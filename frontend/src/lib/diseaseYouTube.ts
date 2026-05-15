/** Normalize disease / condition labels for map lookup (alphanumeric only, lowercased). */
export function normalizeDiseaseKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Env format: `diabetes:VIDEO_ID|asthma:OTHER_ID|heartdisease:THIRD`
 * Keys are matched loosely against user input (substring either way).
 */
export function parseDiseaseVideoMap(): Record<string, string> {
  const raw = process.env.NEXT_PUBLIC_DISEASE_VIDEO_MAP?.trim();
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split("|")) {
    const idx = pair.indexOf(":");
    if (idx === -1) continue;
    const key = normalizeDiseaseKey(pair.slice(0, idx));
    const id = pair.slice(idx + 1).trim();
    if (!key || !/^[a-zA-Z0-9_-]{6,32}$/.test(id)) continue;
    out[key] = id;
  }
  return out;
}

export function findCuratedVideoId(input: string, map: Record<string, string>): string | null {
  const norm = normalizeDiseaseKey(input);
  if (!norm) return null;
  if (map[norm]) return map[norm];
  for (const [k, id] of Object.entries(map)) {
    if (norm.includes(k) || k.includes(norm)) return id;
  }
  return null;
}

/** Opens YouTube search results (no API key; user picks a video). */
export function diseaseYoutubeSearchUrl(input: string): string {
  const q = `${input.trim()} patient education health explained`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/** Latin + common Indic phrases that should not be routed to casual YouTube search. */
const ACUTE_SUBSTRINGS_EN = [
  "heart attack",
  "cardiac arrest",
  "myocardial infarction",
  "stemi",
  "severe chest pain",
  "crushing chest pain",
  "stroke",
  "facial droop",
  "slurred speech sudden",
  "cannot breathe",
  "can't breathe",
  "cant breathe",
  "trouble breathing severe",
  "gasping for air",
  "respiratory distress",
  "anaphylaxis",
  "severe allergic reaction",
  "suicide",
  "kill myself",
  "want to die",
  "self harm",
  "severe bleeding",
  "uncontrolled bleeding",
  "unconscious",
  "unresponsive",
  "not breathing",
  "stopped breathing",
  "overdose",
  "opioid overdose",
  "septic shock",
  "severe sepsis",
  "thunderclap headache",
  "worst headache of my life",
  "ectopic pregnancy",
  "miscarriage heavy bleeding",
  "third trimester bleeding",
  "severe abdominal pain sudden",
  "snake bite",
  "poisoning severe",
  "carbon monoxide",
  "electrical burn severe",
  "drowning",
  "choking cannot",
  "status epilepticus",
  "seizure not stopping",
];

const ACUTE_SUBSTRINGS_HI = [
  "दिल का दौरा",
  "दौरा",
  "साँस नहीं आ",
  "सांस नहीं आ",
  "आत्महत्या",
  "बेहोश",
  "बेसुध",
  "स्ट्रोक",
  "छाती में तेज दर्द",
  "गला घुट",
];

const ACUTE_SUBSTRINGS_KN = [
  "ಹೃದಯಾಘಾತ",
  "ಉಸಿರಾಟ ನಿಲ್ಲ",
  "ಉಸಿರಾಟ ತೊಂದರೆ",
  "ಆತ್ಮಹತ್ಯೆ",
  "ಪ್ರಜ್ಞೆ ಕಳೆದುಕೊಂಡ",
  "ತೀವ್ರ ಎದೆ ನೋವು",
  "ಸ್ಟ್ರೋಕ್",
];

/**
 * True when the user query suggests an acute / severe presentation that must not
 * be treated as “browse YouTube for education” — triggers emergency UI instead.
 */
export function detectAcuteSeriousCondition(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 3) return false;
  const lower = s.toLowerCase().replace(/\s+/g, " ");
  for (const phrase of ACUTE_SUBSTRINGS_EN) {
    if (lower.includes(phrase)) return true;
  }
  const collapsed = s.replace(/\s+/g, " ");
  for (const phrase of ACUTE_SUBSTRINGS_HI) {
    if (collapsed.includes(phrase)) return true;
  }
  for (const phrase of ACUTE_SUBSTRINGS_KN) {
    if (collapsed.includes(phrase)) return true;
  }
  return false;
}
