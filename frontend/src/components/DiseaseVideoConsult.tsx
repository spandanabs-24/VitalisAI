"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Stethoscope, ExternalLink, Clapperboard, AlertTriangle } from "lucide-react";
import { t, type UILang } from "@/lib/triageLocale";
import { getStoredUILang } from "@/lib/uiLang";
import {
  diseaseYoutubeSearchUrl,
  findCuratedVideoId,
  parseDiseaseVideoMap,
  detectAcuteSeriousCondition,
} from "@/lib/diseaseYouTube";

type ToastState = { text: string; tone?: "emergency" } | null;

export default function DiseaseVideoConsult() {
  const [lang, setLang] = useState<UILang>(() => getStoredUILang());
  const [disease, setDisease] = useState("");
  const [curatedId, setCuratedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const map = useMemo(() => parseDiseaseVideoMap(), []);

  const acutePreview = useMemo(
    () => disease.trim().length >= 3 && detectAcuteSeriousCondition(disease),
    [disease]
  );

  useEffect(() => {
    if (!disease.trim()) setCuratedId(null);
  }, [disease]);

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

  const flash = useCallback((msg: string, opts?: { durationMs?: number; tone?: "emergency" }) => {
    const duration = opts?.durationMs ?? (opts?.tone === "emergency" ? 9000 : 2200);
    setToast({ text: msg, tone: opts?.tone });
    window.setTimeout(() => setToast(null), duration);
  }, []);

  const openConsultationVideos = () => {
    const q = disease.trim();
    if (!q) {
      flash(d.diseaseYoutubeInputRequired);
      return;
    }
    if (detectAcuteSeriousCondition(q)) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("v-emergency-trigger", { detail: { active: true } }));
        document.getElementById("triage")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setCuratedId(null);
      flash(d.diseaseYoutubeEmergencyRedirect, { tone: "emergency" });
      return;
    }
    const id = findCuratedVideoId(q, map);
    setCuratedId(id);
    window.open(diseaseYoutubeSearchUrl(q), "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`glass rounded-2xl p-6 border border-t-v-cyan/20 ${
        acutePreview ? "border-v-red/40 bg-v-red/[0.06]" : "border-white/10"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
              acutePreview ? "bg-v-red/15 border-v-red/35" : "bg-v-cyan/10 border-v-cyan/20"
            }`}
          >
            {acutePreview ? (
              <AlertTriangle className="text-v-red" size={22} />
            ) : (
              <Stethoscope className="text-v-cyan" size={22} />
            )}
          </div>
          <div>
            <h4 className="text-sm font-black uppercase italic tracking-tight">{d.diseaseYoutubeTitle}</h4>
            <p className="text-[10px] text-v-muted font-light leading-snug max-w-xl">{d.diseaseYoutubeHint}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          type="text"
          value={disease}
          onChange={(e) => setDisease(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openConsultationVideos()}
          placeholder={d.diseaseYoutubePlaceholder}
          className={`flex-1 min-w-0 bg-white/[0.04] border rounded-xl px-4 py-3 text-sm focus:outline-none font-light placeholder:text-v-muted/50 ${
            acutePreview
              ? "border-v-red/50 focus:border-v-red/70"
              : "border-white/10 focus:border-v-cyan/40"
          }`}
        />
        <button
          type="button"
          onClick={openConsultationVideos}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-v-red/90 hover:bg-v-red text-white text-xs font-mono uppercase tracking-wider shrink-0"
        >
          <ExternalLink size={16} />
          {d.diseaseYoutubeButton}
        </button>
      </div>

      {acutePreview && (
        <p className="text-[10px] font-mono text-v-red mt-3 flex items-start gap-2 leading-relaxed">
          <AlertTriangle size={14} />
          {d.diseaseYoutubeAcuteBanner}
        </p>
      )}

      {toast && (
        <p
          className={`text-[11px] mt-3 font-mono leading-relaxed ${
            toast.tone === "emergency" ? "text-v-red" : "text-amber-200"
          }`}
        >
          {toast.text}
        </p>
      )}

      {curatedId && (
        <div className="mt-6 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-v-muted flex items-center gap-2">
            <Clapperboard size={14} className="text-v-cyan" />
            {d.diseaseYoutubeCuratedNote}
          </p>
          <div className="aspect-video w-full max-w-3xl rounded-xl overflow-hidden border border-white/10 bg-black">
            <iframe
              title={d.diseaseYoutubeTitle}
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(curatedId)}?rel=0`}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
