"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { 
  Heart, 
  Brain, 
  Bell, 
  Shield, 
  Activity, 
  Fingerprint, 
  Lock, 
  Loader2, 
  Globe, 
  Cpu,
  Database,
  X,
  Layers,
  GitBranch,
  LogOut
} from "lucide-react";

// Dynamic Imports with ssr: false to prevent hydration/build issues with Three.js/Recharts
const HeroSection = dynamic(() => import("@/components/HeroSection"), { ssr: false });
const AIAssistant = dynamic(() => import("@/components/AIAssistant"), { ssr: false });
const HealthDashboard = dynamic(() => import("@/components/HealthDashboard"), { ssr: false });
const EmergencyOverlay = dynamic(() => import("@/components/EmergencyOverlay"), { ssr: false });
const CursorTrail = dynamic(() => import("@/components/CursorTrail"), { ssr: false });
const FeatureSection = dynamic(() => import("@/components/FeatureSection"), { ssr: false });
const HumanBodyScene = dynamic(() => import("@/components/HumanBodyScene"), { ssr: false });
const BiometricScanner = dynamic(() => import("@/components/BiometricScanner"), { ssr: false });
const ExtendedCareTools = dynamic(() => import("@/components/ExtendedCareTools"), { ssr: false });
const ShareReportPanel = dynamic(() => import("@/components/ShareReportPanel"), { ssr: false });
const YouTubeSection = dynamic(() => import("@/components/YouTubeSection"), { ssr: false });
const ClinicalHubSection = dynamic(() => import("@/components/ClinicalHubSection"), { ssr: false });

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const bootLogs = [
    "VITALIS_CORE_v4.0.2_INITIATED",
    "DECRYPTING_NEURAL_LAYER... DONE",
    "SYNCING_BIOMETRIC_TELEMETRY... OK",
    "STABLIZING_HOLOGRAPHIC_INTERFACE...",
    "LINKING_AI_CLUSTER... ACTIVE",
    "PROTOCOL_ZERO_READY"
  ];

  useEffect(() => {
    let currentLog = 0;
    const logInterval = setInterval(() => {
      if (currentLog < bootLogs.length) {
        setLogs(prev => [...prev, bootLogs[currentLog]]);
        currentLog++;
      }
    }, 400);

    const progInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progInterval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => {
      clearInterval(logInterval);
      clearInterval(progInterval);
    };
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-v-bg flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-md">
        <div className="flex items-center gap-4 mb-12">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-2xl bg-v-cyan/10 flex items-center justify-center border border-v-cyan/20"
          >
            <Loader2 className="text-v-cyan w-6 h-6" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold tracking-tighter italic">VITALIS<span className="font-light not-italic text-v-cyan">AI</span></h2>
            <p className="text-[10px] font-mono text-v-muted uppercase tracking-[0.3em]">Neural Boot Sequence</p>
          </div>
        </div>

        <div className="space-y-2 mb-8 font-mono text-[10px] text-v-cyan/60 h-32 overflow-hidden">
          <AnimatePresence>
            {logs.map((log, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-v-cyan">{">"}</span>
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
          <motion.div 
            className="h-full bg-v-cyan shadow-[0_0_15px_rgba(0,212,255,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[9px] text-v-muted">
           <span>SYSTEM_INTEGRITY: OK</span>
           <span>{progress}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [showProtocol, setShowProtocol] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Listen for biometric emergency triggers
    const handleEmergency = (e: any) => {
      if (e.detail?.active) {
        setIsEmergencyMode(true);
      } else {
        setIsEmergencyMode(false);
      }
    };
    window.addEventListener("v-emergency-trigger", handleEmergency as any);
    return () => window.removeEventListener("v-emergency-trigger", handleEmergency as any);
  }, []);

  if (!mounted) return null;

  return (
    <main className={`min-h-screen bg-v-bg text-v-text transition-colors duration-1000 ${isEmergencyMode ? 'emergency-active' : ''}`}>
      <CursorTrail />
      
      {/* Premium Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[60] p-6">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-7xl mx-auto flex items-center justify-between glass px-8 py-4 rounded-[32px] border-white/5 shadow-2xl backdrop-blur-3xl"
        >
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-v-cyan to-v-blue flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-v-bg animate-heartbeat" />
              </div>
              <div className="absolute inset-0 bg-v-cyan blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter uppercase italic leading-none">Vitalis<span className="text-v-cyan font-light not-italic">AI</span></h1>
              <span className="text-[9px] font-mono text-v-muted tracking-[0.4em] uppercase">Hyper-Core OS</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {["Features", "Triage", "Clinical", "Analytics", "Videos", "Safety"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[10px] font-mono uppercase tracking-[0.2em] text-v-muted hover:text-v-cyan transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-v-cyan group-hover:w-full transition-all duration-300" />
              </a>
            ))}
            <button
              type="button"
              onClick={() => setShowProtocol(true)}
              className="text-[10px] font-mono uppercase tracking-[0.2em] text-v-muted hover:text-v-cyan transition-colors"
            >
              Protocol
            </button>
          </div>

          <div className="flex items-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsEmergencyMode(!isEmergencyMode)}
              className={`p-3 rounded-2xl transition-all ${isEmergencyMode ? 'bg-v-red text-white shadow-[0_0_20px_rgba(255,34,68,0.5)]' : 'glass text-v-muted hover:text-white'}`}
            >
              <Bell size={20} className={isEmergencyMode ? 'animate-bounce' : ''} />
            </motion.button>
            <div className="h-8 w-px bg-white/10" />
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Sign out"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="p-3 rounded-2xl glass text-v-muted hover:text-v-cyan hover:bg-white/5 transition-all"
            >
              <LogOut size={20} />
            </motion.button>
            <button className="flex items-center gap-4 pl-2 pr-6 py-2 glass rounded-2xl hover:bg-white/5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center overflow-hidden">
                 <Fingerprint className="text-white/20 group-hover:text-v-cyan transition-colors" size={24} />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-mono tracking-widest uppercase leading-none text-white/50">P_PN_402</span>
                <span className="text-[8px] font-mono text-v-emerald uppercase">Session active</span>
              </div>
            </button>
          </div>
        </motion.div>
      </nav>

      <AnimatePresence mode="wait">
        {!isSystemActive && !isBooting && (
          <HeroSection 
            key="hero" 
            onStart={() => setIsBooting(true)} 
            onShowProtocol={() => setShowProtocol(true)}
          />
        )}
        {isBooting && (
          <BootSequence key="boot" onComplete={() => {
            setIsBooting(false);
            setIsSystemActive(true);
          }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSystemActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative pt-40"
          >
            {/* Background HUD */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
              <div className="hud-grid absolute inset-0" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-v-cyan/5 rounded-full blur-[150px]" />
            </div>

            <div id="features">
              <FeatureSection />
            </div>

            {/* 3D Human Body Diagnostic System */}
            <section id="diagnostics" className="relative z-10 px-6 py-40">
              <div className="max-w-7xl mx-auto mb-20 text-center">
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                 >
                    <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase mb-6 leading-none">Anatomical <span className="text-glow text-v-cyan font-light not-italic">Intelligence.</span></h2>
                    <p className="text-v-muted text-xl max-w-2xl mx-auto font-light leading-relaxed">
                       Interact with the holographic anatomical model to initiate deep-tissue scans 
                       and neural-linked organ diagnostics.
                    </p>
                 </motion.div>
              </div>
              <HumanBodyScene />
            </section>

            {/* Real Biometric Scanner System */}
            <section id="biometrics" className="relative z-10 px-6 py-20 bg-gradient-to-b from-v-bg to-v-cyan/5">
              <div className="max-w-7xl mx-auto mb-20 text-center">
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                 >
                    <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-6 leading-none">Live <span className="text-glow text-v-cyan font-light not-italic">Biometrics.</span></h2>
                    <p className="text-v-muted text-xl max-w-2xl mx-auto font-light leading-relaxed">
                       Connect your actual Bluetooth heart rate monitor or use your camera for real-time pulse detection. Your data never leaves your device.
                    </p>
                 </motion.div>
              </div>
              <BiometricScanner />
            </section>

            <section id="triage" className="relative z-10 px-6 py-40">
              <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
                <div className="lg:w-1/2">
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="space-y-8"
                  >
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-v-cyan/10 border border-v-cyan/20">
                      <Brain className="w-4 h-4 text-v-cyan" />
                      <span className="text-[10px] font-mono text-v-cyan uppercase tracking-[0.2em]">Cognitive Triage Active</span>
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] italic">
                      Talk To Your <br />
                      <span className="text-glow font-light not-italic text-v-cyan">Neural Core.</span>
                    </h2>
                    <p className="text-v-muted text-xl leading-relaxed max-w-xl font-light">
                      AI-powered symptom triage with NLP understanding, risk scoring, and care levels (home care, clinic, ER).
                      Collect optional medical history, hold a multi-turn conversation, and sync summaries to the health dashboard—built for accessibility in low-connectivity settings.
                    </p>
                    <div className="flex gap-4">
                       <div className="p-4 rounded-2xl glass border-white/5 flex flex-col gap-1">
                          <span className="text-[9px] font-mono text-v-muted uppercase">Model</span>
                          <span className="text-xs font-bold text-v-cyan uppercase tracking-widest">Core_Ultra_v2</span>
                       </div>
                       <div className="p-4 rounded-2xl glass border-white/5 flex flex-col gap-1">
                          <span className="text-[9px] font-mono text-v-muted uppercase">Security</span>
                          <span className="text-xs font-bold text-v-emerald uppercase tracking-widest">Quantum_Locked</span>
                       </div>
                    </div>
                  </motion.div>
                </div>
                <div className="lg:w-1/2 w-full">
                  <AIAssistant />
                </div>
              </div>
            </section>

            <ClinicalHubSection />

            <section id="analytics" className="relative z-10 px-6 py-40 bg-white/[0.01]">
              <div className="max-w-7xl mx-auto mb-16">
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                 >
                    <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter italic uppercase">
                      Biological <span className="text-glow text-v-cyan font-light not-italic">Intelligence.</span>
                    </h2>
                    <p className="text-v-muted text-lg md:text-xl max-w-3xl font-light leading-relaxed mb-12">
                      Biological intelligence is the layer where raw vitals, symptoms, and context are fused into a coherent
                      picture of how your body is behaving—not a single number, but a trajectory. VITALIS turns streams from
                      biometrics, triage language, and organ-level scans into one interpretable state you can act on safely.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                      {[
                        {
                          title: "Signal fusion",
                          body: "BLE, camera rPPG, and local scan artifacts are normalized into comparable timelines so trends outweigh noise.",
                          icon: Activity,
                        },
                        {
                          title: "Semantic triage",
                          body: "Natural-language symptoms are mapped to risk-aware guidance with explicit fallbacks when the cloud link is down.",
                          icon: Brain,
                        },
                        {
                          title: "Closed-loop UX",
                          body: "Dashboards and alerts mirror the same protocol states you see in Protocol A1—boot, ingest, triage, escalate.",
                          icon: GitBranch,
                        },
                      ].map((card) => (
                        <div
                          key={card.title}
                          className="glass rounded-[32px] p-8 border border-white/5 text-left"
                        >
                          <card.icon className="w-8 h-8 text-v-cyan mb-4 opacity-80" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-white mb-3">{card.title}</h3>
                          <p className="text-v-muted text-sm font-light leading-relaxed">{card.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                       <p className="text-v-muted font-mono uppercase tracking-[0.3em] text-xs">Patient_Telemetry_Monitoring: Active</p>
                       <div className="h-px flex-1 bg-white/5" />
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-v-emerald animate-pulse" />
                          <span className="text-[10px] font-mono uppercase">Node_Sync_100%</span>
                       </div>
                    </div>
                 </motion.div>
              </div>
              <div className="max-w-7xl mx-auto px-6 space-y-8 mb-12">
                <ExtendedCareTools />
                <ShareReportPanel />
              </div>
              <HealthDashboard />
            </section>

            <YouTubeSection />

            {/* Safety/CTA Section */}
            <section id="safety" className="relative z-10 py-60 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-v-cyan/10 blur-[120px] -rotate-12 pointer-events-none" />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="max-w-4xl glass rounded-[60px] p-20 hologram-border shadow-2xl relative"
              >
                <div className="absolute top-10 left-10 opacity-10">
                   <Lock size={120} className="text-v-cyan" />
                </div>
                <Shield className="w-20 h-20 text-v-cyan mx-auto mb-10 animate-float" />
                <h2 className="text-5xl md:text-6xl font-black mb-8 italic tracking-tighter uppercase">Secure Your Future.</h2>
                <p className="text-v-muted text-xl mb-12 leading-relaxed max-w-2xl mx-auto font-light">
                  Join the elite 0.01% who manage their longevity through the world's most 
                  advanced AI-driven medical intelligence platform.
                </p>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-16 py-6 bg-v-cyan text-v-bg font-black rounded-[24px] hover:bg-v-blue hover:text-white transition-all shadow-xl tracking-[0.3em] uppercase text-sm"
                >
                  Request_Access_Invite
                </motion.button>
              </motion.div>
            </section>

            <footer className="relative z-10 py-32 px-6 border-t border-white/5 bg-black/50 backdrop-blur-3xl overflow-hidden">
              <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-20">
                <div className="col-span-2">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-v-cyan/10 flex items-center justify-center border border-v-cyan/20">
                      <Heart size={20} className="text-v-cyan" />
                    </div>
                    <h2 className="font-black text-2xl tracking-tighter uppercase italic leading-none">Vitalis<span className="text-v-cyan font-light not-italic">AI</span></h2>
                  </div>
                  <p className="text-v-muted text-lg max-w-sm leading-relaxed font-light">
                    The next evolution of biological monitoring. Neural synchronization for the 
                    modern human biological enterprise.
                  </p>
                </div>
                <div>
                  <h4 className="text-[11px] font-mono text-v-muted uppercase tracking-[0.4em] mb-10">Security</h4>
                  <ul className="space-y-4 text-sm font-light">
                    <li>HIPAA_LOCKED_v4</li>
                    <li>NEURAL_ENCRYPT</li>
                    <li>QUANTUM_SAFE</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[11px] font-mono text-v-muted uppercase tracking-[0.4em] mb-10">Status</h4>
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-v-emerald animate-pulse" />
                        <span className="text-xs font-mono uppercase tracking-widest text-v-text/60">Core_Engine: Online</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-v-blue animate-pulse" />
                        <span className="text-xs font-mono uppercase tracking-widest text-v-text/60">Sync_Node: Active</span>
                     </div>
                  </div>
                </div>
              </div>
              <div className="max-w-7xl mx-auto mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <p className="text-[10px] font-mono text-v-muted uppercase tracking-[0.3em]">© 2026 VITALIS INTELLIGENCE // ALL_RIGHTS_RESERVED</p>
                <div className="flex gap-10">
                   <span className="text-[10px] font-mono text-v-muted uppercase hover:text-white cursor-pointer tracking-widest">Privacy_Core</span>
                   <span className="text-[10px] font-mono text-v-muted uppercase hover:text-white cursor-pointer tracking-widest">Protocol_A1</span>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEmergencyMode && (
          <EmergencyOverlay onClose={() => setIsEmergencyMode(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProtocol && (
          <ProtocolModal onClose={() => setShowProtocol(false)} />
        )}
      </AnimatePresence>
    </main>
  );
}

function ProtocolModal({ onClose }: { onClose: () => void }) {
  const phases = [
    { id: "00", name: "Boot", detail: "Core integrity, CORS/API reachability, and local fallbacks armed before any PHI-adjacent path runs." },
    { id: "01", name: "Ingest", detail: "Biometric frames, triage transcripts, and holographic organ picks enter the same temporal buffer." },
    { id: "02", name: "Normalize", detail: "Signals are detrended, RR intervals extracted where available, and language symptoms de-noised for scoring." },
    { id: "03", name: "Triage", detail: "Risk posture is classified; cloud LLM augments when keys are present—otherwise deterministic clinical copy applies." },
    { id: "04", name: "Escalate", detail: "Critical biometrics raise Protocol Zero hooks (UI + emergency overlay) while preserving local-only storage." },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-v-bg/95 backdrop-blur-2xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass w-full max-w-5xl p-10 md:p-12 rounded-[48px] border-white/10 relative overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-8 right-8 p-4 rounded-2xl glass hover:bg-white/5 transition-all text-v-muted hover:text-white z-10"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10 pr-14">
          <div className="w-16 h-16 rounded-3xl bg-v-cyan/10 flex items-center justify-center border border-v-cyan/20 shrink-0">
            <Database className="text-v-cyan" size={32} />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase leading-tight">
              Protocol <span className="text-v-cyan font-light not-italic">A1 — Overview</span>
            </h2>
            <p className="text-v-muted text-sm font-mono uppercase tracking-[0.35em] mt-2">System_Documentation_v4.0.2 // Clinical_OS</p>
          </div>
        </div>

        <p className="text-v-muted text-base md:text-lg font-light leading-relaxed mb-12 max-w-4xl">
          Protocol A1 is the operational contract for VITALIS: how data enters the stack, when intelligence is allowed to be
          probabilistic versus deterministic, and how privacy defaults stay on-device unless you explicitly wire a backend.
          Biological intelligence (below) is the consumer-facing name for the fused output of these phases.
        </p>

        <div className="flex items-center gap-3 mb-6">
          <Layers className="text-v-cyan w-5 h-5" />
          <h3 className="text-xs font-mono uppercase tracking-[0.35em] text-v-cyan font-bold">Pipeline_Phases</h3>
        </div>
        <div className="space-y-4 mb-14">
          {phases.map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5"
            >
              <span className="text-[11px] font-mono text-v-cyan shrink-0 w-12">{p.id}</span>
              <div>
                <span className="text-sm font-bold uppercase tracking-wide text-white">{p.name}</span>
                <p className="text-v-muted text-sm font-light leading-relaxed mt-1">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-10 mb-12">
          <div className="space-y-4">
            <h3 className="text-v-cyan font-bold uppercase tracking-widest text-xs">Neural_Sync_Architecture</h3>
            <p className="text-v-muted font-light leading-relaxed text-sm">
              The Vitalis Core uses a split-brain pattern: edge UI for biometrics and holographics, optional FastAPI + Gemini
              for richer triage JSON, and IndexedDB for scan archives. Nothing in A1 assumes wearables—you can run fully local.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-v-cyan font-bold uppercase tracking-widest text-xs">Privacy_&_Security_Posture</h3>
            <p className="text-v-muted font-light leading-relaxed text-sm">
              Browser permissions gate BLE and camera. Env files stay out of git. Emergency overlays are UI-level signals unless
              you integrate real dispatch—treat this stack as a high-fidelity demo unless hardened for production compliance.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-v-cyan font-bold uppercase tracking-widest text-xs">Emergency_Response_Gating</h3>
            <p className="text-v-muted font-light leading-relaxed text-sm">
              Critical scan modes emit <span className="font-mono text-v-cyan/80">v-emergency-trigger</span> events so the HUD can
              synchronize without polling. Escalation copy is cinematic by design—swap for your org&apos;s real runbooks when moving past demo.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-v-cyan font-bold uppercase tracking-widest text-xs">Biological_Intelligence_Link</h3>
            <p className="text-v-muted font-light leading-relaxed text-sm">
              Once phases 01–03 complete, the analytics surface shows fused readiness, HRV summaries, and narrative triage—the
              &quot;so what&quot; layer operators read first. That is the biological intelligence contract exposed to users.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 p-6 rounded-3xl bg-v-cyan/5 border border-v-cyan/10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-mono text-v-cyan uppercase">System_Load</span>
              <span className="text-[10px] font-mono text-v-cyan">14.2%</span>
            </div>
            <div className="h-1 w-full bg-v-cyan/10 rounded-full overflow-hidden">
              <div className="h-full bg-v-cyan w-[14.2%]" />
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="sm:w-64 py-6 bg-v-cyan text-v-bg font-black rounded-3xl hover:bg-v-blue hover:text-white transition-all uppercase tracking-[0.2em] text-xs shrink-0"
          >
            Acknowledge_Protocol
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
