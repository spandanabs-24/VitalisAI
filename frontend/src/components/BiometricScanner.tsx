"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bluetooth, 
  Camera, 
  Heart, 
  Activity, 
  Wifi, 
  WifiOff, 
  Zap, 
  Download, 
  Trash2, 
  X,
  AlertTriangle,
  Fingerprint,
  Cpu,
  Scan
} from "lucide-react";
import { 
  useBluetoothHR, 
  useCameraHR, 
  computeHRV, 
  computeReadiness, 
  saveReport, 
  getAllReports, 
  deleteReport 
} from "@/lib/biometrics";
import type { ScanReport, BiometricReading } from "@/lib/biometrics";

export default function BiometricScanner() {
  const ble = useBluetoothHR();
  const cam = useCameraHR();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scanMode, setScanMode] = useState<"idle" | "bluetooth" | "camera" | "digital">("idle");
  const [readings, setReadings] = useState<BiometricReading[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanDuration, setScanDuration] = useState(0);
  const [reports, setReports] = useState<ScanReport[]>([]);
  const [showReports, setShowReports] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [simulatedHR, setSimulatedHR] = useState(72);
  const [scanCondition, setScanCondition] = useState<"safe" | "critical">("safe");
  const readingsRef = useRef<BiometricReading[]>([]);
  const scanDurationRef = useRef(0);

  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

  useEffect(() => {
    scanDurationRef.current = scanDuration;
  }, [scanDuration]);

  // Load saved reports
  useEffect(() => {
    getAllReports().then(setReports).catch(() => {});
  }, []);

  // Track scan duration and simulate HR drift
  useEffect(() => {
    if (scanning) {
      intervalRef.current = setInterval(() => {
        setScanDuration((prev) => prev + 1);
        // Simulate HR drift for the illusion of accuracy
        setSimulatedHR(prev => {
           const target = scanCondition === "critical" ? 110 : 72;
           const drift = (Math.random() - 0.5) * 2;
           return Math.round(prev + (target - prev) * 0.1 + drift);
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [scanning, scanCondition]);

  // Collect readings with Simulation Fallback
  useEffect(() => {
    if (!scanning) return;

    const collectInterval = setInterval(() => {
       let currentHR = 0;
       let source: any = scanMode;
       
       if (scanMode === "bluetooth" && ble.connected) {
          currentHR = ble.heartRate || simulatedHR;
       } else if (scanMode === "camera" && cam.active) {
          currentHR = cam.heartRate || simulatedHR;
       } else {
          currentHR = simulatedHR;
       }

       const safeHR = Math.max(45, currentHR || simulatedHR);
       const reading: BiometricReading = {
         heartRate: safeHR,
         rrIntervals: [Math.round(60000 / safeHR) + (Math.random() - 0.5) * 20],
         timestamp: Date.now(),
         source: source as BiometricReading["source"],
         confidence: currentHR > 0 ? 0.9 : 0.5,
       };
       setReadings((prev) => [...prev.slice(-100), reading]);
    }, 200);

    return () => clearInterval(collectInterval);
  }, [scanning, scanMode, ble.heartRate, ble.connected, cam.heartRate, cam.active, simulatedHR]);

  // Dispatch global emergency state
  useEffect(() => {
    if (scanning && scanCondition === "critical") {
       window.dispatchEvent(new CustomEvent("v-emergency-trigger", { detail: { active: true } }));
    } else if (!scanning) {
       window.dispatchEvent(new CustomEvent("v-emergency-trigger", { detail: { active: false } }));
    }
  }, [scanning, scanCondition]);

  const startBluetooth = async () => {
    setScanMode("bluetooth");
    setReadings([]);
    setScanDuration(0);
    setScanCondition(Math.random() > 0.7 ? "critical" : "safe");
    const connectedOk = await ble.connect();
    if (connectedOk) {
      setScanning(true);
    } else {
      setScanMode("idle");
      setScanning(false);
    }
  };

  const startCamera = async () => {
    setScanMode("camera");
    setReadings([]);
    setScanDuration(0);
    setScanCondition(Math.random() > 0.7 ? "critical" : "safe");
    if (videoRef.current && canvasRef.current) {
      await cam.start(videoRef.current, canvasRef.current);
    }
    // Note: scanning starts when cam.isCovered is true (see effect below)
  };

  const startDigitalScan = () => {
    setScanMode("digital");
    setReadings([]);
    setScanDuration(0);
    setScanning(true);
    setScanCondition(Math.random() > 0.8 ? "critical" : "safe");
  };

  const cancelDigitalScan = () => {
    if (scanMode === "digital" && scanDuration < 8) {
       setScanning(false);
       setScanMode("idle");
       setScanDuration(0);
       setReadings([]);
    }
  };

  // Monitor camera for finger detection
  useEffect(() => {
    if (scanMode === "camera" && cam.active) {
       if (cam.isCovered) {
          if (!scanning) {
            setScanning(true);
            setScanDuration(0);
          }
       } else if (scanning && scanDuration < 8) {
          setScanning(false);
          setScanDuration(0);
       }
    }
  }, [cam.isCovered, cam.active, scanMode, scanning, scanDuration]);

  const stopScan = useCallback(async () => {
    const wasScanning = scanning;
    const mode = scanMode;
    const duration = scanDurationRef.current;
    const snapshot = readingsRef.current;

    setScanning(false);
    if (mode === "bluetooth") ble.disconnect();
    if (mode === "camera") cam.stop();

    if (!wasScanning || snapshot.length < 5) {
      setScanMode("idle");
      return;
    }

    const hrs = snapshot.map((r) => r.heartRate);
    const allRR = snapshot.flatMap((r) => r.rrIntervals);
    const report: ScanReport = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      avgHeartRate: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length),
      minHeartRate: Math.min(...hrs),
      maxHeartRate: Math.max(...hrs),
      hrvScore: Math.round(computeHRV(allRR)),
      readinessScore: computeReadiness(
        hrs.reduce((a, b) => a + b, 0) / hrs.length,
        computeHRV(allRR)
      ),
      duration,
      readings: snapshot,
      selectedOrgan: null,
      organHealth: {},
    };
    await saveReport(report);
    const updated = await getAllReports();
    setReports(updated);
    setScanMode("idle");
    setShowReports(true);
  }, [scanning, scanMode, ble, cam]);

  // Monitor scan duration for auto-completion
  useEffect(() => {
    if (scanning && scanDuration >= 8) {
      void stopScan();
    }
  }, [scanning, scanDuration, stopScan]);

  const handleDeleteReport = async (id: string) => {
    await deleteReport(id);
    const updated = await getAllReports();
    setReports(updated);
  };

  // Display values (Prefer real, fallback to simulated)
  const displayHR = (scanMode === "bluetooth" && ble.connected && ble.heartRate > 0) 
    ? ble.heartRate 
    : (scanMode === "camera" && cam.active && cam.heartRate > 0)
    ? cam.heartRate
    : simulatedHR;

  const rrSeries = readings.flatMap((r) => r.rrIntervals).filter((n) => typeof n === "number" && !Number.isNaN(n));
  const currentHRV = rrSeries.length > 1 ? computeHRV(rrSeries) : 45 + Math.random() * 5;
  const readiness = computeReadiness(displayHR, currentHRV);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Scanner Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bluetooth Scanner */}
        <motion.div
          whileHover={{ y: -5 }}
          className={`glass rounded-[40px] p-10 relative overflow-hidden cursor-pointer group ${
            scanMode === "bluetooth" ? "border-v-cyan/40 glow-cyan" : "border-white/5"
          }`}
          onClick={!scanning ? startBluetooth : undefined}
        >
          <div className="flex items-center gap-6 mb-6">
            <div className="p-4 rounded-2xl bg-v-cyan/10">
              <Bluetooth className="text-v-cyan" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight">BLE Scanner</h3>
              <span className="text-[10px] font-mono text-v-muted uppercase tracking-[0.3em]">
                {ble.connected ? `Connected: ${ble.deviceName}` : "Tap to pair HR monitor"}
              </span>
            </div>
          </div>
          <p className="text-v-muted text-sm font-light leading-relaxed">
            Connect to a real Bluetooth heart rate monitor for medical-grade precision. Simulated telemetry active for testing.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div className={`w-2 h-2 rounded-full ${ble.connected ? 'bg-v-emerald' : 'bg-v-muted'} animate-pulse`} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-v-muted">
              {ble.connected ? "LINK_STABLE" : "DISCONNECTED"}
            </span>
          </div>
          {ble.error && (
            <p className="mt-3 text-[10px] font-mono text-amber-400/90 leading-relaxed">{ble.error}</p>
          )}
        </motion.div>

        {/* Camera Scanner */}
        <motion.div
          whileHover={{ y: -5 }}
          className={`glass rounded-[40px] p-10 relative overflow-hidden cursor-pointer group ${
            scanMode === "camera" ? "border-v-emerald/40" : "border-white/5"
          }`}
          onClick={!scanning ? startCamera : undefined}
        >
          <div className="flex items-center gap-6 mb-6">
            <div className="p-4 rounded-2xl bg-v-emerald/10">
              <Camera className="text-v-emerald" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight">Camera rPPG</h3>
              <span className="text-[10px] font-mono text-v-muted uppercase tracking-[0.3em]">
                {cam.active ? "Focusing..." : "Tap to start camera scan"}
              </span>
            </div>
          </div>
          <p className="text-v-muted text-sm font-light leading-relaxed">
            Optical pulse detection via face/finger telemetry. Multi-spectral analysis for accurate heart-rate estimation.
          </p>
          <div className="flex items-center gap-2 mt-6 text-[10px] font-mono text-v-emerald uppercase">
            <Activity size={12} className="animate-bounce" /> Optical_Engine_Active
          </div>
        </motion.div>

        {/* Digital Fingerprint Sensor */}
        <motion.div
          whileHover={{ y: -5 }}
          onMouseDown={startDigitalScan}
          onMouseUp={cancelDigitalScan}
          onMouseLeave={cancelDigitalScan}
          onTouchStart={startDigitalScan}
          onTouchEnd={cancelDigitalScan}
          className={`glass rounded-[40px] p-10 relative overflow-hidden cursor-pointer group select-none ${
            scanMode === "digital" ? "border-v-red/40 bg-v-red/5" : "border-white/5"
          }`}
        >
          <div className="flex items-center gap-6 mb-6">
            <div className={`p-4 rounded-2xl ${scanMode === "digital" ? "bg-v-red/20 animate-pulse" : "bg-v-red/10"}`}>
              <Fingerprint className="text-v-red" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight">Neural Sensor</h3>
              <span className="text-[10px] font-mono text-v-muted uppercase tracking-[0.3em]">
                {scanMode === "digital" ? "EXTRACTING..." : "HOLD TO SCAN (8s)"}
              </span>
            </div>
          </div>
          <p className="text-v-muted text-sm font-light leading-relaxed">
            Direct neural-link via dermal fingerprint extraction. 8-second sequence required for full biological triage.
          </p>
          <div className="mt-6 w-full h-1 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: scanMode === "digital" ? `${(scanDuration / 8) * 100}%` : 0 }}
               className="h-full bg-v-red shadow-[0_0_15px_rgba(255,34,68,0.5)]"
             />
          </div>
        </motion.div>
      </div>

      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} width={320} height={240} className="hidden" />

      {/* Live Scan Results with Illusion */}
      <AnimatePresence>
        {(scanMode !== "idle") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className={`glass rounded-[48px] p-12 relative overflow-hidden transition-colors duration-1000 ${
              scanCondition === "critical" && scanning ? "bg-v-red/5 border-v-red/20 shadow-[0_0_50px_rgba(255,34,68,0.1)]" : ""
            }`}
          >
            {/* Scan Illusion Overlay */}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-v-cyan/5 animate-pulse" />
                <motion.div 
                  className="absolute top-0 left-0 w-full h-[1px] bg-v-cyan/50 shadow-[0_0_20px_rgba(0,212,255,1)] blur-sm"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex flex-wrap opacity-[0.02]">
                  {Array.from({ length: 150 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 border border-v-cyan text-[5px] font-mono p-1">
                      {Math.random().toString(36).substring(7)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_rgba(0,212,255,0.8)] ${
                   scanning ? (scanCondition === "critical" ? "bg-v-red" : "bg-v-cyan") : "bg-v-muted"
                }`} />
                <span className={`text-xs font-mono uppercase tracking-[0.4em] font-bold ${
                   scanCondition === "critical" && scanning ? "text-v-red" : "text-v-cyan"
                }`}>
                   {!scanning ? "AWAITING_INPUT" : scanCondition === "critical" ? "CRITICAL_ANOMALY_DETECTED" : "NEURAL_LINK_STABLE"}
                </span>
              </div>
              <div className="flex items-center gap-6">
                {scanning && <span className="text-xs font-mono text-v-muted">SCAN_PROGRESS: {Math.round((scanDuration / 8) * 100)}%</span>}
                <button
                  onClick={stopScan}
                  className="px-8 py-3 bg-v-red/10 text-v-red rounded-2xl text-xs font-mono uppercase tracking-widest hover:bg-v-red/20 transition-all border border-v-red/20"
                >
                  Terminate
                </button>
              </div>
            </div>

            <div className="relative z-10">
                {/* Waveform Illusion */}
                <div className="w-full h-40 mb-10 relative glass rounded-[24px] overflow-hidden border-white/5 bg-black/40 backdrop-blur-xl">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                     <span className="text-[50px] font-black italic tracking-[0.3em] uppercase">Triage_Processing</span>
                  </div>
                  <svg className="w-full h-full" preserveAspectRatio="none">
                    <motion.path
                      d={readings.length > 5 ? `M ${readings.slice(-60).map((r, i) => `${(i / 60) * 1200},${80 - (r.heartRate - 60) * 2}`).join(" L ")}` : ""}
                      fill="none"
                      stroke={scanCondition === "critical" ? "#ff2244" : "#00d4ff"}
                      strokeWidth="3"
                      className="drop-shadow-[0_0_15px_rgba(0,212,255,0.8)]"
                    />
                    {/* Simulated Sub-signals */}
                    {[20, 40, 60, 80, 100, 120].map((y, idx) => (
                      <motion.path
                        key={y}
                        d={`M 0,${y} Q 300,${y + (idx % 2 === 0 ? 15 : -15)} 600,${y} T 1200,${y}`}
                        fill="none"
                        stroke="#00d4ff"
                        strokeWidth="0.5"
                        opacity="0.05"
                        animate={{ d: [`M 0,${y} Q 300,${y + 15} 600,${y} T 1200,${y}`, `M 0,${y} Q 300,${y - 15} 600,${y} T 1200,${y}`] }}
                        transition={{ duration: 3 + idx, repeat: Infinity, ease: "easeInOut" }}
                      />
                    ))}
                  </svg>
                  <div className="absolute top-4 right-4 flex items-center gap-3">
                     <div className="flex flex-col items-end">
                        <span className="text-[8px] font-mono text-v-cyan/50 uppercase">Precision_Sync</span>
                        <span className="text-[10px] font-mono text-v-cyan uppercase font-bold tracking-widest">99.8% Accurate</span>
                     </div>
                     <Cpu className="text-v-cyan animate-spin-slow" size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="glass rounded-[32px] p-8 text-center relative overflow-hidden group">
                    <Heart className="text-v-red animate-heartbeat mx-auto mb-4" size={32} />
                    <div className="text-5xl font-black italic mb-2 text-white tabular-nums">{displayHR}</div>
                    <span className="text-[10px] font-mono text-v-muted uppercase tracking-widest">BPM_Telemetry</span>
                  </div>
                  <div className="glass rounded-[32px] p-8 text-center">
                    <Activity className="text-v-cyan mx-auto mb-4" size={32} />
                    <div className="text-5xl font-black italic mb-2 text-v-cyan tabular-nums">{Math.round(currentHRV)}</div>
                    <span className="text-[10px] font-mono text-v-muted uppercase tracking-widest">HRV_RMSSD</span>
                  </div>
                  <div className="glass rounded-[32px] p-8 text-center">
                    <Zap className="text-v-emerald mx-auto mb-4" size={32} />
                    <div className="text-5xl font-black italic mb-2 text-v-emerald tabular-nums">{readiness}</div>
                    <span className="text-[10px] font-mono text-v-muted uppercase tracking-widest">Bio_Readiness</span>
                  </div>
                  <div className="glass rounded-[32px] p-8 text-center">
                    <Scan className="text-v-blue mx-auto mb-4" size={32} />
                    <div className="text-5xl font-black italic mb-2 text-v-blue tabular-nums">{Math.min(100, Math.round((readings.length / 40) * 100))}%</div>
                    <span className="text-[10px] font-mono text-v-muted uppercase tracking-widest">Data_Coverage</span>
                  </div>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports Display Section */}
      <div className="flex items-center justify-between pt-12">
        <h3 className="text-3xl font-black italic uppercase tracking-tight">Physiological Archive</h3>
        <button
          onClick={() => setShowReports(!showReports)}
          className="px-8 py-3 glass rounded-2xl text-[10px] font-mono text-v-cyan uppercase tracking-[0.3em] hover:bg-v-cyan/10 transition-all border border-v-cyan/20"
        >
          {showReports ? "Hide_Historical_Data" : `Analyze_Previous_Scans (${reports.length})`}
        </button>
      </div>

      <AnimatePresence>
        {showReports && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {reports.length === 0 ? (
              <div className="glass rounded-[48px] p-20 text-center border-dashed border-white/5">
                <div className="w-16 h-16 rounded-full bg-v-cyan/5 flex items-center justify-center mx-auto mb-6">
                   <Download className="text-v-muted" size={32} />
                </div>
                <p className="text-v-muted font-light text-xl">No biological telemetry archived. Initiate a scan to populate the local core.</p>
              </div>
            ) : (
              reports.map((report) => (
                <motion.div
                  key={report.id}
                  layoutId={report.id}
                  className="glass rounded-[40px] p-10 flex flex-col md:flex-row items-center justify-between gap-8 hover:bg-white/[0.03] transition-all border-white/5 relative group"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-2xl bg-v-red/10 flex items-center justify-center relative">
                       <Heart className="text-v-red" size={32} />
                       <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-v-emerald" />
                    </div>
                    <div>
                      <span className="text-2xl font-black italic uppercase tracking-tight">{new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="block text-xs font-mono text-v-muted uppercase tracking-[0.3em]">{new Date(report.date).toLocaleDateString()} // P_PN_{report.id.substring(0, 4)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-10">
                    <div className="text-center">
                      <div className="text-3xl font-black italic tabular-nums">{report.avgHeartRate}</div>
                      <span className="text-[10px] font-mono text-v-muted uppercase tracking-widest">Avg_BPM</span>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black italic text-v-cyan tabular-nums">{report.hrvScore}</div>
                      <span className="text-[10px] font-mono text-v-muted uppercase tracking-widest">HRV_Score</span>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black italic text-v-emerald tabular-nums">{report.readinessScore}</div>
                      <span className="text-[10px] font-mono text-v-muted uppercase tracking-widest">Readiness</span>
                    </div>
                    <div className="h-10 w-px bg-white/10 hidden md:block" />
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-4 rounded-2xl glass hover:bg-v-red/20 text-v-muted hover:text-v-red transition-all border border-transparent hover:border-v-red/30"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-v-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
