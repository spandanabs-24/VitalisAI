import type { PatientTriageContext } from "./types";

const KEY = "VITALIS_UI_LANG";

export type UILang = NonNullable<PatientTriageContext["language"]>;

export function getStoredUILang(): UILang {
  if (typeof window === "undefined") return "en";
  const v = window.localStorage.getItem(KEY);
  if (v === "hi" || v === "kn" || v === "en") return v;
  return "en";
}

export function setStoredUILang(lang: UILang): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, lang);
  window.dispatchEvent(new CustomEvent("v-ui-lang", { detail: { lang } }));
}
