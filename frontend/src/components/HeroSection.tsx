"use client";

import { motion } from "framer-motion";
import { Sparkles, Activity, Shield, Brain, Zap, ArrowRight, Heart, Database } from "lucide-react";
import ThreeDScene from "./ThreeDScene";

interface HeroSectionProps {
  onStart: () => void;
  onShowProtocol: () => void;
}

export default function HeroSection({ onStart, onShowProtocol }: HeroSectionProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.5,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, filter: "blur(10px)" },
    visible: { 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 1, ease: [0.23, 1, 0.32, 1] } 
    },
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
      {/* Immersive 3D Scene Background */}
      <ThreeDScene />

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="hud-grid absolute inset-0 opacity-20" />
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-v-bg via-v-bg/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-v-bg via-v-bg/50 to-transparent" />
        <div className="scanline" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto text-center"
      >
        {/* Animated Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full glass hologram-border mb-12 shadow-2xl backdrop-blur-3xl"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-v-cyan animate-pulse shadow-[0_0_15px_rgba(0,212,255,1)]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-v-cyan font-bold">
            Vitalis_Core // Global_Neural_Sync_Active
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-7xl md:text-[140px] font-black italic tracking-tighter leading-[0.85] mb-10 bg-gradient-to-b from-white via-white to-v-cyan/20 bg-clip-text text-transparent"
        >
          HEALTHCARE <br />
          <span className="text-v-cyan not-italic font-light text-glow">INTELLIGENCE.</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl text-v-muted max-w-3xl mx-auto mb-16 leading-relaxed font-light tracking-wide"
        >
          Pioneering the future of biological optimization through an immersive 
          neural-linked medical operating system. Real-time diagnostics for the next 
          generation of human longevity.
        </motion.p>

        {/* CTA Section */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-10"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(0, 212, 255, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="group relative px-12 py-6 bg-v-cyan text-v-bg font-black rounded-[24px] flex items-center gap-4 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Zap className="w-6 h-6 fill-current" />
            <span className="tracking-[0.2em] uppercase text-sm">Initialize_Sync</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </motion.button>

          <button 
            onClick={onShowProtocol}
            className="px-12 py-6 glass rounded-[24px] text-white font-bold tracking-[0.2em] uppercase text-sm hover:bg-white/5 transition-all flex items-center gap-3"
          >
             <Database className="text-v-muted w-5 h-5" />
             Protocol_Overview
          </button>
        </motion.div>

        {/* Floating Metrics Section */}
        <motion.div 
          variants={itemVariants}
          className="mt-40 grid grid-cols-2 lg:grid-cols-4 gap-12 border-t border-white/5 pt-20"
        >
          {[
            { icon: Brain, label: "Neural Logic", val: "99.9%", desc: "COGNITIVE_TRIAGE" },
            { icon: Heart, label: "Pulse Sync", val: "REAL-TIME", desc: "LIVE_TELEMETRY" },
            { icon: Shield, label: "Biometric Sec", val: "AES-512", desc: "ENCRYPT_LINK" },
            { icon: Sparkles, label: "AI Precision", val: "LVL_5", desc: "PREDICTIVE_MOD" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center group cursor-default">
              <div className="p-4 rounded-[20px] bg-white/[0.03] mb-6 group-hover:bg-v-cyan/10 transition-colors duration-500">
                 <item.icon className="w-7 h-7 text-v-cyan opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-v-muted mb-2">{item.label}</span>
              <span className="text-3xl font-black text-white italic">{item.val}</span>
              <span className="text-[9px] font-mono text-v-cyan/30 mt-2">{item.desc}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Decorative HUD Elements */}
      <div className="absolute bottom-20 left-10 opacity-20 hidden 2xl:block animate-float">
         <div className="glass p-8 rounded-[40px] w-64 hologram-border">
            <div className="flex items-center justify-between mb-4">
               <span className="text-[10px] font-mono text-v-cyan uppercase tracking-widest">Sys_Health</span>
               <Activity size={14} className="text-v-emerald animate-pulse" />
            </div>
            <div className="space-y-3">
               {[85, 92, 78].map((w, i) => (
                  <div key={i} className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-v-cyan" style={{ width: `${w}%` }} />
                  </div>
               ))}
            </div>
         </div>
      </div>
    </section>
  );
}
