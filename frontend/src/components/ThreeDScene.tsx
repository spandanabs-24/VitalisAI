"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  Float, 
  MeshDistortMaterial, 
  Sphere, 
  Points, 
  PointMaterial
} from "@react-three/drei";
import * as THREE from "three";

function NeuralCore() {
  const mesh = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.x = Math.cos(t / 4) / 2;
    mesh.current.rotation.y = Math.sin(t / 4) / 2;
    mesh.current.rotation.z = Math.sin(t / 1.5) / 10;
    mesh.current.position.y = Math.sin(t / 1.5) / 10;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={mesh} args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#00d4ff"
          speed={3}
          distort={0.4}
          radius={1}
          emissive="#0066ff"
          emissiveIntensity={2}
          roughness={0}
          metalness={1}
          transparent
          opacity={0.6}
        />
      </Sphere>
      {/* Outer Shell */}
      <Sphere args={[1.2, 64, 64]}>
        <meshStandardMaterial
          color="#00d4ff"
          wireframe
          transparent
          opacity={0.1}
        />
      </Sphere>
    </Float>
  );
}

function MedicalParticles({ count = 2000 }) {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 15;
      p[i * 3 + 1] = (Math.random() - 0.5) * 15;
      p[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return p;
  }, [count]);

  const ref = useRef<THREE.Points>(null!);
  useFrame((state) => {
    ref.current.rotation.y += 0.001;
    ref.current.rotation.z += 0.0005;
  });

  return (
    <Points ref={ref} positions={points} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00d4ff"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function RotatingRings() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    ref.current.rotation.z = t * 0.1;
  });

  return (
    <group ref={ref}>
      {[2.5, 3, 3.5].map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius, radius + 0.02, 128]} />
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0.2 - i * 0.05}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function ThreeDScene() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <Canvas camera={{ position: [0, 0, 8], fov: 35 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00d4ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0066ff" />
        
        <NeuralCore />
        <MedicalParticles count={3000} />
        <RotatingRings />

        <fog attach="fog" args={["#020408", 5, 20]} />
      </Canvas>
    </div>
  );
}
