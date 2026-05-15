import type { UILang } from "./triageLocale";

export type EmergencyCoords = { lat: number; lng: number; accuracy?: number; updatedAt: number };

/** Short SMS body for 911 / dispatcher with map link (multilingual prefix). */
export function build911SmsBody(c: EmergencyCoords, lang: UILang): string {
  const q = `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(q)}`;
  const acc = Math.round(c.accuracy ?? 0);
  let s: string;
  if (lang === "hi") {
    s = `आपातकाल — VITALIS ऐप स्थिति: ${q} (~${acc}m). नक्शा: ${mapUrl}`;
  } else if (lang === "kn") {
    s = `ತುರ್ತು — VITALIS ಅಪ್ಲಿಕೇಶನ್ ಸ್ಥಾನ: ${q} (~${acc}m). ನಕ್ಷೆ: ${mapUrl}`;
  } else {
    s = `EMERGENCY — VITALIS app location: ${q} (accuracy ~${acc}m). Map: ${mapUrl}`;
  }
  return s.slice(0, 1500);
}

export function coordsClipboardText(c: EmergencyCoords): string {
  return `${c.lat.toFixed(6)}, ${c.lng.toFixed(6)} (±${Math.round(c.accuracy ?? 0)}m) @ ${new Date(c.updatedAt).toISOString()}`;
}
