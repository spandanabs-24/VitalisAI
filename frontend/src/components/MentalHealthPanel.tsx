"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Send, Phone, LifeBuoy, ClipboardList } from "lucide-react";
import { getStoredUILang } from "@/lib/uiLang";

type Lang = "en" | "hi" | "kn";

/** PHQ-2 / GAD-2–inspired screening (not a diagnostic instrument). */
const copy: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    scale: string[];
    crisis: string;
    submit: string;
    crisisNote: string;
    scoresTitle: string;
    scoresSubtitle: string;
    shortQ: [string, string, string, string];
    scoresMoodPair: string;
    scoresAnxietyPair: string;
    scoresSumNote: string;
    crisisLabel: string;
    crisisYes: string;
    crisisNo: string;
    notSent: string;
    lastSent: string;
  }
> = {
  en: {
    title: "Mental health check-in",
    subtitle: "2-week mood + anxiety screen (research-style). Not a diagnosis.",
    q1: "Little interest or pleasure in doing things?",
    q2: "Feeling down, depressed, or hopeless?",
    q3: "Feeling nervous, anxious, or on edge?",
    q4: "Not able to stop or control worrying?",
    scale: ["Not at all", "Several days", "More than half", "Nearly every day"],
    crisis: "I need urgent help / thoughts of self-harm",
    submit: "Send scores to triage assistant",
    crisisNote:
      "If in immediate danger, call your local emergency number. India: Tele MANAS 14416, iCall 9152987821, Vandrevala Foundation 1860-2662-345.",
    scoresTitle: "Live score panel",
    scoresSubtitle: "Each item is 0–3. This side panel updates as you answer.",
    shortQ: ["Q1 · Interest / pleasure", "Q2 · Low mood", "Q3 · Anxious / on edge", "Q4 · Worry control"],
    scoresMoodPair: "Mood screen (Q1–2)",
    scoresAnxietyPair: "Anxiety screen (Q3–4)",
    scoresSumNote: "Sums mirror PHQ-2 / GAD-2 style ranges (0–6 each). Not a formal score sheet.",
    crisisLabel: "Crisis flag",
    crisisYes: "On — seek urgent help",
    crisisNo: "Off",
    notSent: "Not sent to triage yet",
    lastSent: "Last sent to triage:",
  },
  hi: {
    title: "मानसिक स्वास्थ्य जाँच",
    subtitle: "2 सप्ताह का मूड + चिंता स्क्रीन (अनुसंधान शैली)। निदान नहीं।",
    q1: "काम में रुचि या आनंद कम?",
    q2: "उदास, हताश या निराश महसूस?",
    q3: "घबराहट, चिंता या बेचैनी?",
    q4: "चिंता रोक नहीं पा रहे?",
    scale: ["बिल्कुल नहीं", "कई दिन", "आधे से अधिक दिन", "लगभग हर दिन"],
    crisis: "मुझे तुरंत मदद चाहिए / आत्महानि के विचार",
    submit: "स्कोर ट्राइज सहायक को भेजें",
    crisisNote:
      "तुरंत खतरे में स्थानीय आपात नंबर। भारत: Tele MANAS 14416, iCall 9152987821, Vandrevala 1860-2662-345।",
    scoresTitle: "लाइव स्कोर पैनल",
    scoresSubtitle: "प्रत्येक 0–3। उत्तर चुनते ही यहाँ अपडेट होता है।",
    shortQ: ["प्र1 · रुचि/आनंद", "प्र2 · उदासी", "प्र3 · चिंता/बेचैनी", "प्र4 · चिंता नियंत्रण"],
    scoresMoodPair: "मूड स्क्रीन (प्र1–2)",
    scoresAnxietyPair: "चिंता स्क्रीन (प्र3–4)",
    scoresSumNote: "योग PHQ-2 / GAD-2 शैली (प्रत्येक 0–6) जैसा। औपचारिक स्कोर शीट नहीं।",
    crisisLabel: "संकट चिह्न",
    crisisYes: "चालू — तुरंत सहायता लें",
    crisisNo: "बंद",
    notSent: "अभी ट्राइज को नहीं भेजा",
    lastSent: "ट्राइज को अंतिम भेजा:",
  },
  kn: {
    title: "ಮಾನಸಿಕ ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ",
    subtitle: "2 ವಾರಗಳ ಮನೋಭಾವ + ಆತಂಕ ಪರದೆ (ಅಧ್ಯಯನ ಶೈಲಿ). ರೋಗನಿರ್ಣಯ ಅಲ್ಲ.",
    q1: "ಕೆಲಸಗಳಲ್ಲಿ ಆಸಕ್ತಿ ಅಥವಾ ಸಂತೋಷ ಕಡಿಮೆಯೇ?",
    q2: "ದುಃಖ, ನಿರಾಶೆ ಅಥವಾ ನಿರಾಶಾವಾದ?",
    q3: "ನರಗಳು, ಆತಂಕ ಅಥವಾ ಅಶಾಂತಿ?",
    q4: "ಚಿಂತೆಯನ್ನು ನಿಲ್ಲಿಸಲು ಅಸಾಧ್ಯವೇ?",
    scale: ["ಇಲ್ಲವೇ ಇಲ್ಲ", "ಹಲವು ದಿನಗಳು", "ಅರ್ಧಕ್ಕಿಂತ ಹೆಚ್ಚು", "ಬಹುತೇಕ ಪ್ರತಿದಿನ"],
    crisis: "ತಕ್ಷಣ ಸಹಾಯ ಬೇಕು / ಆತ್ಮಹಾನಿಯ ಚಿಂತನೆಗಳು",
    submit: "ಅಂಕಗಳನ್ನು ಟ್ರೈಜ್ ಸಹಾಯಕಕ್ಕೆ ಕಳುಹಿಸಿ",
    crisisNote:
      "ತಕ್ಷಣ ಅಪಾಯದಲ್ಲಿ ಸ್ಥಳೀಯ ತುರ್ತು ಸಂಖ್ಯೆ. ಭಾರತ: Tele MANAS 14416, iCall 9152987821, Vandrevala 1860-2662-345.",
    scoresTitle: "ಲೈವ್ ಅಂಕ ಪ್ಯಾನೆಲ್",
    scoresSubtitle: "ಪ್ರತಿಯೊಂದು 0–3. ಉತ್ತರಿಸುತ್ತಿದ್ದಂತೆ ಇಲ್ಲಿ ನವೀಕರಣ.",
    shortQ: ["ಪ್ರ1 · ಆಸಕ್ತಿ/ಸಂತೋಷ", "ಪ್ರ2 · ದುಃಖ", "ಪ್ರ3 · ಆತಂಕ", "ಪ್ರ4 · ಚಿಂತೆ ನಿಯಂತ್ರಣ"],
    scoresMoodPair: "ಮನೋಭಾವ ಪರದೆ (ಪ್ರ1–2)",
    scoresAnxietyPair: "ಆತಂಕ ಪರದೆ (ಪ್ರ3–4)",
    scoresSumNote: "ಮೊತ್ತಗಳು PHQ-2 / GAD-2 ಶೈಲಿ (ಪ್ರತಿ 0–6). ಅಧಿಕೃತ ಅಂಕಪತ್ರಿಕೆ ಅಲ್ಲ.",
    crisisLabel: "ತುರ್ತು ಧ್ವಜ",
    crisisYes: "ಆನ್ — ತಕ್ಷಣ ಸಹಾಯ",
    crisisNo: "ಆಫ್",
    notSent: "ಇನ್ನೂ ಟ್ರೈಜ್‌ಗೆ ಕಳುಹಿಸಿಲ್ಲ",
    lastSent: "ಕೊನೆಯ ಟ್ರೈಜ್‌ಗೆ ಕಳುಹಿಸಿದೆ:",
  },
};

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex gap-1 mt-1.5" role="img" aria-label={`Score ${value} of 3`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-sm transition-colors ${i <= value ? "bg-v-cyan shadow-[0_0_8px_rgba(0,212,255,0.35)]" : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

