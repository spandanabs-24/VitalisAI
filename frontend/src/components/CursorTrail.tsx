"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

export default function CursorTrail() {
  const [mounted, setMounted] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Primary Dot */}
      <motion.div
        className="fixed w-2 h-2 bg-v-cyan rounded-full shadow-[0_0_15px_rgba(0,212,255,1)]"
        style={{ x: cursorXSpring, y: cursorYSpring, translateX: "-50%", translateY: "-50%" }}
      />
      
      {/* HUD Scanner Circle */}
      <motion.div
        className="fixed w-40 h-40 border border-v-cyan/20 rounded-full"
        style={{ 
          x: cursorXSpring, 
          y: cursorYSpring, 
          translateX: "-50%", 
          translateY: "-50%"
        }}
        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      >
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-2 bg-v-cyan" />
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-2 bg-v-cyan" />
         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-px bg-v-cyan" />
         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-px bg-v-cyan" />
      </motion.div>

      {/* Floating Coordinates */}
      <motion.div
        className="fixed font-mono text-[8px] text-v-cyan/40"
        style={{ x: cursorXSpring, y: cursorYSpring, translateX: 30, translateY: 30 }}
      >
        SCAN_X_{coords.x}<br />
        SCAN_Y_{coords.y}<br />
        V_SYS_402
      </motion.div>
      
      {/* Background Glow */}
      <motion.div
        className="fixed w-96 h-96 bg-v-cyan/5 blur-[100px] rounded-full"
        style={{ x: cursorXSpring, y: cursorYSpring, translateX: "-50%", translateY: "-50%" }}
      />
    </div>
  );
}
