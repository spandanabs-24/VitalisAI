/**
 * VITALIS scalable severity / emergency classification.
 * Keyword groups are evaluated highest-severity-first; add new symptoms by extending SYMPTOM_RULE_GROUPS.
 */

import type { CareLevel, PatientTriageContext, SeverityBand, TriageResponse } from "./types";

export type RuleSeverity = "critical" | "high" | "moderate";

export interface SymptomRuleGroup {
  id: string;
  severity: RuleSeverity;
  /** Minimum care level when this group matches */
  careLevel: CareLevel;
  patterns: RegExp[];
  redFlag: string;
  /** Forces is_emergency + emergency UI when true */
  emergency?: boolean;
  /** Suggests hospital / ER pathway in messaging */
  hospital?: boolean;
  riskBase: number;
}

/** Order: first match tier wins within same severity; critical groups are scanned before high. */
export const SYMPTOM_RULE_GROUPS: SymptomRuleGroup[] = [
  // —— CRITICAL / life-threatening ——
  {
    id: "cardiac_acute",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 96,
    redFlag: "Acute cardiac symptoms — call emergency services if happening now",
    patterns: [
      /\bchest\s+pain\b/i,
      /\bheart\s+attack\b/i,
      /\bcrushing\s+chest\b/i,
      /\bpain\s+(in|across)\s+(my\s+)?chest\b/i,
      /\b(cardiac|heart)\s+(arrest|emergency)\b/i,
    ],
  },
  {
    id: "stroke_acute",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 95,
    redFlag: "Possible stroke — time-critical; seek emergency care immediately",
    patterns: [
      /\bstroke\b/i,
      /\bface\s+drooping\b/i,
      /\bslurred\s+speech\b/i,
      /\bone\s+side\s+(weak|numb|paraly)/i,
      /\bsudden\s+(weakness|numbness|confusion|vision)\b/i,
      /\bfast\s+test\b/i,
      /\bcan'?t\s+(lift|move)\s+(arm|leg)\b/i,
    ],
  },
  {
    id: "respiratory_failure",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 94,
    redFlag: "Severe breathing difficulty — emergency evaluation needed",
    patterns: [
      /\b(can'?t|cannot)\s+breathe\b/i,
      /\b(struggling|difficult|labored|severe)\s+(to\s+)?breathe\b/i,
      /\bbreathing\s+(difficult|difficulty|trouble|problems?)\b/i,
      /\bshort(ness)?\s+of\s+breath\b/i,
      /\b(sob|dyspnea)\b/i,
      /\bgasp(ing|s)\s+for\s+air\b/i,
      /\bchok(ing|ed)\b/i,
      /\bnot\s+getting\s+enough\s+air\b/i,
      /\brespiratory\s+(distress|failure|arrest)\b/i,
    ],
  },
  {
    id: "hypoxia",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 93,
    redFlag: "Low oxygen / cyanosis — seek emergency care now",
    patterns: [
      /\boxygen\s+(drop|low|saturation|level)\b/i,
      /\b(spo2|o2)\s*(below|under|<)\s*\d{2}\b/i,
      /\bcyanosis\b/i,
      /\b(blue|grey|gray)\s+lips\b/i,
      /\blips?\s+(turning\s+)?blue\b/i,
      /\bnot\s+enough\s+oxygen\b/i,
    ],
  },
  {
    id: "asthma_attack",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 92,
    redFlag: "Acute asthma attack — use rescue inhaler if prescribed; call emergency if not improving",
    patterns: [
      /\basthma\s+attack\b/i,
      /\bsevere\s+asthma\b/i,
      /\binhaler\s+(not\s+)?helping\b/i,
      /\bwheez(e|ing).*\b(severe|worse|can'?t)\b/i,
    ],
  },
  {
    id: "altered_consciousness",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 94,
    redFlag: "Altered consciousness — treat as emergency",
    patterns: [
      /\bunconscious\b/i,
      /\bunresponsive\b/i,
      /\bpassed\s+out\b/i,
      /\bnot\s+waking\s+up\b/i,
      /\bloss\s+of\s+consciousness\b/i,
      /\baltered\s+(mental\s+)?status\b/i,
      /\bconfus(ed|ion).*\b(sudden|severe)\b/i,
    ],
  },
  {
    id: "seizure_acute",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 91,
    redFlag: "Seizure activity — seek emergency care if ongoing or first-time",
    patterns: [
      /\bseizure\b/i,
      /\bconvuls(ion|ing)\b/i,
      /\bfitting\b/i,
      /\bepileptic\s+(status|emergency)\b/i,
    ],
  },
  {
    id: "paralysis_acute",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 93,
    redFlag: "Acute paralysis or sudden inability to move — emergency evaluation",
    patterns: [
      /\bparalys(is|ed)\b/i,
      /\bparalyz(ed|is)\b/i,
      /\bcan'?t\s+move\s+(my\s+)?(leg|arm|side|body)\b/i,
      /\bsudden\s+paralysis\b/i,
      /\bloss\s+of\s+(motor|movement)\b/i,
    ],
  },
  {
    id: "diabetic_emergency",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 90,
    redFlag: "Possible diabetic emergency — urgent medical care needed",
    patterns: [
      /\bdiabetic\s+(emergency|ketoacidosis|coma)\b/i,
      /\b(dka|hhs)\b/i,
      /\b(blood\s+sugar|glucose)\s*(very\s+)?(high|over)\s*\d{3}\b/i,
      /\bhigh\s+blood\s+sugar\s+(emergency|crisis)\b/i,
      /\bketones?\b.*\b(vomit|confus|breath)\b/i,
      /\bfruity\s+breath\b/i,
      /\bsevere\s+hypoglyc/i,
      /\blow\s+blood\s+sugar.*\b(unconscious|confus|seizure)\b/i,
    ],
  },
  {
    id: "anaphylaxis",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 94,
    redFlag: "Severe allergic reaction — use epinephrine if prescribed; call emergency",
    patterns: [
      /\banaphylaxis\b/i,
      /\bsevere\s+allergic\s+reaction\b/i,
      /\b(throat|tongue)\s+swelling\b/i,
      /\bcan'?t\s+swallow\b/i,
      /\bhives?\b.*\b(breath|swell)\b/i,
    ],
  },
  {
    id: "hemorrhage",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 93,
    redFlag: "Heavy or uncontrolled bleeding — emergency care",
    patterns: [
      /\bsevere\s+bleeding\b/i,
      /\bheavy\s+bleeding\b/i,
      /\buncontrolled\s+bleeding\b/i,
      /\bbleeding\s+(won'?t|doesn'?t)\s+stop\b/i,
      /\bspurt(ing)?\s+blood\b/i,
      /\bhemorrhag/i,
    ],
  },
  {
    id: "self_harm",
    severity: "critical",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 92,
    redFlag: "Self-harm or suicidal crisis — seek immediate help",
    patterns: [
      /\bsuicid/i,
      /\bkill\s+myself\b/i,
      /\bwant\s+to\s+die\b/i,
      /\bend\s+my\s+life\b/i,
      /\bself[- ]?harm\b/i,
      /\bhurt\s+myself\b/i,
      /\boverdose\b/i,
    ],
  },

  // —— HIGH acuity (urgent; many warrant ER) ——
  {
    id: "severe_fever",
    severity: "high",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 78,
    redFlag: "Very high fever — urgent evaluation recommended",
    patterns: [
      /\b(severe|very\s+high)\s+fever\b/i,
      /\bhigh\s+fever\b/i,
      /\b104\b|\b40\.?0\s*°?c\b/i,
      /\b105\s*°?\s*f\b/i,
      /\bfever\b.*\b(rash|stiff\s+neck|confus)\b/i,
    ],
  },
  {
    id: "syncope",
    severity: "high",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 76,
    redFlag: "Fainting or collapse — may need emergency assessment",
    patterns: [
      /\bfaint(ed|ing)?\b/i,
      /\bsyncope\b/i,
      /\bcollapsed\b/i,
      /\bblack(ed)?\s+out\b/i,
      /\blightheaded.*\b(fall|collapse)\b/i,
    ],
  },
  {
    id: "severe_dehydration",
    severity: "high",
    careLevel: "clinic_visit",
    hospital: true,
    riskBase: 68,
    redFlag: "Severe dehydration signs — clinician or ER if worsening",
    patterns: [
      /\bsevere\s+dehydrat/i,
      /\bdehydrat.*\b(dizzy|confus|not\s+urin|shock)\b/i,
      /\bno\s+urine\b/i,
      /\bdry\s+mouth\b.*\b(dizzy|weak)\b/i,
    ],
  },
  {
    id: "severe_infection",
    severity: "high",
    careLevel: "clinic_visit",
    hospital: true,
    riskBase: 72,
    redFlag: "Possible severe infection — urgent medical review",
    patterns: [
      /\bsepsis\b/i,
      /\bsevere\s+infection\b/i,
      /\binfection\b.*\b(confus|chills|rash|spread)\b/i,
      /\bcellulitis\b.*\b(spread|fever)\b/i,
      /\bmeningitis\b/i,
    ],
  },
  {
    id: "gi_bleed_moderate",
    severity: "high",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 80,
    redFlag: "GI bleeding — seek urgent care",
    patterns: [
      /\bvomit(ing)?\s+blood\b/i,
      /\bblood\s+in\s+(stool|vomit)\b/i,
      /\bblack\s+(tarry\s+)?stool\b/i,
      /\bmelena\b/i,
    ],
  },
  {
    id: "hyperglycemia",
    severity: "high",
    careLevel: "clinic_visit",
    hospital: true,
    riskBase: 70,
    redFlag: "Elevated blood sugar with concerning symptoms — urgent diabetes care",
    patterns: [
      /\b(blood\s+sugar|glucose)\s*(high|elevated)\b/i,
      /\bhyperglyc/i,
      /\bdiabet.*\b(thirst|urinat|vomit|weak)\b/i,
      /\btype\s*1\b.*\b(sick|vomit|ketone)\b/i,
    ],
  },
  {
    id: "respiratory_moderate",
    severity: "high",
    careLevel: "clinic_visit",
    hospital: true,
    riskBase: 65,
    redFlag: "Respiratory symptoms — monitor closely; seek care if worsening",
    patterns: [
      /\bwheez(e|ing)\b/i,
      /\b(asthma|copd)\s+(flare|worse)\b/i,
      /\brapid\s+breathing\b/i,
      /\btachypnea\b/i,
    ],
  },
  {
    id: "allergic_reaction",
    severity: "high",
    careLevel: "emergency_room",
    emergency: true,
    hospital: true,
    riskBase: 75,
    redFlag: "Allergic reaction — watch for breathing or swelling; escalate if worsening",
    patterns: [
      /\ballergic\s+reaction\b/i,
      /\b(hives|rash)\b.*\b(swelling|itch)\b/i,
      /\bfood\s+allergy\b.*\b(reaction|swell)\b/i,
    ],
  },

  // —— MODERATE (clinic) ——
  {
    id: "clinic_general",
    severity: "moderate",
    careLevel: "clinic_visit",
    riskBase: 52,
    redFlag: "Symptoms may need timely clinician review",
    patterns: [
      /\bpersistent\s+pain\b/i,
      /\bworse\s+over\s+(days|weeks)\b/i,
      /\bdehydrat/i,
      /\binfection\b/i,
      /\buti\b/i,
      /\bpregnant\b.*\bpain\b/i,
    ],
  },
];

const SEVERITY_RANK: Record<SeverityBand, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

const CARE_RANK: Record<CareLevel, number> = {
  home_care: 0,
  clinic_visit: 1,
  emergency_room: 2,
};

export interface SeverityMatch {
  groupId: string;
  severity: RuleSeverity;
  redFlag: string;
  careLevel: CareLevel;
  emergency: boolean;
  hospital: boolean;
  riskBase: number;
}

export interface SeverityAssessment {
  severity: SeverityBand;
  care_level: CareLevel;
  risk_score: number;
  is_emergency: boolean;
  emergency_alert: boolean;
  hospital_recommended: boolean;
  ai_confidence: number;
  matched_groups: string[];
  red_flags: string[];
  emergency_message?: string;
}

function matchGroups(text: string): SeverityMatch[] {
  const hits: SeverityMatch[] = [];
  for (const g of SYMPTOM_RULE_GROUPS) {
    if (g.patterns.some((p) => p.test(text))) {
      hits.push({
        groupId: g.id,
        severity: g.severity,
        redFlag: g.redFlag,
        careLevel: g.careLevel,
        emergency: Boolean(g.emergency),
        hospital: Boolean(g.hospital ?? g.careLevel === "emergency_room"),
        riskBase: g.riskBase,
      });
    }
  }
  return hits;
}

function ruleToBand(s: RuleSeverity): SeverityBand {
  return s;
}

function mergeMatches(matches: SeverityMatch[]): SeverityAssessment | null {
  if (matches.length === 0) return null;

  const severityOrder: RuleSeverity[] = ["critical", "high", "moderate"];
  let topRule: RuleSeverity = "moderate";
  for (const m of matches) {
    if (severityOrder.indexOf(m.severity) < severityOrder.indexOf(topRule)) {
      topRule = m.severity;
    }
  }

  const topMatches = matches.filter((m) => m.severity === topRule);
  let care_level: CareLevel = "home_care";
  let is_emergency = false;
  let hospital_recommended = false;
  let risk_score = 22;

  for (const m of topMatches) {
    if (CARE_RANK[m.careLevel] > CARE_RANK[care_level]) care_level = m.careLevel;
    if (m.emergency) is_emergency = true;
    if (m.hospital) hospital_recommended = true;
    risk_score = Math.max(risk_score, m.riskBase);
  }

  const severity = ruleToBand(topRule);
  if (severity === "critical") {
    care_level = "emergency_room";
    is_emergency = true;
    hospital_recommended = true;
    risk_score = Math.max(risk_score, 88);
  } else if (severity === "high" && care_level === "home_care") {
    care_level = "clinic_visit";
    risk_score = Math.max(risk_score, 62);
  }

  const matchCount = matches.length;
  const ai_confidence = Math.min(
    98,
    Math.round(58 + matchCount * 8 + (severity === "critical" ? 22 : severity === "high" ? 12 : 4))
  );

  return {
    severity,
    care_level,
    risk_score: Math.min(100, risk_score + Math.min(6, matchCount - 1) * 2),
    is_emergency,
    emergency_alert: is_emergency || severity === "critical",
    hospital_recommended,
    ai_confidence,
    matched_groups: [...new Set(matches.map((m) => m.groupId))],
    red_flags: [...new Set(matches.map((m) => m.redFlag))],
    emergency_message:
      is_emergency
        ? "Emergency pattern detected. If symptoms are active now, call your local emergency number or go to the nearest hospital."
        : hospital_recommended
          ? "Urgent care recommended. Consider hospital or emergency department if symptoms worsen."
          : undefined,
  };
}

/** Context-aware boosts (diabetes + sugar keywords, cardiac history + chest, etc.) */
function applyContextModifiers(
  text: string,
  ctx: PatientTriageContext | undefined,
  base: SeverityAssessment | null
): SeverityAssessment | null {
  const lower = text.toLowerCase();
  const chronic = (ctx?.chronic_conditions || "").toLowerCase();
  const extraFlags: string[] = [];
  let assessment = base;

  const ensure = (): SeverityAssessment =>
    assessment ?? {
      severity: "moderate",
      care_level: "clinic_visit",
      risk_score: 48,
      is_emergency: false,
      emergency_alert: false,
      hospital_recommended: false,
      ai_confidence: 55,
      matched_groups: [],
      red_flags: [],
    };

  if (chronic.includes("diabet") && /\b(sugar|glucose|ketone|thirst|urinat|vomit)\b/i.test(lower)) {
    const a = ensure();
    if (SEVERITY_RANK[a.severity] < SEVERITY_RANK.high) {
      a.severity = "high";
      a.care_level = "clinic_visit";
      a.hospital_recommended = true;
      a.risk_score = Math.max(a.risk_score, 72);
    }
    extraFlags.push("Diabetes history with acute metabolic symptoms");
    assessment = a;
  }

  if ((chronic.includes("heart") || chronic.includes("cardiac")) && /\b(pain|pressure|tight)\b/i.test(lower)) {
    const a = ensure();
    a.severity = "critical";
    a.care_level = "emergency_room";
    a.is_emergency = true;
    a.emergency_alert = true;
    a.hospital_recommended = true;
    a.risk_score = Math.max(a.risk_score, 92);
    extraFlags.push("Cardiac history with new chest-related symptoms");
    assessment = a;
  }

  if (assessment && extraFlags.length) {
    assessment.red_flags = [...new Set([...assessment.red_flags, ...extraFlags])];
    assessment.ai_confidence = Math.min(98, assessment.ai_confidence + 5);
  }

  return assessment;
}

export function assessSeverity(
  message: string,
  ctx?: PatientTriageContext
): SeverityAssessment | null {
  const text = message.trim();
  if (!text) return null;
  const matches = matchGroups(text);
  const merged = mergeMatches(matches);
  return applyContextModifiers(text, ctx, merged);
}

function maxSeverity(a: SeverityBand, b: SeverityBand): SeverityBand {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function maxCare(a: CareLevel, b: CareLevel): CareLevel {
  return CARE_RANK[a] >= CARE_RANK[b] ? a : b;
}

/** Upgrade API/Gemini triage when offline rules detect higher acuity (safety net). */
export function enforceSeverityFloor(
  message: string,
  ctx: PatientTriageContext | undefined,
  triage: TriageResponse
): TriageResponse {
  const assessed = assessSeverity(message, ctx);
  if (!assessed) return triage;

  const severity = maxSeverity(triage.severity, assessed.severity);
  const care_level = maxCare(triage.care_level, assessed.care_level);
  const is_emergency = triage.is_emergency || assessed.is_emergency;
  const risk_score = Math.max(triage.risk_score, assessed.risk_score);

  const red_flags = [...new Set([...triage.red_flags, ...assessed.red_flags])];
  if (assessed.emergency_message && is_emergency && !red_flags.includes(assessed.emergency_message)) {
    red_flags.unshift(assessed.emergency_message);
  }

  let care_recommendation_title = triage.care_recommendation_title;
  if (care_level === "emergency_room" && triage.care_level !== "emergency_room") {
    care_recommendation_title = "Emergency department — immediate in-person evaluation";
  } else if (care_level === "clinic_visit" && triage.care_level === "home_care") {
    care_recommendation_title = "Clinic or primary care — schedule evaluation soon";
  }

  let ai_message = triage.ai_message;
  if (
    assessed.emergency_alert &&
    !is_emergency &&
    severity !== triage.severity &&
    assessed.emergency_message
  ) {
    ai_message = `${assessed.emergency_message}\n\n${ai_message}`;
  } else if (is_emergency && !triage.is_emergency && assessed.emergency_message) {
    ai_message = `${assessed.emergency_message}\n\n${ai_message}`;
  }

  return {
    ...triage,
    severity,
    care_level,
    is_emergency,
    risk_score,
    red_flags,
    care_recommendation_title,
    ai_message,
    emergency_alert: assessed.emergency_alert || is_emergency,
    hospital_recommended: assessed.hospital_recommended || care_level !== "home_care",
    ai_confidence: assessed.ai_confidence,
    matched_rule_groups: assessed.matched_groups,
  };
}
