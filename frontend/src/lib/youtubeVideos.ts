/** Accept raw 11-char style IDs or common YouTube / youtu.be URL shapes. */
export function extractYoutubeId(segment: string): string | null {
  const s = segment.trim();
  if (!s) return null;
  const fromUrl = s.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,32})/i
  );
  if (fromUrl?.[1]) return fromUrl[1];
  if (/^[a-zA-Z0-9_-]{6,32}$/.test(s)) return s;
  return null;
}

export type YoutubeVideoConfig = { id: string; title: string };

/**
 * Reads NEXT_PUBLIC_YOUTUBE_VIDEO_IDS (comma-separated IDs or URLs).
 * Optional NEXT_PUBLIC_YOUTUBE_VIDEO_LABELS: titles separated by | in the same order.
 */
export function getConfiguredYouTubeVideos(): YoutubeVideoConfig[] {
  const raw = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_IDS?.trim();
  if (!raw) return [];
  const labelsRaw = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_LABELS?.trim();
  const labels = labelsRaw ? labelsRaw.split("|").map((t) => t.trim()) : [];
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: YoutubeVideoConfig[] = [];

  for (let i = 0; i < parts.length; i++) {
    const id = extractYoutubeId(parts[i]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: labels[i]?.length ? labels[i]! : `Video ${out.length + 1}`,
    });
  }
  return out;
}
