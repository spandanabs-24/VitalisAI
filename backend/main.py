"""
VITALIS AI — FastAPI Backend
Healthcare Triage Assistant — NLP + risk scoring + care levels (demo).
"""

import os
import json
import re
import uuid
from typing import Any, Optional

from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

from whatsapp_consent import router as whatsapp_router
from severity_engine import assess_severity, enforce_severity_floor

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="VITALIS AI CORE — Healthcare Triage")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(whatsapp_router)


class PatientContext(BaseModel):
    age_band: Optional[str] = None  # child | adult | senior
    chronic_conditions: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    language: Optional[str] = "en"  # en | hi | kn


class MessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    patient_context: Optional[PatientContext] = None


def _parse_triage_json(raw: str) -> dict:
    text = raw.strip()
    for fence in ("```json", "```JSON", "```"):
        text = text.replace(fence, "")
    text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("not an object")
    return data


def _extract_tokens(text: str) -> list[str]:
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    stop = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
        "i", "my", "me", "is", "am", "are", "was", "been", "have", "has", "it", "this", "that",
        "very", "some", "any",
    }
    words = [w for w in cleaned.split() if len(w) > 3 and w not in stop]
    out: list[str] = []
    for w in words:
        if w not in out:
            out.append(w)
    return out[:12]


