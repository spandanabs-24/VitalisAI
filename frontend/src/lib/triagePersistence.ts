import type { PatientTriageContext, TriageResponse } from "./types";

const TRIAGE_KEY = "VITALIS_LAST_TRIAGE_JSON";
const PATIENT_KEY = "VITALIS_PATIENT_CONTEXT_JSON";

export function saveLastTriage(triage: TriageResponse): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TRIAGE_KEY, JSON.stringify(triage));
  } catch {
    /* ignore quota */
  }
}

export function loadLastTriage(): TriageResponse | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(TRIAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TriageResponse;
  } catch {
    return null;
  }
}

export function savePatientContextSnapshot(ctx: PatientTriageContext): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PATIENT_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function loadPatientContextSnapshot(): PatientTriageContext | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PATIENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PatientTriageContext;
  } catch {
    return null;
  }
}
