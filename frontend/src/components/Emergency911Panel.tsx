"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, MapPin, RefreshCw, Copy, MessageSquare, Radio } from "lucide-react";
import { t, type UILang } from "@/lib/triageLocale";
import { getStoredUILang } from "@/lib/uiLang";
import { build911SmsBody, coordsClipboardText, type EmergencyCoords } from "@/lib/emergency911Body";

type LocStatus = "idle" | "loading" | "denied" | "error" | "ok";

export default function Emergency911Panel({ compact }: { compact?: boolean }) {
  const [lang, setLang] = useState<UILang>(() => getStoredUILang());
  const [coords, setCoords] = useState<EmergencyCoords | null>(null);
  const [status, setStatus] = useState<LocStatus>("idle");
  const [live, setLive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (watchId.current != null && typeof navigator.geolocation?.clearWatch === "function") {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const applyPosition = useCallback((pos: GeolocationPosition) => {
    setCoords({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      updatedAt: Date.now(),
    });
    setStatus("ok");
  }, []);

  const onLocError = useCallback(
    (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) setStatus("denied");
      else setStatus("error");
    },
    []
  );

  const updateLocationOnce = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(applyPosition, onLocError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });
  }, [applyPosition, onLocError]);

  const stopLive = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setLive(false);
  }, []);

  const toggleLive = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    if (live) {
      stopLive();
      return;
    }
    setStatus("loading");
    watchId.current = navigator.geolocation.watchPosition(applyPosition, onLocError, {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 25000,
    });
    setLive(true);
  }, [live, applyPosition, onLocError, stopLive]);

  const d = t(lang);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const onCopy = async () => {
    if (!coords) return;
    try {
      await navigator.clipboard.writeText(coordsClipboardText(coords));
      flash(d.emergency911Copied);
    } catch {
      flash(d.emergency911CopyFail);
    }
  };

  const smsHref = coords ? `sms:108?body=${encodeURIComponent(build911SmsBody(coords, lang))}` : null;
  const mapsHref = coords
    ? `https://maps.google.com/?q=${encodeURIComponent(`${coords.lat},${coords.lng}`)}`
    : null;

  const statusText =
    status === "loading"
      ? d.emergency911LocLoading
      : status === "denied"
        ? d.emergency911LocDenied
        : status === "error"
          ? navigator.geolocation
            ? d.emergency911LocError
            : d.emergency911LocUnavailable
          : null;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-v-red/25 bg-v-red/5 p-3 space-y-2"
          : "rounded-[32px] border border-v-red/20 bg-v-red/5 p-6 space-y-4"
      }
    >
      <div className="flex items-center gap-2">
        <Radio className="text-v-red shrink-0" size={compact ? 16 : 20} />
        <span className={compact ? "text-[10px] font-mono uppercase tracking-widest text-v-red" : "text-xs font-mono uppercase tracking-widest text-v-red"}>
          {d.emergency911Title}
        </span>
      </div>

      <div className={`flex flex-wrap gap-2 ${compact ? "" : "gap-3"}`}>
        <a
          href="tel:108"
          className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-v-red text-white font-bold uppercase tracking-wider shadow-lg hover:opacity-95 ${
            compact ? "px-3 py-2 text-[10px]" : "px-6 py-4 text-xs"
          }`}
        >
          <Phone size={compact ? 16 : 20} />
          {d.emergency911Call}
        </a>
        {coords && smsHref && (
          <a
            href={smsHref}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-v-red/40 text-v-red hover:bg-v-red/10 font-mono uppercase tracking-wider ${
              compact ? "px-3 py-2 text-[10px]" : "px-5 py-4 text-xs"
            }`}
          >
            <MessageSquare size={compact ? 16 : 18} />
            {d.emergency911Text}
          </a>
        )}
        <button
          type="button"
          onClick={() => updateLocationOnce()}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 hover:border-v-cyan/40 text-v-text font-mono uppercase tracking-wider ${
            compact ? "px-3 py-2 text-[10px]" : "px-5 py-4 text-xs"
          }`}
        >
          <MapPin size={compact ? 16 : 18} />
          {d.emergency911Location}
        </button>
        <button
          type="button"
          onClick={() => toggleLive()}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 hover:border-v-cyan/40 font-mono uppercase tracking-wider ${
            live ? "bg-v-cyan/15 border-v-cyan/40 text-v-cyan" : "text-v-muted"
          } ${compact ? "px-3 py-2 text-[10px]" : "px-5 py-4 text-xs"}`}
        >
          <RefreshCw size={compact ? 16 : 18} className={live ? "animate-spin" : ""} />
          {live ? d.emergency911LiveOff : d.emergency911LiveOn}
        </button>
        {coords && (
          <>
            <a
              href={mapsHref!}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 hover:border-white/30 text-v-muted font-mono uppercase tracking-wider ${
                compact ? "px-3 py-2 text-[10px]" : "px-5 py-4 text-xs"
              }`}
            >
              {d.emergency911Maps}
            </a>
            <button
              type="button"
              onClick={() => void onCopy()}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 hover:border-white/30 text-v-muted font-mono uppercase tracking-wider ${
                compact ? "px-3 py-2 text-[10px]" : "px-5 py-4 text-xs"
              }`}
            >
              <Copy size={compact ? 16 : 18} />
              {d.emergency911Copy}
            </button>
          </>
        )}
      </div>

      {coords && (
        <p className="text-[10px] font-mono text-v-muted break-all">
          {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          {coords.accuracy != null && ` · ±${Math.round(coords.accuracy)}m`}
          {" · "}
          {new Date(coords.updatedAt).toLocaleTimeString()}
          {live && ` · ${d.emergency911LiveHint}`}
        </p>
      )}

      {statusText && <p className="text-[10px] text-amber-200/90 font-light">{statusText}</p>}
      {toast && <p className="text-[10px] text-v-emerald font-mono">{toast}</p>}

      <p className="text-[9px] text-v-muted/80 leading-relaxed border-t border-white/5 pt-2">{d.emergency911Note}</p>
    </div>
  );
}
