"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Brain,
  Mic,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  AlertTriangle,
  Home,
  Building2,
  Siren,
  Globe2,
} from "lucide-react";
import { sendTriageMessage } from "@/lib/api";
import { runLocalTriage } from "@/lib/triageEngine";
import type { PatientTriageContext, TriageResponse } from "@/lib/types";
import { t, welcomeMessage, careLevelLabel } from "@/lib/triageLocale";
import { setStoredUILang, getStoredUILang } from "@/lib/uiLang";
import { saveLastTriage, savePatientContextSnapshot, loadLastTriage } from "@/lib/triagePersistence";
import Emergency911Panel from "@/components/Emergency911Panel";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

const TRIAGE_EVENT = "v-triage-update";
const CHAT_RESET_DELAY_MS = 2200;

function CareBadge({ level, lang }: { level: TriageResponse["care_level"]; lang: PatientTriageContext["language"] }) {
  const L = lang || "en";
  const cfg =
    level === "emergency_room"
      ? { Icon: Siren, className: "bg-v-red/20 text-v-red border-v-red/30" }
      : level === "clinic_visit"
        ? { Icon: Building2, className: "bg-amber-500/15 text-amber-300 border-amber-500/30" }
        : { Icon: Home, className: "bg-v-emerald/15 text-v-emerald border-v-emerald/30" };
  const I = cfg.Icon;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-mono uppercase tracking-widest ${cfg.className}`}>
      <I size={14} />
      {careLevelLabel(level, L)}
    </div>
  );
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: "1", role: "ai", text: welcomeMessage(getStoredUILang()) },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [patientContext, setPatientContext] = useState<PatientTriageContext>({
    age_band: undefined,
    chronic_conditions: "",
    allergies: "",
    medications: "",
    language: "en",
  });

  useEffect(() => {
    const ui = getStoredUILang();
    setPatientContext((c) => ({ ...c, language: ui }));
  }, []);

  useEffect(() => {
    setStoredUILang(patientContext.language || "en");
  }, [patientContext.language]);
  const [lastTriage, setLastTriage] = useState<TriageResponse | null>(() =>
    typeof window !== "undefined" ? loadLastTriage() : null
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const triageTurnRef = useRef(0);
  const pendingChatResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef("");
  const sendingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pendingChatResetRef.current) {
        clearTimeout(pendingChatResetRef.current);
        pendingChatResetRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, lastTriage]);

  const [isListening, setIsListening] = useState(false);

  const handleSend = useCallback(async (textOverride?: string) => {
    const textToSend = (textOverride ?? inputRef.current).trim();
    if (!textToSend || sendingRef.current) return;

    if (pendingChatResetRef.current) {
      clearTimeout(pendingChatResetRef.current);
      pendingChatResetRef.current = null;
    }

    sendingRef.current = true;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (textOverride == null) setInput("");
    setIsTyping(true);

    const ctxPayload: PatientTriageContext = {
      ...patientContext,
      age_band: patientContext.age_band || undefined,
      chronic_conditions: patientContext.chronic_conditions?.trim() || undefined,
      allergies: patientContext.allergies?.trim() || undefined,
      medications: patientContext.medications?.trim() || undefined,
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 250));

      let triage: TriageResponse;
      let usedLocalTriage = false;

      try {
        triage = await sendTriageMessage({
          message: textToSend,
          sessionId: sessionIdRef.current,
          patientContext: ctxPayload,
        });
        sessionIdRef.current = triage.session_id || sessionIdRef.current;
      } catch {
        usedLocalTriage = true;
        const sid = sessionIdRef.current || crypto.randomUUID();
        sessionIdRef.current = sid;
        triage = runLocalTriage(textToSend, ctxPayload, sid);
      }

      const follow = triage.follow_up_question?.trim();
      const body = triage.ai_message?.trim() || "";
      const responseText = follow ? `${body}\n\n${follow}` : body;

      triageTurnRef.current += 1;
      const diagnosisComplete =
        !follow || (usedLocalTriage && triageTurnRef.current >= 2);

      setLastTriage(triage);
      saveLastTriage(triage);
      savePatientContextSnapshot(ctxPayload);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(TRIAGE_EVENT, { detail: { triage } }));
        if (
          triage.is_emergency ||
          triage.emergency_alert ||
          triage.severity === "critical" ||
          triage.care_level === "emergency_room"
        ) {
          window.dispatchEvent(new CustomEvent("v-emergency-trigger", { detail: { active: true } }));
        }
      }

      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "ai",
        text: responseText || "No response text returned.",
      };
      setMessages((prev) => [...prev, aiMsg]);

      const speak =
        textOverride == null && responseText.length > 0 && !diagnosisComplete;
      if ("speechSynthesis" in window && speak) {
        try {
          const utterance = new SpeechSynthesisUtterance(responseText.slice(0, 320));
          utterance.rate = 1.02;
          utterance.pitch = 0.95;
          const L = ctxPayload.language || "en";
          utterance.lang = L === "hi" ? "hi-IN" : L === "kn" ? "kn-IN" : "en-US";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error("Speech Synthesis Error:", e);
        }
      }

      if (diagnosisComplete && typeof window !== "undefined") {
        pendingChatResetRef.current = setTimeout(() => {
          pendingChatResetRef.current = null;
          triageTurnRef.current = 0;
          sessionIdRef.current = undefined;
          setLastTriage(null);
          const lang = ctxPayload.language || getStoredUILang();
          const note = t(lang).chatNewSession;
          setMessages([
            {
              id: `w-${Date.now()}`,
              role: "ai",
              text: `${welcomeMessage(lang)}\n\n${note}`,
            },
          ]);
          try {
            window.speechSynthesis.cancel();
          } catch {
            /* ignore */
          }
          window.dispatchEvent(
            new CustomEvent("v-emergency-trigger", { detail: { active: false } })
          );
        }, CHAT_RESET_DELAY_MS);
      }
    } catch (err) {
      console.error("Chatbot Core Error:", err);
      const errD = t(ctxPayload.language || "en");
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: "ai",
          text: errD.channelError,
        },
      ]);
    } finally {
      sendingRef.current = false;
      setIsTyping(false);
    }
  }, [patientContext]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t(patientContext.language || "en").voiceUnsupported);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = patientContext.language === "hi" ? "hi-IN" : patientContext.language === "kn" ? "kn-IN" : "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setInput(transcript);
      void handleSend(transcript);
    };

    recognition.start();
  }, [handleSend, patientContext.language]);

  useEffect(() => {
    const onPrefill = (e: Event) => {
      const ce = e as CustomEvent<{ message?: string }>;
      const msg = ce.detail?.message?.trim();
      if (!msg) return;
      void handleSend(msg);
    };
    window.addEventListener("v-prefill-triage", onPrefill as EventListener);
    return () => window.removeEventListener("v-prefill-triage", onPrefill as EventListener);
  }, [handleSend]);

  const L = patientContext.language || "en";
  const d = t(L);

  return (
    <div className="glass rounded-[40px] flex flex-col h-[720px] w-full max-w-2xl mx-auto overflow-hidden shadow-2xl relative">
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-v-cyan/10 flex items-center justify-center relative">
            <Brain className="text-v-cyan" size={22} />
          </div>
          <div>
            <h3 className="font-bold tracking-tight uppercase italic text-sm">{d.assistantTitle}</h3>
            <span className="text-[8px] font-mono text-v-emerald uppercase tracking-widest">{d.assistantSubtitle}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-v-emerald animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-v-cyan animate-pulse" />
        </div>
      </div>

      {/* Patient symptom & history collection (structured) */}
      <div className="border-b border-white/5 bg-black/20 shrink-0">
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.03] transition-colors"
        >
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-v-cyan flex items-center gap-2">
            <Stethoscope size={14} />
            {d.profileToggle}
          </span>
          {showHistory ? <ChevronUp size={16} className="text-v-muted" /> : <ChevronDown size={16} className="text-v-muted" />}
        </button>
        <AnimatePresence initial={false}>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-v-muted uppercase block mb-1">{d.ageBand}</label>
                  <select
                    value={patientContext.age_band || ""}
                    onChange={(e) =>
                      setPatientContext((c) => ({
                        ...c,
                        age_band: (e.target.value || undefined) as PatientTriageContext["age_band"],
                      }))
                    }
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="">{d.agePreferNot}</option>
                    <option value="child">{d.ageChild}</option>
                    <option value="adult">{d.ageAdult}</option>
                    <option value="senior">{d.ageSenior}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-v-muted uppercase block mb-1">{d.languageLabel}</label>
                  <select
                    value={patientContext.language || "en"}
                    onChange={(e) =>
                      setPatientContext((c) => ({
                        ...c,
                        language: e.target.value as PatientTriageContext["language"],
                      }))
                    }
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="en">{d.langEn}</option>
                    <option value="hi">{d.langHi}</option>
                    <option value="kn">{d.langKn}</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-mono text-v-muted uppercase block mb-1">{d.chronic}</label>
                  <input
                    value={patientContext.chronic_conditions || ""}
                    onChange={(e) => setPatientContext((c) => ({ ...c, chronic_conditions: e.target.value }))}
                    placeholder={d.phChronic}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-v-muted uppercase block mb-1">{d.allergies}</label>
                  <input
                    value={patientContext.allergies || ""}
                    onChange={(e) => setPatientContext((c) => ({ ...c, allergies: e.target.value }))}
                    placeholder={d.phAllergies}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-v-muted uppercase block mb-1">{d.medications}</label>
                  <input
                    value={patientContext.medications || ""}
                    onChange={(e) => setPatientContext((c) => ({ ...c, medications: e.target.value }))}
                    placeholder={d.phMeds}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Last triage summary — risk scoring, care recommendation, emergency */}
      <AnimatePresence>
        {lastTriage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mx-4 mt-3 rounded-2xl border p-4 shrink-0 ${
              lastTriage.is_emergency ||
              lastTriage.emergency_alert ||
              lastTriage.care_level === "emergency_room" ||
              lastTriage.severity === "critical"
                ? "border-v-red/40 bg-v-red/10"
                : lastTriage.severity === "high"
                  ? "border-amber-500/35 bg-amber-500/10"
                  : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <CareBadge level={lastTriage.care_level} lang={L} />
              <span className="text-[10px] font-mono text-v-muted uppercase">
                {d.riskLabel} {lastTriage.risk_score}/100 · {lastTriage.severity}
                {lastTriage.ai_confidence != null ? ` · conf ${lastTriage.ai_confidence}%` : ""}
              </span>
              {(lastTriage.is_emergency ||
                lastTriage.emergency_alert ||
                lastTriage.care_level === "emergency_room") && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-v-red">
                  <AlertTriangle size={12} />
                  {d.emergencyBadge}
                </span>
              )}
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  lastTriage.risk_score >= 75 ? "bg-v-red" : lastTriage.risk_score >= 45 ? "bg-amber-400" : "bg-v-emerald"
                }`}
                style={{ width: `${lastTriage.risk_score}%` }}
              />
            </div>
            <p className="text-[11px] text-v-muted font-light leading-relaxed mb-2">{lastTriage.care_recommendation_title}</p>
            {lastTriage.nlp_symptoms.length > 0 && (
              <p className="text-[10px] font-mono text-v-cyan/80 mb-1">
                {d.nlpSymptoms}: {lastTriage.nlp_symptoms.slice(0, 8).join(", ")}
              </p>
            )}
            {lastTriage.red_flags.length > 0 && (
              <ul className="text-[10px] text-amber-200/90 list-disc pl-4 space-y-0.5">
                {lastTriage.red_flags.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {(lastTriage.is_emergency || lastTriage.care_level === "emergency_room") && (
              <div className="mt-3 pt-3 border-t border-v-red/25">
                <Emergency911Panel compact />
              </div>
            )}
            <p className="text-[9px] text-v-muted/80 mt-2 flex items-start gap-1.5">
              <Globe2 size={12} className="shrink-0 mt-0.5 text-v-cyan/60" />
              {lastTriage.accessibility_note}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="flex-1 min-h-0 p-5 overflow-y-auto space-y-4 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] p-4 rounded-[20px] ${
                  msg.role === "user"
                    ? "bg-v-cyan/10 border border-v-cyan/20 text-v-text rounded-tr-sm"
                    : "bg-white/[0.03] border border-white/5 text-v-text rounded-tl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed font-light whitespace-pre-wrap">{msg.text}</p>
                <span className="text-[8px] font-mono text-v-muted uppercase tracking-widest mt-2 block">
                  {msg.role === "user" ? d.patientLabel : d.aiLabel}
                </span>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl rounded-tl-sm flex items-center gap-3">
                <Loader2 className="text-v-cyan animate-spin" size={16} />
                <span className="text-[8px] font-mono text-v-cyan uppercase tracking-widest">{d.analyzing}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 bg-white/[0.02] border-t border-white/5 shrink-0">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={startListening}
            className={`p-3 rounded-2xl transition-all shrink-0 ${
              isListening ? "bg-v-red text-v-bg animate-pulse" : "glass hover:bg-v-cyan/10 text-v-cyan"
            }`}
            title="Voice-enabled assistant"
          >
            {isListening ? <Mic className="animate-bounce" size={20} /> : <Mic size={20} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={d.inputPh}
            className="flex-1 min-w-0 bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-v-cyan/40 font-light placeholder:text-v-muted/50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isTyping}
            className="p-3 rounded-2xl bg-v-cyan text-v-bg hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 shrink-0"
          >
            <Send size={20} />
          </button>
        </div>

        <p className="text-[9px] text-v-muted/70 mt-2 font-mono text-center">{d.disclaimer}</p>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { label: d.chipCold, key: "cold" },
            { label: d.chipFever, key: "fever" },
            { label: d.chipChest, key: "chest" },
            { label: d.chipBreath, key: "breath" },
            { label: d.chipMh, key: "mh" },
          ].map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() => handleSend(tag.label)}
              disabled={isTyping}
              className="flex-shrink-0 px-3 py-2 rounded-xl glass border-white/5 text-[9px] font-mono text-v-muted hover:text-v-cyan hover:border-v-cyan/30 uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-30"
            >
              <Sparkles size={11} />
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-v-cyan/20 to-transparent" />
    </div>
  );
}
