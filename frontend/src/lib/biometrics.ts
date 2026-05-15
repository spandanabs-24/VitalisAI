"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export interface BiometricReading {
  heartRate: number;
  rrIntervals: number[];
  timestamp: number;
  source: "bluetooth" | "camera" | "digital";
  confidence: number;
}

export interface ScanReport {
  id: string;
  date: string;
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  hrvScore: number;
  readinessScore: number;
  duration: number;
  readings: BiometricReading[];
  selectedOrgan: string | null;
  organHealth: Record<string, number>;
}

// --- Web Bluetooth Heart Rate Service ---
export function useBluetoothHR() {
  const [device, setDevice] = useState<any | null>(null);
  const [connected, setConnected] = useState(false);
  const [heartRate, setHeartRate] = useState(0);
  const [rrIntervals, setRrIntervals] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const characteristicRef = useRef<any | null>(null);

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const dev = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });
      setDevice(dev);

      const server = await dev.gatt!.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");
      characteristicRef.current = characteristic;

      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = (event.target as any).value!;
        const flags = value.getUint8(0);
        const is16Bit = (flags & 0x01) !== 0;
        const hr = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
        setHeartRate(hr);

        const hasRR = (flags & 0x10) !== 0;
        if (hasRR) {
          const rrs: number[] = [];
          let offset = is16Bit ? 3 : 2;
          while (offset < value.byteLength) {
            rrs.push(value.getUint16(offset, true));
            offset += 2;
          }
          setRrIntervals(rrs);
        }
      });

      setConnected(true);
      return true;
    } catch (err: any) {
      setError(err?.message || "Failed to connect to Bluetooth device");
      setConnected(false);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setConnected(false);
    setDevice(null);
    setHeartRate(0);
  }, [device]);

  return { connect, disconnect, connected, heartRate, rrIntervals, error, deviceName: device?.name };
}

// --- Camera-Based Heart Rate (rPPG) ---
export function useCameraHR() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [heartRate, setHeartRate] = useState(0);
  const [isCovered, setIsCovered] = useState(false);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const signalBuffer = useRef<number[]>([]);
  const frameRef = useRef<number>(0);

  const start = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    try {
      setError(null);
      videoRef.current = video;
      canvasRef.current = canvas;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 320, height: 240 },
      });
      video.srcObject = stream;
      await video.play();
      activeRef.current = true;
      setActive(true);
      signalBuffer.current = [];
      processFrames();
    } catch (err: any) {
      setError(err?.message || "Camera access denied");
    }
  }, []);

  const processFrames = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !activeRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const measure = () => {
      if (!videoRef.current || !canvasRef.current) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Focus on the forehead/cheeks (center of frame)
      const regionX = Math.floor(canvas.width * 0.25);
      const regionY = Math.floor(canvas.height * 0.2);
      const regionW = Math.floor(canvas.width * 0.5);
      const regionH = Math.floor(canvas.height * 0.4);

      const imageData = ctx.getImageData(regionX, regionY, regionW, regionH);
      const pixels = imageData.data;

      let greenSum = 0;
      let count = 0;
      for (let i = 1; i < pixels.length; i += 4) {
        greenSum += pixels[i];
        count++;
      }
      const avgGreen = greenSum / count;
      
      // Auto-trigger when lens is significantly darkened (finger covering lens)
      // We use a much lower threshold (25) to avoid false triggers from dim lighting
      setIsCovered(avgGreen < 25);

      // Moving average filter to remove high-frequency noise
      signalBuffer.current.push(avgGreen);
      if (signalBuffer.current.length > 400) signalBuffer.current.shift();

      // Estimate HR every 60 frames (2 seconds) using peak detection
      if (signalBuffer.current.length >= 120 && signalBuffer.current.length % 30 === 0) {
        const hr = estimateHRFromSignal(signalBuffer.current);
        if (hr > 45 && hr < 180) {
           // Smooth the HR value
           setHeartRate(prev => prev === 0 ? hr : prev * 0.7 + hr * 0.3);
        }
      }

      frameRef.current = requestAnimationFrame(measure);
    };

    frameRef.current = requestAnimationFrame(measure);
  }, [active]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setHeartRate(0);
  }, []);

  return { start, stop, active, heartRate, error, isCovered };
}

function estimateHRFromSignal(signal: number[]): number {
  if (signal.length < 60) return 0;
  
  // Detrend the signal
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  const detrended = signal.map(v => v - mean);
  
  // Autocorrelation to find periodic signal in noise
  const n = detrended.length;
  const acf = new Array(Math.floor(n / 2)).fill(0);
  
  for (let lag = 0; lag < acf.length; lag++) {
    for (let i = 0; i < n - lag; i++) {
      acf[lag] += detrended[i] * detrended[i + lag];
    }
  }
  
  // Find the first peak in ACF within the HR range (45 - 180 BPM)
  // 30 fps -> 45 BPM = 40 frames lag, 180 BPM = 10 frames lag
  let maxAcf = -Infinity;
  let bestLag = 0;
  
  for (let lag = 10; lag < Math.min(acf.length, 45); lag++) {
    // Check if it's a peak
    if (acf[lag] > acf[lag-1] && acf[lag] > acf[lag+1]) {
      if (acf[lag] > maxAcf) {
        maxAcf = acf[lag];
        bestLag = lag;
      }
    }
  }
  
  if (bestLag === 0) return 0;
  
  const fps = 30;
  return (fps / bestLag) * 60;
}

// --- HRV Calculator ---
export function computeHRV(rrIntervals: number[]): number {
  if (rrIntervals.length < 2) return 0;
  let sumSquaredDiff = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumSquaredDiff += diff * diff;
  }
  return Math.sqrt(sumSquaredDiff / (rrIntervals.length - 1)); // RMSSD
}

// --- Readiness Engine ---
export function computeReadiness(currentHR: number, currentHRV: number, baselineHR = 70, baselineHRV = 40): number {
  const hrDeviation = (baselineHR - currentHR) / baselineHR;
  const hrScore = Math.max(0, Math.min(100, 50 + hrDeviation * 100));
  const hrvDeviation = (currentHRV - baselineHRV) / baselineHRV;
  const hrvScore = Math.max(0, Math.min(100, 50 + hrvDeviation * 100));
  return Math.round(hrScore * 0.4 + hrvScore * 0.6);
}

// --- Report Storage (IndexedDB) ---
const DB_NAME = "vitalis_reports";
const STORE_NAME = "reports";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReport(report: ScanReport): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(report);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllReports(): Promise<ScanReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteReport(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
