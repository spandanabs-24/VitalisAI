"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, Trash2, Clock } from "lucide-react";

import { loadPatientContextSnapshot } from "@/lib/triagePersistence";

const STORAGE = "VITALIS_MED_REMINDERS_v1";

type Reminder = { id: string; name: string; time: string; enabled: boolean };

function load(): Reminder[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return [];
    return JSON.parse(raw) as Reminder[];
  } catch {
    return [];
  }
}

function save(list: Reminder[]) {
  localStorage.setItem(STORAGE, JSON.stringify(list));
}

export default function MedicationReminders() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [name, setName] = useState("");
  const [time, setTime] = useState("09:00");
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setItems(load());
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    else setPerm("unsupported");
  }, []);

  const requestNotif = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  const add = () => {
    if (!name.trim()) return;
    const next = [...items, { id: crypto.randomUUID(), name: name.trim(), time, enabled: true }];
    setItems(next);
    save(next);
    setName("");
  };

  const remove = (id: string) => {
    const next = items.filter((x) => x.id !== id);
    setItems(next);
    save(next);
  };

  const firedRef = useRef(new Set<string>());

  const tick = useCallback(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const key = `${hh}:${mm}`;
    items.forEach((r) => {
      if (!r.enabled || r.time !== key) return;
      const sig = `${r.id}-${now.toDateString()}-${key}`;
      if (firedRef.current.has(sig)) return;
      firedRef.current.add(sig);
      if (perm === "granted" && typeof Notification !== "undefined") {
        new Notification("VITALIS — Medication reminder", { body: r.name, tag: sig });
      }
    });
  }, [items, perm]);

  useEffect(() => {
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [tick]);

  const importFromProfile = () => {
    const ctx = loadPatientContextSnapshot();
    const raw = ctx?.medications?.trim();
    if (!raw) return;
    const names = raw
      .split(/[,;\n]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (names.length === 0) return;
    const existing = new Set(items.map((i) => i.name.toLowerCase()));
    const next = [...items];
    for (const name of names) {
      if (existing.has(name.toLowerCase())) continue;
      existing.add(name.toLowerCase());
      next.push({ id: crypto.randomUUID(), name, time: "09:00", enabled: true });
    }
    setItems(next);
    save(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass rounded-[40px] p-8 border border-white/10"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="text-v-emerald" size={26} />
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tight">Medication reminders</h3>
            <p className="text-[10px] font-mono text-v-muted uppercase">Local browser · time match · import from triage profile</p>
          </div>
        </div>
        {perm !== "unsupported" && perm !== "granted" && (
          <button type="button" onClick={requestNotif} className="text-[10px] font-mono uppercase text-v-cyan border border-v-cyan/30 px-3 py-2 rounded-xl hover:bg-v-cyan/10">
            Enable notifications
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Medication name"
          className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm"
        />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm w-36" />
        <button type="button" onClick={add} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-v-emerald/20 text-v-emerald border border-v-emerald/30 text-xs font-mono uppercase">
          <Plus size={16} />
          Add
        </button>
        <button
          type="button"
          onClick={importFromProfile}
          title="Uses medications from the triage patient profile (saved in this browser)"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-v-cyan/25 text-v-cyan text-xs font-mono uppercase hover:bg-v-cyan/10"
        >
          Import from profile
        </button>
      </div>

      <ul className="space-y-3">
        {items.length === 0 && <li className="text-sm text-v-muted font-light">No reminders yet.</li>}
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <Clock size={16} className="text-v-cyan shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-[10px] font-mono text-v-muted">{r.time} local</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-[10px] font-mono text-v-muted uppercase flex items-center gap-1">
                <input type="checkbox" checked={r.enabled} onChange={() => {
                  const next = items.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x));
                  setItems(next);
                  save(next);
                }} />
                On
              </label>
              <button type="button" onClick={() => remove(r.id)} className="p-2 rounded-lg hover:bg-v-red/10 text-v-muted hover:text-v-red">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
