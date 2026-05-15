"use client";

import { useRef, useState, useMemo, useLayoutEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  Float, 
  MeshDistortMaterial, 
  Sphere, 
  OrbitControls, 
  PerspectiveCamera, 
  Text,
  Html,
  ContactShadows,
  PresentationControls
} from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Brain, Heart, Zap, ShieldAlert, Thermometer, Droplets } from "lucide-react";

// --- Types ---
interface OrganData {
  id: string;
  name: string;
  pos: [number, number, number];
  color: string;
  health: number;
  risk: "Low" | "Moderate" | "High" | "Critical";
  desc: string;
  icon: any;
}

const ORGANS: OrganData[] = [
  { id: "brain", name: "Neural Core", pos: [0, 1.8, 0], color: "#00d4ff", health: 98, risk: "Low", desc: "Cognitive synchronization at optimal levels. No neural anomalies detected.", icon: Brain },
  { id: "heart", name: "Cardiac Engine", pos: [0, 1.0, 0.2], color: "#ff2244", health: 72, risk: "Moderate", desc: "Slight elevation in cardiovascular load detected during high-stress simulation.", icon: Heart },
  { id: "lungs", name: "O2 Processor", pos: [0, 1.1, -0.1], color: "#00ff88", health: 94, risk: "Low", desc: "Oxygen saturation optimal. Respiratory efficiency at 98.4%.", icon: Zap },
  { id: "liver", name: "Metabolic Filter", pos: [0.3, 0.5, 0.1], color: "#ffaa00", health: 88, risk: "Low", desc: "Detoxification cycles normal. Enzymatic levels within nominal range.", icon: Activity },
  { id: "stomach", name: "Energy Reactor", pos: [-0.2, 0.4, 0.2], color: "#0066ff", health: 65, risk: "Moderate", desc: "Digestive acidity spike detected. Nutritional absorption efficiency decreased.", icon: Droplets },
];


declare global {
  namespace React {
    namespace JSX {
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface IntrinsicElements {
        ambientLight: any;
        pointLight: any;
        spotLight: any;
        mesh: any;
        group: any;
        sphereGeometry: any;
        cylinderGeometry: any;
        ringGeometry: any;
        meshStandardMaterial: any;
        meshBasicMaterial: any;
        fog: any;
      }
    }
  }
}

function OrganNode({ organ, isSelected, onClick }: { organ: OrganData, isSelected: boolean, onClick: () => void }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.scale.setScalar(isSelected ? 1.5 + Math.sin(t * 3) * 0.1 : 1 + (hovered ? 0.2 : 0));
    }
  });

  return (
    <group position={organ.pos}>
      <Sphere 
        ref={mesh} 
        args={[0.15, 32, 32]} 
        onClick={(e: any) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={organ.color}
          emissive={organ.color}
          emissiveIntensity={isSelected || hovered ? 5 : 1}
          transparent
          opacity={0.8}
        />
      </Sphere>
      
      {/* Label */}
      {(hovered || isSelected) && (
        <Html distanceFactor={10} position={[0.3, 0, 0]}>
          <div className="glass px-3 py-1 rounded-lg border-v-cyan/20 whitespace-nowrap">
            <span className="text-[10px] font-mono text-v-cyan uppercase tracking-widest">{organ.name}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function StylizedHumanBody() {
  const group = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Mesh>(null!);
  const chest = useRef<THREE.Mesh>(null!);
  const leftArm = useRef<THREE.Mesh>(null!);
  const rightArm = useRef<THREE.Mesh>(null!);

  useLayoutEffect(() => {
    const grp = group.current;
    if (!grp) return;
    grp.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).raycast = () => {};
      }
    });
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // Floating motion
    group.current.position.y = Math.sin(t / 2) / 10;
    group.current.rotation.y = Math.sin(t / 4) / 10;

    // Breathing motion (chest expansion)
    if (chest.current) {
      const breath = 1 + Math.sin(t * 1.5) * 0.02;
      chest.current.scale.set(breath, 1, breath);
    }

    // Subtle head movement
    if (head.current) {
      head.current.rotation.x = Math.sin(t) * 0.05;
      head.current.rotation.z = Math.cos(t / 2) * 0.05;
    }

    // Subtle arm sway
    if (leftArm.current) leftArm.current.rotation.z = 0.3 + Math.sin(t) * 0.05;
    if (rightArm.current) rightArm.current.rotation.z = -0.3 - Math.sin(t) * 0.05;
  });

  return (
    <group ref={group}>
      {/* Head */}
      <mesh ref={head} position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#00d4ff" wireframe transparent opacity={0.1} />
      </mesh>
      {/* Torso / Chest */}
      <mesh ref={chest} position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.4, 0.3, 1.4, 32]} />
        <meshStandardMaterial color="#00d4ff" wireframe transparent opacity={0.1} />
      </mesh>
      {/* Arms */}
      <mesh ref={rightArm} position={[0.6, 1.0, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.1, 0.08, 1.2, 32]} />
        <meshStandardMaterial color="#00d4ff" wireframe transparent opacity={0.1} />
      </mesh>
      <mesh ref={leftArm} position={[-0.6, 1.0, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.1, 0.08, 1.2, 32]} />
        <meshStandardMaterial color="#00d4ff" wireframe transparent opacity={0.1} />
      </mesh>
      {/* Legs */}
      <mesh position={[0.2, -0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 1.5, 32]} />
        <meshStandardMaterial color="#00d4ff" wireframe transparent opacity={0.1} />
      </mesh>
      <mesh position={[-0.2, -0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 1.5, 32]} />
        <meshStandardMaterial color="#00d4ff" wireframe transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

