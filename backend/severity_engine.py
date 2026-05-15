"""
VITALIS scalable severity / emergency classification (mirrors frontend severityEngine.ts).
Add symptoms by appending to SYMPTOM_RULE_GROUPS.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal, Optional

RuleSeverity = Literal["critical", "high", "moderate"]
SeverityBand = Literal["low", "moderate", "high", "critical"]
CareLevel = Literal["home_care", "clinic_visit", "emergency_room"]

SEVERITY_RANK: dict[str, int] = {"low": 0, "moderate": 1, "high": 2, "critical": 3}
CARE_RANK: dict[str, int] = {"home_care": 0, "clinic_visit": 1, "emergency_room": 2}


@dataclass(frozen=True)
class SymptomRuleGroup:
    id: str
    severity: RuleSeverity
    care_level: CareLevel
    patterns: tuple[str, ...]
    red_flag: str
    risk_base: int
    emergency: bool = False
    hospital: bool = False


SYMPTOM_RULE_GROUPS: tuple[SymptomRuleGroup, ...] = (
    SymptomRuleGroup(
        "cardiac_acute", "critical", "emergency_room",
        (r"chest\s+pain", r"heart\s+attack", r"crushing\s+chest", r"pain\s+(in|across)\s+(my\s+)?chest",
         r"(cardiac|heart)\s+(arrest|emergency)"),
        "Acute cardiac symptoms — call emergency services if happening now", 96, True, True,
    ),
    SymptomRuleGroup(
        "stroke_acute", "critical", "emergency_room",
        (r"\bstroke\b", r"face\s+drooping", r"slurred\s+speech", r"one\s+side\s+(weak|numb|paraly)",
         r"sudden\s+(weakness|numbness|confusion|vision)", r"can'?t\s+(lift|move)\s+(arm|leg)"),
        "Possible stroke — time-critical; seek emergency care immediately", 95, True, True,
    ),
    SymptomRuleGroup(
        "respiratory_failure", "critical", "emergency_room",
        (r"can'?t\s+breathe", r"cannot\s+breathe", r"(struggling|difficult|labored|severe)\s+(to\s+)?breathe",
         r"breathing\s+(difficult|difficulty|trouble|problems?)", r"short(ness)?\s+of\s+breath", r"\b(sob|dyspnea)\b",
         r"gasp(ing|s)\s+for\s+air", r"chok(ing|ed)", r"not\s+getting\s+enough\s+air", r"respiratory\s+(distress|failure|arrest)"),
        "Severe breathing difficulty — emergency evaluation needed", 94, True, True,
    ),
    SymptomRuleGroup(
        "hypoxia", "critical", "emergency_room",
        (r"oxygen\s+(drop|low|saturation|level)", r"(spo2|o2)\s*(below|under|<)\s*\d{2}",
         r"cyanosis", r"(blue|grey|gray)\s+lips", r"lips?\s+(turning\s+)?blue", r"not\s+enough\s+oxygen"),
        "Low oxygen / cyanosis — seek emergency care now", 93, True, True,
    ),
    SymptomRuleGroup(
        "asthma_attack", "critical", "emergency_room",
        (r"asthma\s+attack", r"severe\s+asthma", r"inhaler\s+(not\s+)?helping"),
        "Acute asthma attack — use rescue inhaler if prescribed; call emergency if not improving", 92, True, True,
    ),
    SymptomRuleGroup(
        "altered_consciousness", "critical", "emergency_room",
        (r"unconscious", r"unresponsive", r"passed\s+out", r"not\s+waking\s+up", r"loss\s+of\s+consciousness",
         r"altered\s+(mental\s+)?status"),
        "Altered consciousness — treat as emergency", 94, True, True,
    ),
    SymptomRuleGroup(
        "seizure_acute", "critical", "emergency_room",
        (r"\bseizure\b", r"convuls(ion|ing)", r"fitting", r"epileptic\s+(status|emergency)"),
        "Seizure activity — seek emergency care if ongoing or first-time", 91, True, True,
    ),
    SymptomRuleGroup(
        "paralysis_acute", "critical", "emergency_room",
        (r"paralys(is|ed)", r"paralyz(ed|is)", r"can'?t\s+move\s+(my\s+)?(leg|arm|side|body)",
         r"sudden\s+paralysis", r"loss\s+of\s+(motor|movement)"),
        "Acute paralysis or sudden inability to move — emergency evaluation", 93, True, True,
    ),
    SymptomRuleGroup(
        "diabetic_emergency", "critical", "emergency_room",
        (r"diabetic\s+(emergency|ketoacidosis|coma)", r"\b(dka|hhs)\b",
         r"(blood\s+sugar|glucose)\s*(very\s+)?(high|over)\s*\d{3}", r"high\s+blood\s+sugar\s+(emergency|crisis)",
         r"fruity\s+breath", r"severe\s+hypoglyc"),
        "Possible diabetic emergency — urgent medical care needed", 90, True, True,
    ),
    SymptomRuleGroup(
        "anaphylaxis", "critical", "emergency_room",
        (r"anaphylaxis", r"severe\s+allergic\s+reaction", r"(throat|tongue)\s+swelling", r"can'?t\s+swallow"),
        "Severe allergic reaction — use epinephrine if prescribed; call emergency", 94, True, True,
    ),
    SymptomRuleGroup(
        "hemorrhage", "critical", "emergency_room",
        (r"severe\s+bleeding", r"heavy\s+bleeding", r"uncontrolled\s+bleeding",
         r"bleeding\s+(won'?t|doesn'?t)\s+stop", r"hemorrhag"),
        "Heavy or uncontrolled bleeding — emergency care", 93, True, True,
    ),
    SymptomRuleGroup(
        "self_harm", "critical", "emergency_room",
        (r"suicid", r"kill\s+myself", r"want\s+to\s+die", r"end\s+my\s+life", r"self[- ]?harm", r"hurt\s+myself", r"overdose"),
        "Self-harm or suicidal crisis — seek immediate help", 92, True, True,
    ),
    SymptomRuleGroup(
        "severe_fever", "high", "emergency_room",
        (r"(severe|very\s+high)\s+fever", r"high\s+fever", r"\b104\b", r"\b40\.?0\s*°?c", r"\b105\s*°?\s*f",
         r"fever.*(rash|stiff\s+neck|confus)"),
        "Very high fever — urgent evaluation recommended", 78, True, True,
    ),
    SymptomRuleGroup(
        "syncope", "high", "emergency_room",
        (r"faint(ed|ing)?", r"syncope", r"collapsed", r"black(ed)?\s+out"),
        "Fainting or collapse — may need emergency assessment", 76, True, True,
    ),
    SymptomRuleGroup(
        "severe_dehydration", "high", "clinic_visit",
        (r"severe\s+dehydrat", r"no\s+urine"),
        "Severe dehydration signs — clinician or ER if worsening", 68, False, True,
    ),
    SymptomRuleGroup(
        "severe_infection", "high", "clinic_visit",
        (r"sepsis", r"severe\s+infection", r"meningitis"),
        "Possible severe infection — urgent medical review", 72, False, True,
    ),
    SymptomRuleGroup(
        "gi_bleed_moderate", "high", "emergency_room",
        (r"vomit(ing)?\s+blood", r"blood\s+in\s+(stool|vomit)", r"black\s+(tarry\s+)?stool", r"melena"),
        "GI bleeding — seek urgent care", 80, True, True,
    ),
    SymptomRuleGroup(
        "hyperglycemia", "high", "clinic_visit",
        (r"(blood\s+sugar|glucose)\s*(high|elevated)", r"hyperglyc", r"diabet.*(thirst|urinat|vomit|weak)"),
        "Elevated blood sugar with concerning symptoms — urgent diabetes care", 70, False, True,
    ),
    SymptomRuleGroup(
        "respiratory_moderate", "high", "clinic_visit",
        (r"wheez(e|ing)", r"(asthma|copd)\s+(flare|worse)", r"rapid\s+breathing"),
        "Respiratory symptoms — monitor closely; seek care if worsening", 65, False, True,
    ),
    SymptomRuleGroup(
        "allergic_reaction", "high", "emergency_room",
        (r"allergic\s+reaction", r"food\s+allergy.*(reaction|swell)"),
        "Allergic reaction — watch for breathing or swelling; escalate if worsening", 75, True, True,
    ),
    SymptomRuleGroup(
        "clinic_general", "moderate", "clinic_visit",
        (r"persistent\s+pain", r"worse\s+over\s+(days|weeks)", r"dehydrat", r"\binfection\b", r"\buti\b"),
        "Symptoms may need timely clinician review", 52, False, False,
    ),
)

EMERGENCY_MSG = (
    "Emergency pattern detected. If symptoms are active now, call your local emergency number or go to the nearest hospital."
)


def assess_severity(message: str, chronic: str = "") -> Optional[dict[str, Any]]:
    text = message.strip()
    if not text:
        return None

    matches = [g for g in SYMPTOM_RULE_GROUPS if any(re.search(p, text.lower()) for p in g.patterns)]
    if not matches and not chronic:
        return None

    severity_order = ("critical", "high", "moderate")
    top_rule = "moderate"
    for g in matches:
        if severity_order.index(g.severity) < severity_order.index(top_rule):
            top_rule = g.severity

    top_matches = [g for g in matches if g.severity == top_rule]
    care_level: CareLevel = "home_care"
    is_emergency = False
    hospital = False
    risk_score = 22

    for g in top_matches:
        if CARE_RANK[g.care_level] > CARE_RANK[care_level]:
            care_level = g.care_level
        if g.emergency:
            is_emergency = True
        if g.hospital or g.care_level == "emergency_room":
            hospital = True
        risk_score = max(risk_score, g.risk_base)

    severity: SeverityBand = top_rule  # type: ignore[assignment]
    if severity == "critical":
        care_level = "emergency_room"
        is_emergency = True
        hospital = True
        risk_score = max(risk_score, 88)
    elif severity == "high" and care_level == "home_care":
        care_level = "clinic_visit"
        risk_score = max(risk_score, 62)

    chronic_l = chronic.lower()
    if "diabet" in chronic_l and re.search(r"(sugar|glucose|ketone|thirst|urinat|vomit)", text, re.I):
        if SEVERITY_RANK.get(severity, 0) < SEVERITY_RANK["high"]:
            severity = "high"
            care_level = "clinic_visit"
            hospital = True
            risk_score = max(risk_score, 72)
    if ("heart" in chronic_l or "cardiac" in chronic_l) and re.search(r"(pain|pressure|tight)", text, re.I):
        severity = "critical"
        care_level = "emergency_room"
        is_emergency = True
        hospital = True
        risk_score = max(risk_score, 92)

    match_count = len(matches)
    ai_confidence = min(98, 58 + match_count * 8 + (22 if severity == "critical" else 12 if severity == "high" else 4))
    red_flags = list(dict.fromkeys(g.red_flag for g in matches))
    if is_emergency:
        red_flags.insert(0, EMERGENCY_MSG)

    return {
        "severity": severity,
        "care_level": care_level,
        "risk_score": min(100, risk_score + min(6, max(0, match_count - 1)) * 2),
        "is_emergency": is_emergency,
        "emergency_alert": is_emergency or severity == "critical",
        "hospital_recommended": hospital,
        "ai_confidence": ai_confidence,
        "matched_groups": [g.id for g in matches],
        "red_flags": red_flags,
    }


def enforce_severity_floor(message: str, chronic: str, triage: dict[str, Any]) -> dict[str, Any]:
    assessed = assess_severity(message, chronic)
    if not assessed:
        return triage

    out = dict(triage)
    cur_sev = str(out.get("severity") or "low")
    new_sev = assessed["severity"]
    if SEVERITY_RANK.get(new_sev, 0) > SEVERITY_RANK.get(cur_sev, 0):
        out["severity"] = new_sev

    cur_care = str(out.get("care_level") or "home_care")
    new_care = assessed["care_level"]
    if CARE_RANK.get(new_care, 0) > CARE_RANK.get(cur_care, 0):
        out["care_level"] = new_care
        if new_care == "emergency_room":
            out["care_recommendation_title"] = "Emergency department — immediate in-person evaluation"
        elif new_care == "clinic_visit" and cur_care == "home_care":
            out["care_recommendation_title"] = "Clinic or primary care — schedule evaluation soon"

    out["is_emergency"] = bool(out.get("is_emergency")) or assessed["is_emergency"]
    out["risk_score"] = max(int(out.get("risk_score") or 0), assessed["risk_score"])
    flags = list(out.get("red_flags") or [])
    for f in assessed["red_flags"]:
        if f not in flags:
            flags.insert(0, f)
    out["red_flags"] = flags[:12]
    out["emergency_alert"] = assessed["emergency_alert"] or out["is_emergency"]
    out["hospital_recommended"] = assessed["hospital_recommended"] or out.get("care_level") != "home_care"
    out["ai_confidence"] = assessed["ai_confidence"]
    out["matched_rule_groups"] = assessed["matched_groups"]

    if out["is_emergency"] and not bool(triage.get("is_emergency")):
        out["ai_message"] = f"{EMERGENCY_MSG}\n\n{out.get('ai_message', '')}"

    return out
