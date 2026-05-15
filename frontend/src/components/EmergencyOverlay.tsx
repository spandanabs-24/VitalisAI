"use client";

import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, X } from "lucide-react";
import Emergency911Panel from "@/components/Emergency911Panel";

interface EmergencyOverlayProps {
  onClose: () => void;
}

export default function EmergencyOverlay({ onClose }: EmergencyOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-y-auto overflow-x-hidden"
    >
      <div className="absolute inset-0 bg-[#ff2244]/20 backdrop-blur-3xl" />
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_center,rgba(255,34,68,0.12)_0%,transparent_70%)]" />
      <div className="hud-grid absolute inset-0 opacity-10" />

      <div className="absolute top-0 left-0 w-full h-2 bg-v-red animate-pulse" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-v-red animate-pulse" />

      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="glass rounded-[40px] md:rounded-[60px] border-[#ff2244]/30 w-full max-w-5xl p-8 md:p-12 relative shadow-[0_0_80px_rgba(255,34,68,0.25)] my-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 md:top-10 md:right-10 p-3 md:p-4 rounded-2xl glass hover:bg-v-red/10 transition-all group z-10"
        >
          <X className="text-v-red group-hover:rotate-90 transition-transform" size={22} />
        </button>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-stretch pr-2">
          <div className="lg:w-1/2 shrink-0">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-v-red/10 border border-v-red/20 mb-6">
              <ShieldAlert className="text-v-red animate-bounce" size={20} />
              <span className="text-[10px] md:text-xs font-mono text-v-red tracking-[0.25em] uppercase font-bold">Protocol_Zero_Active</span>
            </div>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tighter mb-6 leading-none">
              CRITICAL <br />
              <span className="text-v-red font-light not-italic">Anomaly.</span>
            </h2>
            <p className="text-base md:text-lg text-v-text/85 mb-8 leading-relaxed max-w-md font-light">
              Biometric or triage signals crossed a critical threshold. If this is a real emergency, call{" "}
              <strong className="text-v-red">108</strong> (India ambulance / medical emergency), share your location with
              dispatch, and follow operator instructions.
            </p>

            <div className="space-y-3">
              {["Seek immediate in-person emergency care if advised.", "Use the 108 panel to update GPS for responders.", "This UI does not replace professional dispatch."].map(
                (alert, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -12, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-v-red/5 border border-v-red/10"
                  >
                    <AlertTriangle className="text-v-red shrink-0 mt-0.5" size={16} />
                    <span className="text-[11px] md:text-xs font-mono text-v-red/90 uppercase tracking-wide leading-relaxed">{alert}</span>
                  </motion.div>
                )
              )}
            </div>
          </div>

          <div className="lg:w-1/2 min-w-0 flex flex-col justify-center">
            <Emergency911Panel />
          </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-full scanline opacity-15 pointer-events-none" />
      </motion.div>
    </motion.div>
  );
}
