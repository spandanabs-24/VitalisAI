import { getAllReports } from "./biometrics";
import { loadLastTriage, loadPatientContextSnapshot } from "./triagePersistence";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Full Markdown report (triage + profile + vitals). */
export async function buildHealthReportMarkdown(): Promise<string> {
  const triage = loadLastTriage();
  const patient = loadPatientContextSnapshot();
  const reports = await getAllReports().catch(() => []);

  const now = new Date().toISOString();
  let md = `# VITALIS — AI Health & Triage Report\n\n`;
  md += `**Generated (UTC):** ${now}\n\n`;
  md += `> Educational / demo output. Not a medical device record. Not for legal clinical use without review.\n\n`;

  md += `## Patient context (self-reported)\n`;
  if (patient) {
    md += `- Age band: ${patient.age_band || "—"}\n`;
    md += `- Chronic conditions: ${patient.chronic_conditions || "—"}\n`;
    md += `- Allergies: ${patient.allergies || "—"}\n`;
    md += `- Medications: ${patient.medications || "—"}\n`;
    md += `- Preferred language: ${patient.language || "en"}\n\n`;
  } else {
    md += `_No saved patient profile in this browser._\n\n`;
  }

  md += `## Latest AI triage summary\n`;
  if (triage) {
    md += `- **Care level:** ${triage.care_level}\n`;
    md += `- **Risk score:** ${triage.risk_score}/100\n`;
    md += `- **Severity:** ${triage.severity}\n`;
    md += `- **Emergency flag:** ${triage.is_emergency}\n`;
    md += `- **Recommendation:** ${triage.care_recommendation_title}\n`;
    md += `- **NLP summary:** ${triage.nlp_entities_summary}\n`;
    md += `- **Symptom tokens:** ${triage.nlp_symptoms.join(", ") || "—"}\n`;
    if (triage.red_flags?.length) md += `- **Red flags:** ${triage.red_flags.join("; ")}\n`;
    md += `\n### Clinical narrative\n${triage.ai_message}\n\n### Follow-up questions\n${triage.follow_up_question}\n\n`;
    md += `### Accessibility / rural deployment note\n${triage.accessibility_note}\n\n`;
  } else {
    md += `_No triage session stored yet — use the triage assistant first._\n\n`;
  }

  md += `## Biometric scan archive (device-local)\n`;
  if (reports.length === 0) {
    md += `_No archived scans in this browser._\n`;
  } else {
    reports.slice(0, 8).forEach((r, i) => {
      md += `### Scan ${i + 1} — ${r.date}\n`;
      md += `- Avg BPM: ${r.avgHeartRate} · HRV: ${r.hrvScore} · Readiness: ${r.readinessScore}\n`;
      md += `- Duration (s): ${r.duration}\n\n`;
    });
    if (reports.length > 8) md += `_…and ${reports.length - 8} more in local storage._\n`;
  }

  md += `\n---\n*End of report — VITALIS AI Triage Assistant*\n`;
  return md;
}

export async function downloadAiHealthReportMarkdown(): Promise<void> {
  const md = await buildHealthReportMarkdown();
  download(`vitalis-health-report-${Date.now()}.md`, md, "text/markdown;charset=utf-8");
}