def rule_based_triage(message: str, ctx: Optional[PatientContext], sid: str) -> dict[str, Any]:
    """Heuristic triage when Gemini is offline — mirrors frontend engine for consistency."""
    text = message.strip()
    lower = text.lower()
    nlp_symptoms = _extract_tokens(text)
    red_flags: list[str] = []

    chronic = (ctx.chronic_conditions or "").lower() if ctx else ""
    allergies = (ctx.allergies or "").lower() if ctx else ""
    if "heart" in chronic or "cardiac" in chronic:
        red_flags.append("Cardiac history reported")
    if "diabet" in chronic:
        red_flags.append("Diabetes history reported")
    if len(allergies) > 2:
        red_flags.append("Allergies on file")

    care_level = "home_care"
    severity = "low"
    risk_score = 22
    is_emergency = False
    emergency_alert = False
    hospital_recommended = False
    ai_confidence = 42
    matched_rule_groups: list[str] = []

    assessed = assess_severity(text, chronic)
    if assessed:
        care_level = assessed["care_level"]
        severity = assessed["severity"]
        risk_score = assessed["risk_score"]
        is_emergency = assessed["is_emergency"]
        emergency_alert = assessed["emergency_alert"]
        hospital_recommended = assessed["hospital_recommended"]
        ai_confidence = assessed["ai_confidence"]
        matched_rule_groups = assessed["matched_groups"]
        red_flags.extend(assessed["red_flags"])
        if is_emergency:
            red_flags.append("High-acuity language pattern — seek emergency care if symptoms are current")
    elif "[mental_health_screen]" in lower:
        crisis_match = re.search(r"crisis\s*flag:\s*true", text, re.I)
        m = re.search(
            r"interest=(\d+),\s*mood=(\d+),\s*anxiety=(\d+),\s*worry=(\d+)",
            text,
            re.I,
        )
        scores = [int(m.group(i)) for i in range(1, 5)] if m else [0, 0, 0, 0]
        total = sum(scores)
        if crisis_match:
            care_level = "emergency_room"
            severity = "critical"
            risk_score = 92
            is_emergency = True
            emergency_alert = True
            hospital_recommended = True
            ai_confidence = 88
            red_flags.append(
                "Mental health crisis flag reported — seek immediate professional or emergency support."
            )
        elif total >= 10:
            care_level = "clinic_visit"
            severity = "high"
            risk_score = 68
            hospital_recommended = True
            ai_confidence = 72
        elif total >= 6:
            care_level = "clinic_visit"
            severity = "moderate"
            risk_score = 54
            ai_confidence = 62
        else:
            risk_score = max(risk_score, 28 + total * 2)
            if total >= 4:
                care_level = "clinic_visit"
                severity = "moderate"
                ai_confidence = 55
    elif "fever" in lower and "days" in lower:
        care_level = "clinic_visit"
        severity = "moderate"
        risk_score = 58
        ai_confidence = 58
    elif any(k in lower for k in ("pain", "hurt", "ache")):
        care_level = "clinic_visit"
        severity = "moderate"
        risk_score = 48
    elif any(k in lower for k in ("cough", "cold", "mild")):
        care_level = "home_care"
        severity = "low"
        risk_score = 28

    if ctx and ctx.age_band == "senior" and care_level == "home_care" and risk_score < 40:
        risk_score = min(55, risk_score + 12)

    lang = ctx.language if ctx and ctx.language in ("hi", "kn", "en") else "en"

    LOC = {
        "en": {
            "title_er": "Emergency department — immediate in-person evaluation",
            "title_clinic": "Clinic or primary care — schedule evaluation",
            "title_home": "Home care — self-management & monitoring",
            "ai_er": "Triage (rule engine): Possible emergency pattern from your description. {title}. This is not a diagnosis—if you are in danger, call your local emergency number now.",
            "ai_clinic": "Triage (rule engine): Your symptoms may warrant a clinician visit soon. {title}. Bring a list of medications and when symptoms started.",
            "ai_home": "Triage (rule engine): Pattern suggests self-care with monitoring may be reasonable. {title}. Seek care if symptoms worsen or new red flags appear.",
            "follow_er": "Are these symptoms happening right now? If yes, seek emergency care immediately. If not, when did they begin?",
            "follow_clinic": "Can you share onset timing, severity 1–10, and any new symptoms since yesterday?",
            "follow_home": "What makes symptoms better or worse? Any chronic conditions or daily medications?",
            "note": "Rural / low-connectivity mode: on-server rules without generative AI. Enable GEMINI_API_KEY for deeper NLP.",
            "nlp_empty": "No tokens extracted",
        },
        "hi": {
            "title_er": "आपात कक्ष — तुरंत व्यक्तिगत मूल्यांकन",
            "title_clinic": "क्लिनिक / प्राथमिक देखभाल — जल्द मुलाकात",
            "title_home": "घर पर देखभाल — निगरानी और स्व-प्रबंधन",
            "ai_er": "ट्राइज (नियम इंजन): आपात संभावना। {title}। निदान नहीं—खतरे में तुरंत आपात नंबर।",
            "ai_clinic": "ट्राइज (नियम इंजन): चिकित्सक मुलाकात जल्द उपयुक्त। {title}। दवाएँ और शुरुआत समय लाएँ।",
            "ai_home": "ट्राइज (नियम इंजन): घर पर देखभाल संभव। {title}। बिगड़ने पर सहायता लें।",
            "follow_er": "ये लक्षण अभी हैं? हाँ तो तुरंत आपात। नहीं तो कब शुरू?",
            "follow_clinic": "शुरुआत, गंभीरता 1–10, नए लक्षण बताएँ।",
            "follow_home": "क्या राहत या बिगड़ाव देता है? दीर्घ रोग/दवाएँ?",
            "note": "कम बैंडविड्थ: सर्वर नियम। GEMINI_API_KEY से पूर्ण NLP।",
            "nlp_empty": "टोकन नहीं मिले",
        },
        "kn": {
            "title_er": "ತುರ್ತು ಕೊಠಡಿ — ತಕ್ಷಣ ಮೌಲ್ಯಮಾಪನ",
            "title_clinic": "ಕ್ಲಿನಿಕ್ / ಪ್ರಾಥಮಿಕ ಆರೈಕೆ — ಶೀಘ್ರ ಭೇಟಿ",
            "title_home": "ಮನೆ ಆರೈಕೆ — ಮೇಲ್ವಿಚಾರಣೆ",
            "ai_er": "ಟ್ರೈಜ್ (ನಿಯಮ ಎಂಜಿನ್): ತುರ್ತು ಸಾಧ್ಯತೆ. {title}. ರೋಗನಿರ್ಣಯ ಅಲ್ಲ—ಅಪಾಯದಲ್ಲಿ ಕರೆ.",
            "ai_clinic": "ಟ್ರೈಜ್: ವೈದ್ಯರ ಭೇಟಿ ಶಿಫಾರಸು. {title}. ಔಷಧಿ ಪಟ್ಟಿ ತನ್ನಿ.",
            "ai_home": "ಟ್ರೈಜ್: ಮನೆ ಆರೈಕೆ ಸಾಧ್ಯ. {title}. ಹದಗೆಡಿದರೆ ಸಹಾಯ.",
            "follow_er": "ಈಗಲೇ ಲಕ್ಷಣಗಳೇ? ಹೌದು ತುರ್ತು. ಇಲ್ಲ ಯಾವಾಗ ಪ್ರಾರಂಭ?",
            "follow_clinic": "ಪ್ರಾರಂಭ, ತೀವ್ರತೆ 1–10, ಹೊಸ ಲಕ್ಷಣಗಳು.",
            "follow_home": "ಉತ್ತಮ/ಕೆಟ್ಟದು ಏನು? ದೀರ್ಘಕಾಲಿಕ/ಔಷಧಿ?",
            "note": "ಕಡಿಮೆ ಬ್ಯಾಂಡ್‌ವಿಡ್ತ್: ನಿಯಮಗಳು. GEMINI_API_KEY ಪೂರ್ಣ NLP.",
            "nlp_empty": "ಟೋಕನ್‌ಗಳಿಲ್ಲ",
        },
    }
    L = LOC.get(lang, LOC["en"])

    if care_level == "emergency_room":
        title = L["title_er"]
        ai = L["ai_er"].format(title=title)
        follow = L["follow_er"]
    elif care_level == "clinic_visit":
        title = L["title_clinic"]
        ai = L["ai_clinic"].format(title=title)
        follow = L["follow_clinic"]
    else:
        title = L["title_home"]
        ai = L["ai_home"].format(title=title)
        follow = L["follow_home"]

    note = L["note"]
    nlp_sum = ("Tokens: " + ", ".join(nlp_symptoms[:6])) if nlp_symptoms else L["nlp_empty"]

    return {
        "session_id": sid,
        "ai_message": ai,
        "follow_up_question": follow,
        "timestamp": datetime.utcnow().isoformat(),
        "care_level": care_level,
        "risk_score": risk_score,
        "severity": severity,
        "is_emergency": is_emergency,
        "emergency_alert": emergency_alert or is_emergency,
        "hospital_recommended": hospital_recommended,
        "ai_confidence": ai_confidence,
        "matched_rule_groups": matched_rule_groups,
        "nlp_symptoms": nlp_symptoms,
        "nlp_entities_summary": nlp_sum,
        "red_flags": red_flags,
        "care_recommendation_title": title,
        "accessibility_note": note,
    }


