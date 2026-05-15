/**
 * Offline heuristic triage (NLP-lite + risk scoring) when the API is unavailable.
 * Aligns with care levels: home_care | clinic_visit | emergency_room.
 */

import { assessSeverity } from "./severityEngine";
import type { CareLevel, PatientTriageContext, SeverityBand, TriageResponse } from "./types";

function extractSymptomTokens(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const stop = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "i", "my", "me", "is", "am", "are", "was", "been", "have", "has", "it", "this", "that", "very", "some", "any",
  ]);
  const words = cleaned.split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
  return [...new Set(words)].slice(0, 12);
}

export function runLocalTriage(
  message: string,
  ctx: PatientTriageContext | undefined,
  sessionId: string
): TriageResponse {
  const text = message.trim();
  const lower = text.toLowerCase();
  const nlp_symptoms = extractSymptomTokens(text);
  const red_flags: string[] = [];

  const chronic = (ctx?.chronic_conditions || "").toLowerCase();
  const allergies = (ctx?.allergies || "").toLowerCase();
  if (chronic.includes("heart") || chronic.includes("cardiac")) red_flags.push("Cardiac history reported");
  if (chronic.includes("diabet")) red_flags.push("Diabetes history reported");
  if (allergies.length > 2) red_flags.push("Allergies on file");

  let care_level: CareLevel = "home_care";
  let severity: SeverityBand = "low";
  let risk_score = 22;
  let is_emergency = false;
  let emergency_alert = false;
  let hospital_recommended = false;
  let ai_confidence = 42;
  let matched_rule_groups: string[] = [];

  const assessed = assessSeverity(text, ctx);
  if (assessed) {
    care_level = assessed.care_level;
    severity = assessed.severity;
    risk_score = assessed.risk_score;
    is_emergency = assessed.is_emergency;
    emergency_alert = assessed.emergency_alert;
    hospital_recommended = assessed.hospital_recommended;
    ai_confidence = assessed.ai_confidence;
    matched_rule_groups = assessed.matched_groups;
    red_flags.push(...assessed.red_flags);
    if (assessed.emergency_message) red_flags.unshift(assessed.emergency_message);
  } else if (/\[mental_health_screen\]/i.test(text)) {
    const crisisMatch = /crisis\s*flag:\s*true/i.test(text);
    const m = text.match(/interest=(\d+),\s*mood=(\d+),\s*anxiety=(\d+),\s*worry=(\d+)/i);
    const scores = m ? [1, 2, 3, 4].map((i) => parseInt(m[i]!, 10)) : [0, 0, 0, 0];
    const total = scores.reduce((a, b) => a + b, 0);
    if (crisisMatch) {
      care_level = "emergency_room";
      severity = "critical";
      risk_score = 92;
      is_emergency = true;
      emergency_alert = true;
      hospital_recommended = true;
      ai_confidence = 88;
      red_flags.push("Mental health crisis flag reported — seek immediate professional or emergency support.");
    } else if (total >= 10) {
      care_level = "clinic_visit";
      severity = "high";
      risk_score = 68;
      hospital_recommended = true;
      ai_confidence = 72;
    } else if (total >= 6) {
      care_level = "clinic_visit";
      severity = "moderate";
      risk_score = 54;
      ai_confidence = 62;
    } else {
      risk_score = Math.max(risk_score, 28 + total * 2);
      if (total >= 4) {
        care_level = "clinic_visit";
        severity = "moderate";
        ai_confidence = 55;
      }
    }
  } else if (lower.includes("fever") && lower.includes("days")) {
    care_level = "clinic_visit";
    severity = "moderate";
    risk_score = 58;
    ai_confidence = 58;
  } else if (lower.includes("pain") || lower.includes("hurt") || lower.includes("ache")) {
    care_level = "clinic_visit";
    severity = "moderate";
    risk_score = 48;
    ai_confidence = 52;
  } else if (lower.includes("cough") || lower.includes("cold") || lower.includes("mild")) {
    care_level = "home_care";
    severity = "low";
    risk_score = 28;
    ai_confidence = 48;
  }

  if (ctx?.age_band === "senior" && care_level === "home_care" && risk_score < 40) {
    risk_score = Math.min(55, risk_score + 12);
  }

  const lang = ctx?.language || "en";

  const L = {
    en: {
      erFlag: "High-acuity language pattern — seek emergency care if symptoms are current",
      titleEr: "Emergency department — immediate in-person evaluation",
      titleClinic: "Clinic or primary care — schedule evaluation",
      titleHome: "Home care — self-management & monitoring",
      titleHospital: "Urgent hospital evaluation recommended",
      aiEr: `Triage (offline engine): Possible emergency pattern from your description. {title}. This is not a diagnosis—if you are in danger, call your local emergency number now.`,
      aiClinic: `Triage (offline engine): Your symptoms may warrant a clinician visit soon. {title}. Bring a list of medications and when symptoms started.`,
      aiHome: `Triage (offline engine): Pattern suggests self-care with monitoring may be reasonable. {title}. Seek care if symptoms worsen or new red flags appear.`,
      followEr: "Are these symptoms happening right now? If yes, seek emergency care immediately. If not, when did they begin?",
      followOther: "Can you share onset timing, severity 1–10, and any chronic conditions or medications?",
      access:
        "Designed for low-bandwidth and rural use: this offline pass runs entirely in your browser when the cloud triage link is down—connect when possible for fuller NLP analysis.",
      nlpEmpty: "No structured tokens extracted",
    },
    hi: {
      erFlag: "उच्च-गंभीरता भाषा संकेत — यदि लक्षण वर्तमान हैं तो तुरंत आपात देखभाल लें",
      titleEr: "आपात कक्ष — तुरंत व्यक्तिगत मूल्यांकन",
      titleClinic: "क्लिनिक / प्राथमिक देखभाल — जल्द मुलाकात",
      titleHome: "घर पर देखभाल — निगरानी और स्व-प्रबंधन",
      titleHospital: "तुरंत अस्पताल मूल्यांकन की सिफारिश",
      aiEr: `ट्राइज (ऑफ़लाइन इंजन): आपके वर्णन में आपात संभावना। {title}। यह निदान नहीं—खतरे में हों तो तुरंत आपात नंबर डायल करें।`,
      aiClinic: `ट्राइज (ऑफ़लाइन इंजन): लक्षण जल्द चिकित्सक से मिलने योग्य। {title}। दवाओं की सूची और शुरुआत का समय लाएँ।`,
      aiHome: `ट्राइज (ऑफ़लाइन इंजन): स्व-देखभाल और निगरानी उपयुक्त लगती है। {title}। बिगड़ने पर तुरंत सहायता लें।`,
      followEr: "क्या ये लक्षण अभी हैं? हाँ तो तुरंत आपात सेवा। नहीं तो कब शुरू हुए?",
      followOther: "शुरुआत का समय, गंभीरता 1–10, और दीर्घ रोग/दवाएँ बताएँ।",
      access:
        "कम बैंडविड्थ/ग्रामीण उपयोग हेतु: यह पास ब्राउज़र में चलता है जब क्लाउड लिंक न हो—जुड़ने पर पूर्ण NLP मिलेगा।",
      nlpEmpty: "संरचित टोकन नहीं मिले",
    },
    kn: {
      erFlag: "ಉನ್ನತ ತೀವ್ರತೆಯ ಭಾಷಾ ಮಾದರಿ — ಲಕ್ಷಣಗಳಿದ್ದರೆ ತಕ್ಷಣ ತುರ್ತು ಆರೈಕೆ",
      titleEr: "ತುರ್ತು ಕೊಠಡಿ — ತಕ್ಷಣ ವೈಯಕ್ತಿಕ ಮೌಲ್ಯಮಾಪನ",
      titleClinic: "ಕ್ಲಿನಿಕ್ / ಪ್ರಾಥಮಿಕ ಆರೈಕೆ — ಶೀಘ್ರ ಭೇಟಿ",
      titleHome: "ಮನೆ ಆರೈಕೆ — ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ಸ್ವಯಂ ನಿರ್ವಹಣೆ",
      titleHospital: "ತುರ್ತು ಆಸ್ಪತ್ರೆ ಮೌಲ್ಯಮಾಪನ ಶಿಫಾರಸು",
      aiEr: `ಟ್ರೈಜ್ (ಆಫ್‌ಲೈನ್ ಎಂಜಿನ್): ನಿಮ್ಮ ವಿವರಣೆಯಲ್ಲಿ ತುರ್ತು ಸಾಧ್ಯತೆ. {title}. ಇದು ರೋಗನಿರ್ಣಯ ಅಲ್ಲ—ಅಪಾಯದಲ್ಲಿದ್ದರೆ ತಕ್ಷಣ ತುರ್ತು ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ.`,
      aiClinic: `ಟ್ರೈಜ್ (ಆಫ್‌ಲೈನ್ ಎಂಜಿನ್): ಲಕ್ಷಣಗಳು ಶೀಘ್ರ ವೈದ್ಯರ ಭೇಟಿಗೆ ಅರ್ಹ. {title}. ಔಷಧಿ ಪಟ್ಟಿ ಮತ್ತು ಆರಂಭ ಸಮಯ ತನ್ನಿ.`,
      aiHome: `ಟ್ರೈಜ್ (ಆಫ್‌ಲೈನ್ ಎಂಜಿನ್): ಮನೆ ಆರೈಕೆ ಮತ್ತು ಮೇಲ್ವಿಚಾರಣೆ ಸಾಧ್ಯ. {title}. ಹದಗೆಡಿದರೆ ಸಹಾಯ ತೆಗೆದುಕೊಳ್ಳಿ.`,
      followEr: "ಈ ಲಕ್ಷಣಗಳು ಈಗಲೇ ಇವೆಯೇ? ಹೌದಾದರೆ ತುರ್ತು ಸೇವೆ. ಇಲ್ಲದಿದ್ದರೆ ಯಾವಾಗ ಪ್ರಾರಂಭ?",
      followOther: "ಪ್ರಾರಂಭ ಸಮಯ, ತೀವ್ರತೆ 1–10, ದೀರ್ಘಕಾಲಿಕ ಅಸ್ವಸ್ಥತೆ/ಔಷಧಿ ತಿಳಿಸಿ.",
      access:
        "ಕಡಿಮೆ ಬ್ಯಾಂಡ್‌ವಿಡ್ತ್ / ಗ್ರಾಮೀಣ ಬಳಕೆ: ಕ್ಲೌಡ್ ಇಲ್ಲದಿದ್ದಾಗ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಚಲಿಸುತ್ತದೆ—ಸಂಪರ್ಕದಲ್ಲಿ ಪೂರ್ಣ NLP.",
      nlpEmpty: "ವಿನ್ಯಾಸಗೊಳಿಸಿದ ಟೋಕನ್‌ಗಳಿಲ್ಲ",
    },
  };

  const bundle = L[lang === "hi" || lang === "kn" ? lang : "en"];

  if (is_emergency) red_flags.push(bundle.erFlag);

  const careTitle =
    care_level === "emergency_room"
      ? bundle.titleEr
      : hospital_recommended && care_level === "clinic_visit"
        ? bundle.titleHospital
        : care_level === "clinic_visit"
          ? bundle.titleClinic
          : bundle.titleHome;

  const ai_message =
    care_level === "emergency_room"
      ? bundle.aiEr.replace("{title}", careTitle)
      : care_level === "clinic_visit"
        ? bundle.aiClinic.replace("{title}", careTitle)
        : bundle.aiHome.replace("{title}", careTitle);

  const follow = care_level === "emergency_room" ? bundle.followEr : bundle.followOther;

  const accessibility_note = bundle.access;

  const nlp_entities_summary = nlp_symptoms.length
    ? (lang === "hi" ? "टोकन: " : lang === "kn" ? "ಟೋಕನ್‌ಗಳು: " : "Tokens: ") + nlp_symptoms.slice(0, 6).join(", ")
    : bundle.nlpEmpty;

  return {
    session_id: sessionId,
    ai_message,
    follow_up_question: follow,
    timestamp: new Date().toISOString(),
    care_level,
    risk_score,
    severity,
    is_emergency,
    emergency_alert: emergency_alert || is_emergency,
    hospital_recommended,
    ai_confidence,
    matched_rule_groups,
    nlp_symptoms,
    nlp_entities_summary,
    red_flags,
    care_recommendation_title: careTitle,
    accessibility_note,
  };
}
