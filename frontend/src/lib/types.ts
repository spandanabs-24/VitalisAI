export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
}

export type CareLevel = "home_care" | "clinic_visit" | "emergency_room";
export type SeverityBand = "low" | "moderate" | "high" | "critical";

/** Optional structured context for multi-turn / history-aware triage */
export interface PatientTriageContext {
  age_band?: "child" | "adult" | "senior";
  chronic_conditions?: string;
  allergies?: string;
  medications?: string;
  language?: "en" | "hi" | "kn";
}

export interface TriageResponse {
  session_id: string;
  ai_message: string;
  follow_up_question: string;
  timestamp: string;
  care_level: CareLevel;
  risk_score: number;
  severity: SeverityBand;
  is_emergency: boolean;
  nlp_symptoms: string[];
  nlp_entities_summary: string;
  red_flags: string[];
  care_recommendation_title: string;
  accessibility_note: string;
  /** 0–100 heuristic confidence from rule engine (offline / safety net) */
  ai_confidence?: number;
  /** Activates critical emergency UI when true */
  emergency_alert?: boolean;
  /** Suggests hospital / ER pathway */
  hospital_recommended?: boolean;
  /** Matched severity rule group ids (debug / analytics) */
  matched_rule_groups?: string[];
}
