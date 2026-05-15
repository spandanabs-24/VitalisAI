"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe2, RefreshCw, AlertCircle } from "lucide-react";

type OutbreakData = {
  source?: string;
  country?: string;
  active?: number;
  cases?: number;
  todayCases?: number;
  recovered?: number;
  deaths?: number;
  disclaimer?: string;
  error?: string;
};

export default function OutbreakPanel() {
  const [data, setData] = useState<OutbreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/outbreak", { cache: "no-store" });
      const j = (await r.json()) as OutbreakData;
      setData(j);
    } catch {
      setData({ error: "Network error", disclaimer: "Try again when online." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-[40px] p-8 border border-v-blue/20"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Globe2 className="text-v-blue" size={26} />
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight">Predictive outbreak analysis</h3>
            <p className="text-[10px] font-mono text-v-muted uppercase">India signal · public API proxy · situational trend</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className="p-2 rounded-xl glass hover:bg-white/5 text-v-muted">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && <p className="text-sm text-v-muted font-light">Loading public health signal…</p>}
      {!loading && data?.error && (
        <div className="flex items-start gap-2 text-amber-300 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{data.error}</span>
        </div>
      )}
      {!loading && !data?.error && data && (
        <div className="space-y-2 text-sm font-light">
          <p>
            <span className="font-mono text-[10px] text-v-muted uppercase">Active (reported)</span>{" "}
            <span className="text-xl font-black italic text-v-cyan tabular-nums">{data.active?.toLocaleString() ?? "—"}</span>
          </p>
          <p className="text-v-muted text-xs">
            Cases (cumulative): {data.cases?.toLocaleString() ?? "—"} · Today: {data.todayCases?.toLocaleString() ?? "—"}
          </p>
          <p className="text-[10px] text-v-muted leading-relaxed">{data.disclaimer}</p>
          <p className="text-[9px] font-mono text-v-muted/60">{data.source}</p>
        </div>
      )}
    </motion.div>
  );
}