export default function MentalHealthPanel() {
  const [lang, setLang] = useState<Lang>("en");
  const [v, setV] = useState([0, 0, 0, 0]);
  const [crisis, setCrisis] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const c = copy[lang];

  useEffect(() => {
    const L = getStoredUILang();
    if (L === "hi" || L === "kn" || L === "en") setLang(L);
    const h = () => {
      const ll = getStoredUILang();
      if (ll === "hi" || ll === "kn" || ll === "en") setLang(ll);
    };
    window.addEventListener("v-ui-lang", h as EventListener);
    return () => window.removeEventListener("v-ui-lang", h as EventListener);
  }, []);

  const moodSum = v[0] + v[1];
  const anxietySum = v[2] + v[3];

  const submit = () => {
    const parts = [
      "[MENTAL_HEALTH_SCREEN]",
      `Language: ${lang}`,
      `Scores (0-3 each): interest=${v[0]}, mood=${v[1]}, anxiety=${v[2]}, worry=${v[3]}`,
      `Crisis flag: ${crisis}`,
      "Please triage: suggest care level and next steps.",
    ];
    setLastSentAt(new Date());
    window.dispatchEvent(
      new CustomEvent("v-prefill-triage", {
        detail: { message: parts.join("\n") },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-[40px] p-6 sm:p-8 border border-v-cyan/15"
    >
      <div className="flex items-center gap-3 mb-6">
        <Brain className="text-v-cyan" size={28} />
        <div>
          <h3 className="text-xl font-black italic uppercase tracking-tight">{c.title}</h3>
          <p className="text-xs text-v-muted font-light">{c.subtitle}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] gap-8 items-start">
        <div className="space-y-5 min-w-0">
          {[c.q1, c.q2, c.q3, c.q4].map((label, idx) => (
            <div key={idx}>
              <p className="text-sm font-light text-v-text mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {c.scale.map((opt, j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() =>
                      setV((s) => {
                        const n = [...s];
                        n[idx] = j;
                        return n;
                      })
                    }
                    className={`px-3 py-2 rounded-xl text-[10px] font-mono uppercase border transition-all ${
                      v[idx] === j
                        ? "border-v-cyan bg-v-cyan/15 text-v-cyan"
                        : "border-white/10 text-v-muted hover:border-white/20"
                    }`}
                  >
                    {j}: {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <label className="flex items-start gap-3 cursor-pointer text-sm text-amber-200/90">
            <input type="checkbox" checked={crisis} onChange={(e) => setCrisis(e.target.checked)} className="mt-1" />
            <span>{c.crisis}</span>
          </label>

          <p className="text-[10px] text-v-muted font-light leading-relaxed flex gap-2">
            <Phone size={14} className="shrink-0 text-v-cyan/60" />
            {c.crisisNote}
          </p>

          <button
            type="button"
            onClick={submit}
            className="w-full py-4 rounded-2xl bg-v-cyan/20 text-v-cyan border border-v-cyan/30 font-mono text-[10px] uppercase tracking-widest hover:bg-v-cyan/30 flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {c.submit}
          </button>
          <p className="text-[9px] font-mono text-v-muted flex items-center gap-2">
            <LifeBuoy size={12} />
            Multi-turn triage will ask follow-ups after this structured payload is sent.
          </p>
        </div>

        <aside className="lg:sticky lg:top-24 rounded-2xl border border-v-cyan/25 bg-black/30 p-5 space-y-4 shrink-0">
          <div className="flex items-center gap-2 text-v-cyan mb-1">
            <ClipboardList size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">{c.scoresTitle}</h4>
          </div>
          <p className="text-[10px] text-v-muted font-light leading-relaxed">{c.scoresSubtitle}</p>

          <ul className="space-y-4 border-t border-white/5 pt-4">
            {c.shortQ.map((label, idx) => (
              <li key={idx}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-mono text-v-muted uppercase leading-snug">{label}</span>
                  <span className="text-lg font-black tabular-nums text-white shrink-0">{v[idx]}</span>
                </div>
                <ScoreBar value={v[idx]} />
                <p className="text-[9px] text-v-muted/70 mt-1 truncate">{c.scale[v[idx]]}</p>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
              <p className="text-[9px] font-mono text-v-muted uppercase mb-1">{c.scoresMoodPair}</p>
              <p className="text-2xl font-black text-v-cyan tabular-nums">
                {moodSum}
                <span className="text-[10px] font-mono text-v-muted font-normal"> /6</span>
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
              <p className="text-[9px] font-mono text-v-muted uppercase mb-1">{c.scoresAnxietyPair}</p>
              <p className="text-2xl font-black text-v-blue tabular-nums">
                {anxietySum}
                <span className="text-[10px] font-mono text-v-muted font-normal"> /6</span>
              </p>
            </div>
          </div>
          <p className="text-[9px] text-v-muted/80 font-light leading-relaxed border-t border-white/5 pt-3">{c.scoresSumNote}</p>

          <div className="rounded-xl border border-white/10 px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase text-v-muted">{c.crisisLabel}</span>
            <span className={`text-[10px] font-mono uppercase ${crisis ? "text-v-red" : "text-v-emerald/90"}`}>
              {crisis ? c.crisisYes : c.crisisNo}
            </span>
          </div>

          <p className="text-[10px] font-mono text-v-muted">
            {lastSentAt ? (
              <>
                {c.lastSent}{" "}
                <span className="text-v-text">{lastSentAt.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-v-muted/80">{c.notSent}</span>
            )}
          </p>
        </aside>
      </div>
    </motion.div>
  );
}