export default function HumanBodyScene() {
  const [selectedOrgan, setSelectedOrgan] = useState<OrganData | null>(null);

  return (
    <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center p-6 gap-12">
      {/* 3D Viewport */}
      <div className="w-full lg:w-3/5 h-[500px] lg:h-[800px] glass rounded-[60px] relative overflow-hidden group">
        <div className="absolute top-10 left-10 z-10">
           <div className="flex items-center gap-3 glass px-6 py-3 rounded-2xl border-v-cyan/20">
              <div className="w-2 h-2 rounded-full bg-v-cyan animate-pulse shadow-[0_0_10px_rgba(0,212,255,1)]" />
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-v-cyan">Bio_Scanner_Active</span>
           </div>
        </div>

        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#00d4ff" />
          <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#0066ff" />
          
          <PresentationControls
            global
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 1500 }}
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 3, Math.PI / 3]}
            azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
          >
            <StylizedHumanBody />
            {ORGANS.map((organ) => (
              <OrganNode 
                key={organ.id} 
                organ={organ} 
                isSelected={selectedOrgan?.id === organ.id}
                onClick={() => setSelectedOrgan(organ)}
              />
            ))}
          </PresentationControls>

          <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2} far={4.5} />
          <fog attach="fog" args={["#020408", 5, 15]} />
        </Canvas>

        {/* HUD Elements */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="hud-grid absolute inset-0 opacity-10" />
           <div className="absolute top-1/2 left-0 w-full h-px bg-v-cyan/10" />
           <div className="absolute left-1/2 top-0 w-px h-full bg-v-cyan/10" />
           <div className="scanline" />
        </div>
      </div>

      {/* Diagnostic Panel */}
      <div className="w-full lg:w-2/5 space-y-6">
        <AnimatePresence mode="wait">
          {selectedOrgan ? (
            <motion.div
              key={selectedOrgan.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass rounded-[48px] p-10 border-v-cyan/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                 <selectedOrgan.icon className="w-12 h-12 text-v-cyan opacity-20" />
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className={`p-4 rounded-2xl bg-white/5`} style={{ color: selectedOrgan.color }}>
                  <selectedOrgan.icon size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase">{selectedOrgan.name}</h3>
                  <span className="text-[10px] font-mono text-v-muted uppercase tracking-[0.4em]">Organ_ID: {selectedOrgan.id.toUpperCase()}</span>
                </div>
              </div>

              <p className="text-v-muted text-lg font-light leading-relaxed mb-10">
                {selectedOrgan.desc}
              </p>

              <div className="grid grid-cols-2 gap-6 mb-10">
                 <div className="glass p-6 rounded-3xl border-white/5">
                    <span className="text-[10px] font-mono text-v-muted uppercase block mb-2">Health_Index</span>
                    <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-black italic" style={{ color: selectedOrgan.color }}>{selectedOrgan.health}%</span>
                       <span className="text-[10px] font-mono text-v-emerald uppercase tracking-widest">Nominal</span>
                    </div>
                 </div>
                 <div className="glass p-6 rounded-3xl border-white/5">
                    <span className="text-[10px] font-mono text-v-muted uppercase block mb-2">Risk_Level</span>
                    <div className="flex items-center gap-2">
                       <ShieldAlert size={20} className={selectedOrgan.risk === "Low" ? "text-v-emerald" : "text-v-red"} />
                       <span className={`text-xl font-bold uppercase tracking-widest ${selectedOrgan.risk === "Low" ? "text-v-emerald" : "text-v-red"}`}>{selectedOrgan.risk}</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between text-[10px] font-mono text-v-muted uppercase mb-1">
                    <span>Diagnostic_Sync</span>
                    <span>{selectedOrgan.health}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${selectedOrgan.health}%` }}
                       className="h-full bg-v-cyan"
                    />
                 </div>
              </div>

              <button 
                onClick={() => setSelectedOrgan(null)}
                className="mt-12 w-full py-5 glass rounded-2xl text-[10px] font-mono uppercase tracking-[0.4em] hover:bg-v-cyan/10 hover:text-v-cyan transition-all"
              >
                Reset_Scanner
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-[48px] p-12 text-center border-white/5"
            >
              <div className="w-20 h-20 rounded-full bg-v-cyan/5 flex items-center justify-center mx-auto mb-8 border border-v-cyan/10">
                 <Activity className="text-v-cyan animate-pulse" size={32} />
              </div>
              <h3 className="text-2xl font-bold italic mb-4 uppercase">Neural Biometric Scanner</h3>
              <p className="text-v-muted font-light leading-relaxed mb-8">
                Select an anatomical node on the holographic body to initiate real-time organ diagnostics and neural telemetry analysis.
              </p>
              <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                 ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
