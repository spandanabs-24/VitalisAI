"use client";

import { motion } from "framer-motion";
import { Brain, Zap, Shield, Globe, Activity, HeartPulse, Cpu, Lock } from "lucide-react";

const features = [
  {
    title: "AI Symptom Triage",
    desc: "NLP medical conversation, risk scoring, emergency detection, and home / clinic / ER care recommendations with multi-turn follow-up.",
    icon: Brain,
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "Predictive Triage",
    desc: "Advanced early detection systems identifying anomalies before manifestation.",
    icon: Zap,
    color: "from-blue-500 to-indigo-500",
  },
  {
    title: "Biometric Security",
    desc: "Quantum-locked decentralized data storage for hyper-secure health records.",
    icon: Shield,
    color: "from-emerald-500 to-cyan-500",
  },
  {
    title: "Global Sync",
    desc: "Instant synchronization with the worldwide VITALIS clinical network.",
    icon: Globe,
    color: "from-purple-500 to-indigo-500",
  },
  {
    title: "Live Monitoring",
    desc: "High-fidelity telemetry streams directly into your personal health core.",
    icon: Activity,
    color: "from-rose-500 to-orange-500",
  },
  {
    title: "Longevity Optimization",
    desc: "Personalized AI guidance designed to maximize human biological potential.",
    icon: HeartPulse,
    color: "from-amber-500 to-yellow-500",
  },
];

export default function FeatureSection() {
  return (
    <section className="relative py-40 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24"
        >
          <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter italic uppercase">
            Engineered For <br />
            <span className="text-glow font-light not-italic text-v-cyan">Biological Excellence.</span>
          </h2>
          <p className="text-v-muted text-xl max-w-2xl mx-auto font-light leading-relaxed">
            VITALIS AI integrates the most advanced neural technologies to create the 
            world's first predictive healthcare operating system.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className="group glass p-10 rounded-[48px] hologram-border relative overflow-hidden"
            >
              <div className={`w-16 h-16 rounded-[24px] bg-gradient-to-br ${feature.color} p-[1px] mb-8 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                <div className="w-full h-full bg-[#020408] rounded-[23px] flex items-center justify-center">
                  <feature.icon className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-4 tracking-tight italic uppercase">{feature.title}</h3>
              <p className="text-v-muted text-sm leading-relaxed font-light">
                {feature.desc}
              </p>

              <div className="mt-8 flex items-center gap-3">
                 <span className="text-[10px] font-mono text-v-cyan tracking-[0.4em] uppercase font-bold">System_Linked</span>
                 <div className="h-px flex-1 bg-v-cyan/10" />
                 <div className="w-1.5 h-1.5 rounded-full bg-v-cyan animate-pulse shadow-[0_0_8px_rgba(0,212,255,1)]" />
              </div>

              {/* Decorative Glow */}
              <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br ${feature.color} blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700`} />
            </motion.div>
          ))}
        </div>

        {/* Technology Reveal Section */}
        <div className="mt-60 grid lg:grid-cols-2 gap-20 items-center">
           <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
           >
              <div className="aspect-square glass rounded-[80px] flex items-center justify-center relative overflow-hidden group shadow-2xl">
                 <Cpu className="w-48 h-48 text-v-cyan opacity-10 group-hover:opacity-30 group-hover:scale-110 transition-all duration-1000" />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.1)_0%,transparent_70%)]" />
                 <div className="absolute top-0 left-0 w-full h-full hud-grid opacity-10" />
              </div>
              {/* Floating Node */}
              <motion.div 
                 animate={{ y: [0, -20, 0] }}
                 transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute -top-10 -right-10 glass p-8 rounded-[40px] hologram-border shadow-2xl backdrop-blur-3xl"
              >
                 <Globe className="text-v-cyan mb-2 animate-spin-slow" size={32} />
                 <span className="text-[10px] font-mono uppercase tracking-[0.4em] font-bold text-white/50">Global_Link</span>
              </motion.div>
           </motion.div>
           
           <div className="space-y-10">
              <h2 className="text-5xl font-black italic tracking-tighter leading-[0.9] uppercase">The Architecture of <span className="text-glow font-light not-italic text-v-cyan">Longevity.</span></h2>
              <p className="text-v-muted text-xl font-light leading-relaxed">
                 Our proprietary neural architecture scales across billions of parameters to synthesize
                 a comprehensive map of human biological performance.
              </p>
              <div className="space-y-6">
                 {[
                   { label: "Quantum Data Layer", icon: Lock },
                   { label: "Semantic Symptom Mapping", icon: Brain },
                   { label: "Real-time Neural Sync", icon: Zap }
                 ].map((tech, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ x: 10 }}
                      className="flex items-center gap-6 p-6 rounded-[32px] glass border-white/5 group hover:border-v-cyan/30 transition-all cursor-default"
                    >
                       <div className="p-3 rounded-2xl bg-v-cyan/10">
                          <tech.icon className="w-5 h-5 text-v-cyan" />
                       </div>
                       <span className="text-lg font-bold tracking-tight italic uppercase">{tech.label}</span>
                    </motion.div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}
