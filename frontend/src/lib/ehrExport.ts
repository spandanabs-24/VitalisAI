import { loadLastTriage, loadPatientContextSnapshot } from "./triagePersistence";

function base64Utf8(s: string): string {
  try {
    if (typeof window === "undefined") return "";
    return window.btoa(unescape(encodeURIComponent(s)));
  } catch {
    return "";
  }
}

/** Minimal FHIR R4–style bundle for interoperability demos (EHR export). */
export function buildFhirishBundle(): {
  resourceType: string;
  type: string;
  timestamp: string;
  entry: Record<string, unknown>[];
} {
  const triage = loadLastTriage();
  const ctx = loadPatientContextSnapshot();
  const pid = "patient-vitalis-demo-1";
  const entries: Record<string, unknown>[] = [];

  entries.push({
    fullUrl: `urn:uuid:${pid}`,
    resource: {
      resourceType: "Patient",
      id: pid,
      text: { status: "generated", div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">VITALIS demo patient</div>" },
      extension: ctx?.age_band
        ? [{ url: "http://hl7.org/fhir/StructureDefinition/patient-ageBand", valueString: ctx.age_band }]
        : [],
      communication: ctx?.language
        ? [{ language: { text: ctx.language }, preferred: true }]
        : [],
      note: ctx
        ? [{ text: `Chronic: ${ctx.chronic_conditions || "—"}. Allergies: ${ctx.allergies || "—"}. Meds: ${ctx.medications || "—"}` }]
        : [],
    },
  });

  if (triage) {
    const encId = "encounter-triage-demo";
    entries.push({
      fullUrl: `urn:uuid:${encId}`,
      resource: {
        resourceType: "Encounter",
        id: encId,
        status: "finished",
        class: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "VR",
          display: "virtual",
        },
        subject: { reference: `Patient/${pid}` },
        period: { start: triage.timestamp, end: new Date().toISOString() },
        reasonCode: [{ text: triage.nlp_entities_summary || "AI triage session" }],
      },
    });

    entries.push({
      fullUrl: `urn:uuid:observation-risk`,
      resource: {
        resourceType: "Observation",
        status: "final",
        code: { text: "Triage risk score (0-100)" },
        subject: { reference: `Patient/${pid}` },
        encounter: { reference: `Encounter/${encId}` },
        effectiveDateTime: triage.timestamp,
        valueInteger: triage.risk_score,
      },
    });

    entries.push({
      fullUrl: `urn:uuid:condition-triage`,
      resource: {
        resourceType: "Condition",
        clinicalStatus: { coding: [{ code: "active" }] },
        verificationStatus: { coding: [{ code: "unconfirmed" }] },
        subject: { reference: `Patient/${pid}` },
        encounter: { reference: `Encounter/${encId}` },
        code: { text: triage.nlp_entities_summary || "Symptom narrative from triage" },
        note: [{ text: triage.ai_message }],
      },
    });

    const docNarrative = `${triage.ai_message}\n\n${triage.follow_up_question || ""}`.slice(0, 12000);
    const b64 = base64Utf8(docNarrative);
    entries.push({
      fullUrl: `urn:uuid:documentreference-triage`,
      resource: {
        resourceType: "DocumentReference",
        status: "current",
        type: { text: "AI triage narrative" },
        category: [{ coding: [{ code: "clinical-note", display: "Clinical Note" }] }],
        subject: { reference: `Patient/${pid}` },
        context: { encounter: [{ reference: `Encounter/${encId}` }] },
        date: triage.timestamp,
        description: triage.care_recommendation_title,
        content: [
          {
            attachment: {
              contentType: "text/plain; charset=utf-8",
              title: "vitalis-triage-narrative.txt",
              ...(b64 ? { data: b64 } : {}),
            },
          },
        ],
      },
    });
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

export function downloadEhrJsonBundle(): void {
  const bundle = buildFhirishBundle();
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/fhir+json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vitalis-fhir-bundle-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyEhrJsonToClipboard(): Promise<boolean> {
  try {
    const json = JSON.stringify(buildFhirishBundle(), null, 2);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}
