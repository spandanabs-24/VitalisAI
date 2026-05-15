"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, Loader2, Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || "/";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Sign-in failed");
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page min-h-screen bg-v-bg text-v-text flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass rounded-[32px] border border-white/10 p-10 shadow-2xl backdrop-blur-3xl"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-v-cyan to-v-blue flex items-center justify-center shadow-lg">
            <Heart className="w-7 h-7 text-v-bg" />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter uppercase italic leading-none">
              Vitalis<span className="text-v-cyan font-light not-italic">AI</span>
            </h1>
            <p className="text-[10px] font-mono text-v-muted uppercase tracking-[0.35em] mt-1">
              Sign in
            </p>
          </div>
        </div>

        {justRegistered && (
          <p className="mb-6 rounded-2xl border border-v-emerald/30 bg-v-emerald/10 px-4 py-3 text-sm text-v-emerald font-mono">
            Account created. Sign in with the email and password you chose.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-v-muted mb-2">
              Email
            </label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-v-text caret-v-cyan outline-none focus:border-v-cyan/50 focus:ring-1 focus:ring-v-cyan/30 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-v-muted mb-2">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-v-text caret-v-cyan outline-none focus:border-v-cyan/50 focus:ring-1 focus:ring-v-cyan/30 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-v-red font-mono" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-v-cyan to-v-blue text-v-bg font-bold py-3.5 text-sm uppercase tracking-widest hover:opacity-95 disabled:opacity-60 transition-opacity"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Enter platform
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-v-muted">
          New here?{" "}
          <Link
            href="/signup"
            className="text-v-cyan hover:underline font-mono text-xs uppercase tracking-widest"
          >
            Create an account
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-v-bg flex items-center justify-center auth-page">
          <Loader2 className="w-10 h-10 text-v-cyan animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
