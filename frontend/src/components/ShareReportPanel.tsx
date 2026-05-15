"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Smartphone, Copy, Loader2 } from "lucide-react";
import { t, type UILang } from "@/lib/triageLocale";
import { getStoredUILang } from "@/lib/uiLang";
import { loadLastTriage } from "@/lib/triagePersistence";
import {
  buildShareText,
  buildSmsHref,
  formatIndiaDisplayPhone,
  normalizeIndiaMobileDigits,
} from "@/lib/shareReport";
import { fetchWhatsAppConsentStatus, sendWhatsAppConsent } from "@/lib/api";

type WaPhase = "idle" | "sending" | "request_sent" | "waiting" | "success" | "failed";

export default function ShareReportPanel() {
  const [lang, setLang] = useState<UILang>(() => getStoredUILang());
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [waPhase, setWaPhase] = useState<WaPhase>("idle");
  const [waRequestId, setWaRequestId] = useState<string | null>(null);
  const [waTarget, setWaTarget] = useState<string | null>(null);
  const [waDetail, setWaDetail] = useState<string | null>(null);

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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const prepareShare = useCallback(async () => {
    if (!loadLastTriage()) {
      showToast(d.shareNoReport);
      return null;
    }
    setBusy(true);
    try {
      const text = await buildShareText(lang);
      return text;
    } finally {
      setBusy(false);
    }
  }, [d.shareNoReport, lang, showToast]);

  useEffect(() => {
    if (waPhase !== "request_sent") return;
    const tmr = window.setTimeout(() => setWaPhase("waiting"), 900);
    return () => window.clearTimeout(tmr);
  }, [waPhase]);

  useEffect(() => {
    if (waPhase !== "waiting" || !waRequestId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const s = await fetchWhatsAppConsentStatus(waRequestId);
        if (cancelled) return;
        if (s.status === "REPORT_SENT") {
          setWaPhase("success");
          setWaDetail(null);
          return;
        }
        if (s.status === "CONSENTED") {
          setWaPhase("waiting");
          setWaDetail(d.shareWaSendingReport);
          return;
        }
        if (s.status === "FAILED" || s.status === "DECLINED" || s.status === "EXPIRED") {
          setWaPhase("failed");
          setWaDetail(s.error || s.status);
        }
      } catch (e) {
        if (!cancelled) {
          setWaPhase("failed");
          setWaDetail(e instanceof Error ? e.message : "Status poll failed");
        }
      }
    };

    void poll();
    const iv = window.setInterval(() => void poll(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [waPhase, waRequestId, d.shareWaSendingReport]);

  const waFlowBlocksWhatsApp = waPhase === "sending" || waPhase === "request_sent" || waPhase === "waiting";

  const waProgressLine =
    waTarget != null ? d.shareWaInProgress.replace("{phone}", waTarget) : d.shareWaWaiting;

  const onWhatsApp = async () => {
    const msisdn = normalizeIndiaMobileDigits(phone);
    if (!msisdn) {
      showToast(d.shareInvalid);
      return;
    }
    if (!loadLastTriage()) {
      showToast(d.shareNoReport);
      return;
    }

    setWaPhase("sending");
    setWaRequestId(null);
    setWaTarget(formatIndiaDisplayPhone(msisdn));
    setWaDetail(null);
    setBusy(true);
    try {
      const text = await buildShareText(lang);
      const { requestId } = await sendWhatsAppConsent(msisdn, text);
      setWaRequestId(requestId);
      setWaPhase("request_sent");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setWaPhase("failed");
      setWaDetail(msg);
      if (msg.includes("pending consent") || msg.includes("409")) {
        showToast(d.shareWaConflict);
      }
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    const text = await prepareShare();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(d.shareCopied);
    } catch {
      showToast(d.shareCopyFail);
    }
  };

  const smsHref = async (): Promise<string | null> => {
    const msisdn = normalizeIndiaMobileDigits(phone);
    if (!msisdn) {
      showToast(d.shareInvalid);
      return null;
    }
    const text = await prepareShare();
    if (!text) return null;
    return buildSmsHref(msisdn, text);
  };

  const resetWa = () => {
    setWaPhase("idle");
    setWaRequestId(null);
    setWaTarget(null);
    setWaDetail(null);
  };

  return (
    <div className="glass rounded-[32px] p-8 border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-v-cyan/5 blur-3xl rounded-full pointer-events-none" />
      <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">{d.shareTitle}</h3>
      <p className="text-xs text-v-muted font-light leading-relaxed mb-6 max-w-xl">{d.shareSubtitle}</p>

      <label className="text-[9px] font-mono text-v-muted uppercase block mb-1.5">{d.sharePhoneLabel}</label>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={d.sharePhonePlaceholder}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={waFlowBlocksWhatsApp}
        className="w-full max-w-md bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm mb-2 font-mono disabled:opacity-60"
      />
      <p className="text-[10px] text-v-muted/80 mb-6">{d.sharePhoneHint}</p>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          disabled={busy || waFlowBlocksWhatsApp}
          onClick={() => void onWhatsApp()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-mono uppercase tracking-wider disabled:opacity-50"
        >
          {busy || waPhase === "sending" ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
          {d.shareWhatsApp}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const href = await smsHref();
            if (href) window.location.href = href;
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 hover:border-v-cyan/40 text-xs font-mono uppercase tracking-wider text-v-text disabled:opacity-50"
        >
          <Smartphone size={18} className="text-v-cyan" />
          {d.shareSms}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onCopy()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 hover:border-v-emerald/40 text-xs font-mono uppercase tracking-wider text-v-muted disabled:opacity-50"
        >
          <Copy size={18} />
          {d.shareCopyText}
        </button>
      </div>

      {(waPhase === "request_sent" || waPhase === "waiting" || waPhase === "success" || waPhase === "failed") && (
        <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 max-w-xl" role="status">
          {(waPhase === "request_sent" || waPhase === "waiting") && (
            <>
              <p className="text-[11px] text-v-text leading-relaxed">{waProgressLine}</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-v-cyan">
                {waDetail || d.shareWaWaiting}
              </p>
            </>
          )}
          {waPhase === "success" && (
            <p className="text-[11px] text-emerald-300/90 leading-relaxed">
              {d.shareWaSuccess}
              {waTarget ? ` (${waTarget})` : ""}
            </p>
          )}
          {waPhase === "failed" && (
            <p className="text-[11px] text-rose-300/90 leading-relaxed">
              {d.shareWaFailed}
              {waDetail ? ` — ${waDetail}` : ""}
            </p>
          )}
          {(waPhase === "success" || waPhase === "failed") && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={resetWa}
                className="text-[10px] font-mono uppercase tracking-wider text-v-cyan hover:text-white border border-white/15 rounded-lg px-3 py-1.5"
              >
                {d.shareWaReset}
              </button>
            </div>
          )}
        </div>
      )}

      {waPhase === "sending" && (
        <p className="text-[10px] text-v-cyan mt-3 font-mono uppercase tracking-widest">{d.shareWaSending}</p>
      )}

      <p className="text-[10px] text-v-muted/70 mt-6 leading-relaxed">{d.shareNote}</p>

      {busy && (
        <p className="text-[10px] text-v-cyan mt-3 font-mono uppercase tracking-widest">{d.shareBuildWait}</p>
      )}
      {toast && (
        <p className="text-[11px] text-v-emerald mt-3 font-mono" role="status">
          {toast}
        </p>
      )}
    </div>
  );
}
