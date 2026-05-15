"use client";

import { motion } from "framer-motion";
import { Activity, Brain, Pill, Shield } from "lucide-react";
import MentalHealthPanel from "@/components/MentalHealthPanel";
import OutbreakPanel from "@/components/OutbreakPanel";
import MedicationReminders from "@/components/MedicationReminders";
import EhrSupportCard from "@/components/EhrSupportCard";

export default function ClinicalHubSection() {
  return (
    <section id="clinical" className="relative z-10 px-6 py-28 bg-gradient-to-b from-v-bg via-v-cyan/[0.03] to-v-bg border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-v-emerald/10 border border-v-emerald/20 mb-4">
            <Shield className="text-v-emerald" size={16} />
            <span className="text-[10px] font-mono text-v-emerald uppercase tracking-[0.25em]">Clinical programs</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-4">
            EHR · Mental health · <span className="text-glow text-v-cyan font-light not-italic">Outbreaks</span> · Meds
          </h2>
          <p className="text-v-muted text-base md:text-lg max-w-3xl mx-auto lg:mx-0 font-light leading-relaxed">
            Structured exports, screening workflows, public epidemic signals, and local medication reminders. Mental health
            scores can be sent directly into the triage assistant for follow-up questions.
          </p>
        </motion.div>

        <EhrSupportCard />

        <div className="grid lg:grid-cols-2 gap-8 mt-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-v-muted mb-1">
              <Brain size={14} className="text-v-cyan" />
              Mental health assessment
            </div>
            <MentalHealthPanel />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-v-muted mb-1">
              <Activity size={14} className="text-v-blue" />
              Predictive outbreak analysis
            </div>
            <OutbreakPanel />
          </div>
        </div>

        <div className="mt-10 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-v-muted mb-1">
            <Pill size={14} className="text-v-emerald" />
            AI-assisted medication reminders
          </div>
          <MedicationReminders />
        </div>
      </div>
    </section>
  );
}
