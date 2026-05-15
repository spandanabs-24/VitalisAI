"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Copy, FileJson } from "lucide-react";
import { copyEhrJsonToClipboard, downloadEhrJsonBundle } from "@/lib/ehrExport";
import { t, type UILang } from "@/lib/triageLocale";
import { getStoredUILang } from "@/lib/uiLang";

/** Compact EHR / FHIR bundle actions (Patient, Encounter, Observations, DocumentReference). */
export default function EhrSupportCard() {
  const [lang, setLang] = useState<UILang>(() => getStoredUILang());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onLang = (e: Event) => {
      const ce = e as CustomEvent<{ lang?: UILang }>;
      if (ce.detail?.lang === "en" || ce.detail?.lang === "hi" || ce.detail?.lang === "kn") {
        setLang(ce.detail.lang);
      }
    };
    window.addEventListener("v-ui-lang", onLang);
    return () => window.removeEventListener("v-ui-lang", onLang);
  }, []);

  const d = t(lang);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const onCopy = async () => {
    const ok = await copyEhrJsonToClipboard();
    flash(ok ? d.ehrCopied : d.ehrCopyFail);
  };

  return (
    <div className="glass rounded-[40px] p-8 border border-v-blue/25 bg-v-blue/[0.03]">
      <div className="flex items-center gap-3 mb-4">
        <Database className="text-v-blue" size={28} />
        <div>
          <h3 className="text-lg font-black italic uppercase tracking-tight">Electronic Health Record (EHR)</h3>
          <p className="text-[10px] font-mono text-v-muted uppercase tracking-widest">
            FHIR R4–style bundle · demo interoperability
          </p>
        </div>
      </div>
      <p className="text-sm text-v-muted font-light leading-relaxed mb-6 max-w-2xl">
        Export structured JSON for EHR sandboxes or clinician tools: patient context, last triage encounter, risk
        observation, condition narrative, and document reference with triage text — all from this browser session.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => downloadEhrJsonBundle()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-v-blue/30 hover:bg-v-blue/10 text-xs font-mono uppercase tracking-wider"
        >
          <FileJson size={16} />
          {d.ehrDownload}
        </button>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 hover:border-v-cyan/30 text-xs font-mono uppercase tracking-wider text-v-muted"
        >
          <Copy size={16} />
          {d.ehrCopy}
        </button>
      </div>
      {toast && <p className="text-[11px] font-mono text-v-emerald mt-4">{toast}</p>}
    </div>
  );
}