def _build_user_blob(req: MessageRequest) -> str:
    parts = [req.message.strip()]
    ctx = req.patient_context
    if ctx:
        if ctx.age_band:
            parts.append(f"[Age band: {ctx.age_band}]")
        if ctx.chronic_conditions:
            parts.append(f"[Chronic conditions: {ctx.chronic_conditions}]")
        if ctx.allergies:
            parts.append(f"[Allergies: {ctx.allergies}]")
        if ctx.medications:
            parts.append(f"[Medications: {ctx.medications}]")
    return "\n".join(parts)


@app.post("/api/triage")
async def triage(request: MessageRequest):
    sid = request.session_id or str(uuid.uuid4())
    ts = datetime.utcnow().isoformat()

    if not GEMINI_API_KEY:
        out = rule_based_triage(request.message, request.patient_context, sid)
        out["timestamp"] = ts
        return out

    lang = (request.patient_context.language if request.patient_context else None) or "en"
    lang_note = ""
    if lang == "hi":
        lang_note = "Patient prefers Hindi where possible; keep medical terms clear in English when needed."
    elif lang == "kn":
        lang_note = "Patient prefers Kannada where possible; keep medical terms clear in English when needed."

    model = genai.GenerativeModel("gemini-2.0-flash")
    user_blob = _build_user_blob(request)

    prompt = f"""You are VITALIS CORE — an AI healthcare TRIAGE assistant (not a licensed clinician).
Patient input (may include structured history in brackets):
---
{user_blob}
---
{lang_note}

CRITICAL: Write the entire "ai_message" and "follow_up_question" fields in {"Hindi" if lang == "hi" else "Kannada" if lang == "kn" else "clear English"} for the patient. JSON keys stay in English.

Tasks:
1) NLP: infer chief symptoms and salient entities from the text.
2) Severity: assign low | moderate | high | critical based on presentation (conservative bias toward safety).
3) Risk score: integer 0-100 (higher = more urgent).
4) Emergency: is_emergency true if symptoms could be life-threatening imminently.
5) Care level: exactly one of: home_care | clinic_visit | emergency_room
   - home_care: minor / self-limited, clear self-care and monitoring instructions.
   - clinic_visit: moderate / needs clinician within 24-72h unless worsening.
   - emergency_room: high-risk / emergency symptoms — tell user to seek immediate in-person emergency care.
6) Reduce unnecessary ER visits when clearly low risk, but NEVER downplay: chest pain, breathing difficulty or shortness of breath, low oxygen, asthma attack, diabetic emergency, unconsciousness, seizures, paralysis, severe fever, stroke signs, heavy bleeding, anaphylaxis, cyanosis, fainting, or suicidal/self-harm ideation.

Respond with ONLY valid JSON (no markdown fences):
{{
  "ai_message": "Empathetic preliminary guidance (not definitive diagnosis). 3-5 sentences.",
  "follow_up_question": "Two concrete follow-up questions in one string.",
  "care_level": "home_care|clinic_visit|emergency_room",
  "risk_score": 0,
  "severity": "low|moderate|high|critical",
  "is_emergency": false,
  "nlp_symptoms": ["short", "symptom", "chips"],
  "nlp_entities_summary": "One line summarizing NLP understanding",
  "red_flags": ["optional strings"],
  "care_recommendation_title": "Short title for UI",
  "accessibility_note": "One sentence on rural/low-bandwidth use: text-first, when to escalate, telemedicine if available."
}}"""

    try:
        response = model.generate_content(prompt)
        raw_text = (response.text or "").strip()
        if not raw_text:
            raise ValueError("empty model response")
        data = _parse_triage_json(raw_text)
        ai_message = data.get("ai_message")
        if not isinstance(ai_message, str) or not ai_message.strip():
            raise ValueError("missing ai_message")
        follow = data.get("follow_up_question")
        if isinstance(follow, list):
            follow = " ".join(str(x) for x in follow if x)
        if follow is not None and not isinstance(follow, str):
            follow = str(follow)

        def _as_bool(v: Any) -> bool:
            if isinstance(v, bool):
                return v
            if isinstance(v, str):
                return v.strip().lower() in ("true", "1", "yes")
            return False

        def _care(raw: Any) -> str:
            s = str(raw or "").lower().replace(" ", "_")
            if "emergency" in s or s in ("er", "emergency_room"):
                return "emergency_room"
            if "clinic" in s or "urgent" in s or "doctor" in s:
                return "clinic_visit"
            return "home_care"

        def _sev(raw: Any) -> str:
            s = str(raw or "").lower()
            if "critical" in s:
                return "critical"
            if "high" in s:
                return "high"
            if "mod" in s:
                return "moderate"
            return "low"

        def _risk(raw: Any) -> int:
            try:
                v = int(float(raw))
            except (TypeError, ValueError):
                v = 35
            return max(0, min(100, v))

        symptoms = data.get("nlp_symptoms")
        if not isinstance(symptoms, list):
            symptoms = []
        symptoms = [str(x).strip() for x in symptoms if str(x).strip()][:20]

        red = data.get("red_flags")
        if not isinstance(red, list):
            red = []
        red = [str(x).strip() for x in red if str(x).strip()][:10]

        chronic = (request.patient_context.chronic_conditions or "") if request.patient_context else ""
        payload = {
            "session_id": sid,
            "ai_message": ai_message.strip(),
            "follow_up_question": (follow or "").strip(),
            "timestamp": ts,
            "care_level": _care(data.get("care_level")),
            "risk_score": _risk(data.get("risk_score")),
            "severity": _sev(data.get("severity")),
            "is_emergency": _as_bool(data.get("is_emergency")),
            "nlp_symptoms": symptoms,
            "nlp_entities_summary": str(data.get("nlp_entities_summary") or "").strip()
            or "Symptom concepts extracted from free text.",
            "red_flags": red,
            "care_recommendation_title": str(data.get("care_recommendation_title") or "").strip()
            or "Care recommendation",
            "accessibility_note": str(data.get("accessibility_note") or "").strip()
            or "Text-first triage suitable for low-bandwidth settings; seek local care if unsure.",
        }
        return enforce_severity_floor(request.message, chronic, payload)
    except Exception:
        out = rule_based_triage(request.message, request.patient_context, sid)
        out["ai_message"] = (
            "Neural link unstable; applied deterministic triage rules. "
            + out["ai_message"]
        )
        out["timestamp"] = ts
        return out


@app.get("/health")
async def health():
    return {"status": "healthy", "system": "VITALIS_TRIAGE_ACTIVE"}
