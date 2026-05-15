"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { getConfiguredYouTubeVideos } from "@/lib/youtubeVideos";

export default function YouTubeSection() {
  const videos = useMemo(() => getConfiguredYouTubeVideos(), []);

  return (
    <section id="videos" className="relative z-10 px-6 py-24 bg-black/25 border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-v-red/10 border border-v-red/20 flex items-center justify-center">
              <Play className="text-v-red fill-v-red/30" size={22} />
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
              YouTube <span className="text-glow text-v-cyan font-light not-italic">library.</span>
            </h2>
          </div>
          <p className="text-v-muted text-sm md:text-base max-w-2xl mb-10 font-light leading-relaxed">
            Embedded players use YouTube&apos;s privacy-enhanced domain. Add your own clips via environment variables—ideal
            for telehealth explainers, onboarding, or partner education.
          </p>

          {videos.length === 0 ? (
            <div className="glass rounded-3xl p-8 border border-white/10 max-w-2xl">
              <p className="text-sm text-v-muted font-light leading-relaxed mb-4">
                No videos are configured yet. In <span className="font-mono text-xs text-v-cyan">frontend/.env.local</span>{" "}
                add:
              </p>
              <pre className="text-[11px] font-mono text-v-text/90 bg-black/40 rounded-xl p-4 border border-white/10 overflow-x-auto whitespace-pre-wrap">
                {`NEXT_PUBLIC_YOUTUBE_VIDEO_IDS=YE7VzlLtp-4,https://www.youtube.com/watch?v=XXXXXXXXXXX
NEXT_PUBLIC_YOUTUBE_VIDEO_LABELS=Big Buck Bunny (demo)|Second title`}
              </pre>
              <p className="text-xs text-v-muted/80 mt-4 font-light">
                Use comma-separated IDs or full watch URLs. Optional titles: same count, separated by <code className="font-mono text-v-cyan">|</code>.
                Restart <span className="font-mono">npm run dev</span> after saving.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
              {videos.map((v, idx) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06 }}
                  className="space-y-3"
                >
                  <h3 className="text-xs font-mono uppercase tracking-widest text-v-muted">{v.title}</h3>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl ring-1 ring-white/5">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?rel=0`}
                      title={v.title}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
