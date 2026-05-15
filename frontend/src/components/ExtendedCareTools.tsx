"use client";

import { useCallback, useEffect, useState } from "react";
import { Video, FileDown, Database, Copy, ExternalLink, X, Layers } from "lucide-react";
import { downloadAiHealthReportMarkdown } from "@/lib/healthReport";
import { copyEhrJsonToClipboard, downloadEhrJsonBundle } from "@/lib/ehrExport";
import { t, type UILang } from "@/lib/triageLocale";
import { getStoredUILang } from "@/lib/uiLang";
import DiseaseVideoConsult from "@/components/DiseaseVideoConsult";

/** Google Meet, Zoom, Teams, etc. send headers that block <iframe>; Jitsi / 8x8 usually work. */
function telehealthEmbedMode(url: string): "iframe" | "blocked" {
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "meet.google.com") return "blocked";
    if (host === "zoom.us" || host.endsWith(".zoom.us")) return "blocked";
    if (host.includes("teams.microsoft.com") || host.includes("teams.live.com")) return "blocked";
    return "iframe";
  } catch {
    return "blocked";
  }
}

export default function ExtendedCareTools() {
  const tele = process.env.NEXT_PUBLIC_TELEHEALTH_URL?.trim();
  const [lang, setLang] = useState<UILang>(() => getStoredUILang());
  const [showEmbed, setShowEmbed] = useState(false);
  const [ehrToast, setEhrToast] = useState<string | null>(null);

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
    setEhrToast(msg);
    window.setTimeout(() => setEhrToast(null), 2200);
  }, []);

  const onCopyEhr = async () => {
    const ok = await copyEhrJsonToClipboard();
    flash(ok ? d.ehrCopied : d.ehrCopyFail);
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col items-center text-center gap-3">
          <Video className="text-v-cyan" size={28} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-v-muted">{d.videoTitle}</span>
          <div className="flex flex-wrap gap-2 justify-center">
            <a
              href={tele || "#telehealth"}
              onClick={(e) => {
                if (!tele) {
                  e.preventDefault();
                  flash(d.videoNoUrl);
                }
              }}
              className="text-[10px] font-mono uppercase tracking-wider px-3 py-2 rounded-lg border border-white/10 hover:border-v-cyan/40 inline-flex items-center gap-1.5 text-v-text"
            >
              <ExternalLink size={14} />
              {d.videoOpenLink}
            </a>
            <button
              type="button"
              disabled={!tele}
              onClick={() => setShowEmbed(true)}
              className="text-[10px] font-mono uppercase tracking-wider px-3 py-2 rounded-lg border border-white/10 hover:border-v-cyan/40 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Layers size={14} />
              {d.videoEmbed}
            </button>
          </div>
          <p className="text-[10px] text-v-muted/80 font-light leading-snug">{d.videoHelp}</p>
          {!tele && <p className="text-[10px] text-amber-200/70 font-light leading-snug px-1">{d.videoEnvHint}</p>}
        </div>

        <button
          type="button"
          onClick={() => void downloadAiHealthReportMarkdown()}
          className="glass rounded-2xl p-6 border border-white/10 hover:border-v-emerald/30 transition-all flex flex-col items-center text-center gap-3"
        >
          <FileDown className="text-v-emerald" size={28} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-v-muted">{d.reportDownload}</span>
          <span className="text-xs font-light text-v-text/80">Markdown · triage + vitals</span>
        </button>

        <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col items-center text-center gap-3">
          <Database className="text-v-blue" size={28} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-v-muted">{d.ehrDownload}</span>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => downloadEhrJsonBundle()}
              className="text-[10px] font-mono uppercase tracking-wider px-3 py-2 rounded-lg border border-white/10 hover:border-v-blue/40"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => void onCopyEhr()}
              className="text-[10px] font-mono uppercase tracking-wider px-3 py-2 rounded-lg border border-white/10 hover:border-v-blue/40 inline-flex items-center gap-1.5"
            >
              <Copy size={14} />
              {d.ehrCopy}
            </button>
          </div>
        </div>
      </div>

      <DiseaseVideoConsult />

      {ehrToast && <p className="text-[11px] font-mono text-v-emerald">{ehrToast}</p>}

      {showEmbed && tele && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass rounded-3xl border border-white/15 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-xs font-mono uppercase tracking-widest text-v-muted">{d.videoTitle}</span>
              <button
                type="button"
                onClick={() => setShowEmbed(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-v-muted"
                aria-label={d.videoClose}
              >
                <X size={20} />
              </button>
            </div>
            {telehealthEmbedMode(tele) === "iframe" ? (
              <iframe
                title={d.videoTitle}
                src={tele}
                className="w-full flex-1 min-h-[420px] bg-black border-0"
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-6 p-10 min-h-[320px] text-center">
                <p className="text-sm text-v-text/90 font-light max-w-md leading-relaxed">{d.videoEmbedBlocked}</p>
                <a
                  href={tele}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-v-cyan text-v-bg text-xs font-mono uppercase tracking-wider hover:opacity-95"
                >
                  <ExternalLink size={16} />
                  {d.videoOpenNewTab}
                </a>
              </div>
            )}
            <p className="text-[10px] text-v-muted px-4 py-2 font-light border-t border-white/5">{d.videoHelp}</p>
          </div>
        </div>
      )}
    </div>
  );
}
