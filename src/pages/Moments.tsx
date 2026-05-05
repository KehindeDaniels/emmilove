import { useEffect, useMemo, useState } from "react";
import { Heart, ArrowLeft, Layers, Play, Crown } from "lucide-react";
import Nav from "@/components/wedding/Nav";
import Footer from "@/components/wedding/Footer";
import UploadModal from "@/components/wedding/moments/UploadModal";
import Lightbox, { LightboxData, MediaItem } from "@/components/wedding/moments/Lightbox";
import { supabase } from "@/integrations/supabase/client";
import { useReveal } from "@/hooks/use-reveal";

interface UploadRow {
  id: string;
  type: "single" | "album";
  user_name: string | null;
  is_anonymous: boolean;
  caption: string | null;
  album_title: string | null;
  created_at: string;
  media: MediaItem[];
}

type Filter = "all" | "photos" | "albums" | "videos";

const PAGE_SIZE = 20;

const Moments = () => {
  const heroRef = useReveal();
  const [items, setItems] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxData | null>(null);
  const [openAlbum, setOpenAlbum] = useState<UploadRow | null>(null);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  // Load likes from localStorage
  useEffect(() => {
    try {
      setLikes(JSON.parse(localStorage.getItem("moments_likes") || "{}"));
      setLiked(JSON.parse(localStorage.getItem("moments_liked") || "{}"));
    } catch {}
  }, []);

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("moments_liked", JSON.stringify(next));
      return next;
    });
    setLikes((prev) => {
      const cur = prev[id] || 0;
      const wasLiked = liked[id];
      const next = { ...prev, [id]: Math.max(0, cur + (wasLiked ? -1 : 1)) };
      localStorage.setItem("moments_likes", JSON.stringify(next));
      return next;
    });
  };

  const loadPage = async (p: number, replace = false) => {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("uploads")
      .select("id, type, user_name, is_anonymous, caption, album_title, created_at, media(id, file_url, type)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (!error && data) {
      const rows = data as unknown as UploadRow[];
      setItems((prev) => (replace ? rows : [...prev, ...rows]));
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPage(0, true);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filter === "all") return true;
      if (filter === "albums") return it.type === "album";
      const hasVideo = it.media?.some((m) => m.type === "video");
      const hasPhoto = it.media?.some((m) => m.type === "photo");
      if (filter === "videos") return hasVideo;
      if (filter === "photos") return it.type === "single" && hasPhoto;
      return true;
    });
  }, [items, filter]);

  const openItem = (it: UploadRow) => {
    if (it.type === "album") {
      setOpenAlbum(it);
      return;
    }
    if (!it.media?.length) return;
    setLightbox({
      items: it.media,
      startIndex: 0,
      caption: it.caption,
      authorName: it.is_anonymous ? null : it.user_name,
    });
  };

  return (
    <main className="min-h-screen bg-background">
      <Nav />

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-romance opacity-80" />
        <div className="absolute -top-20 -left-20 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40" style={{ background: "hsl(var(--blush))" }} />
        <div className="absolute -bottom-20 -right-20 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40" style={{ background: "hsl(var(--lavender))" }} />
        <div className="container relative text-center">
          <div className="reveal">
            <p className="font-script text-3xl md:text-4xl text-gradient-gold mb-3">together with you</p>
            <h1 className="font-serif-display text-5xl md:text-7xl mb-5">Moments With Us</h1>
            <p className="text-lg md:text-xl text-foreground/70 font-light max-w-xl mx-auto mb-10">
              Captured with love, shared with joy.
            </p>
            <button
              onClick={() => setUploadOpen(true)}
              className="px-10 py-4 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold hover:scale-[1.02] hover:shadow-romance transition-all duration-500"
            >
              Share a Memory
            </button>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-16 md:py-24">
        <div className="container">
          {/* Filter bar */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-8 mb-12 border-b border-border/60 pb-1">
            {(["all", "photos", "albums", "videos"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative px-3 py-3 text-xs uppercase tracking-[0.25em] transition-colors ${
                  filter === f ? "text-foreground" : "text-foreground/50 hover:text-foreground/80"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {filter === f && (
                  <span className="absolute left-3 right-3 -bottom-px h-[2px] bg-gradient-gold rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Loading skeletons */}
          {loading && items.length === 0 && (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="mb-6 break-inside-avoid rounded-2xl bg-muted animate-pulse"
                  style={{ height: 200 + ((i * 47) % 180) }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-24 reveal">
              <p className="font-serif-display text-2xl md:text-3xl text-foreground/70">
                Be the first to share a memory with us 💛
              </p>
              <button
                onClick={() => setUploadOpen(true)}
                className="mt-8 px-8 py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold hover:scale-[1.02] transition"
              >
                Share a Memory
              </button>
            </div>
          )}

          {/* Masonry grid */}
          {filtered.length > 0 && (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
              {filtered.map((it) => {
                const cover = it.media?.[0];
                if (!cover) return null;
                const isAlbum = it.type === "album";
                const isVideo = cover.type === "video";
                return (
                  <div
                    key={it.id}
                    onClick={() => openItem(it)}
                    className="mb-6 break-inside-avoid group cursor-pointer"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-muted shadow-soft hover:shadow-romance transition-all duration-500 hover:-translate-y-1">
                      {isVideo ? (
                        <div className="relative">
                          <video
                            src={cover.file_url}
                            className="w-full h-auto block"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition">
                            <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-white/15 flex items-center justify-center">
                              <Play className="w-6 h-6 text-foreground ml-1" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={cover.file_url}
                          alt={it.caption || "Memory"}
                          loading="lazy"
                          className="w-full h-auto block group-hover:brightness-105 transition duration-500"
                        />
                      )}
                      {isAlbum && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] text-white" style={{ backgroundColor: "#C9A46C" }}>
                          <Layers className="w-3 h-3" />
                          Album · {it.media.length}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(it.id);
                        }}
                        className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/85 dark:bg-white/10 dark:text-foreground backdrop-blur text-foreground text-xs hover:scale-110 transition"
                        aria-label="Like"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition ${liked[it.id] ? "fill-current text-rose-500" : ""}`}
                        />
                        {likes[it.id] > 0 && <span>{likes[it.id]}</span>}
                      </button>
                    </div>
                    {(it.caption || (!it.is_anonymous && it.user_name) || it.album_title) && (
                      <div className="mt-3 px-1">
                        {it.album_title && (
                          <p className="font-serif-display text-lg">{it.album_title}</p>
                        )}
                        {it.caption && (
                          <p className="text-sm italic text-foreground/70 font-light">{it.caption}</p>
                        )}
                        {!it.is_anonymous && it.user_name && (
                          <p className="text-[10px] uppercase tracking-[0.25em] text-gold mt-1">
                            From {it.user_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {hasMore && items.length > 0 && (
            <div className="text-center mt-12">
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  loadPage(next);
                }}
                disabled={loading}
                className="px-8 py-3 rounded-full border border-border text-xs uppercase tracking-[0.25em] hover:border-gold/60 transition disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ALBUM VIEW */}
      {openAlbum && (
        <div className="fixed inset-0 z-[90] bg-background overflow-y-auto animate-fade-in-soft">
          <div className="container py-10">
            <button
              onClick={() => setOpenAlbum(null)}
              className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-gold transition mb-8"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Gallery
            </button>
            <div className="text-center mb-10">
              <p className="font-script text-2xl text-gradient-gold mb-2">an album</p>
              <h2 className="font-serif-display text-4xl md:text-5xl">
                {openAlbum.album_title || "Untitled Album"}
              </h2>
              {openAlbum.caption && (
                <p className="mt-3 italic text-foreground/70 max-w-xl mx-auto">{openAlbum.caption}</p>
              )}
              {!openAlbum.is_anonymous && openAlbum.user_name && (
                <p className="text-[11px] uppercase tracking-[0.25em] text-gold mt-3">
                  From {openAlbum.user_name}
                </p>
              )}
            </div>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
              {openAlbum.media.map((m, i) => (
                <div
                  key={m.id}
                  onClick={() =>
                    setLightbox({
                      items: openAlbum.media,
                      startIndex: i,
                      caption: openAlbum.caption,
                      authorName: openAlbum.is_anonymous ? null : openAlbum.user_name,
                    })
                  }
                  className="mb-6 break-inside-avoid cursor-pointer rounded-2xl overflow-hidden shadow-soft hover:shadow-romance hover:-translate-y-1 transition-all duration-500"
                >
                  {m.type === "video" ? (
                    <video src={m.file_url} className="w-full h-auto block" muted playsInline preload="metadata" />
                  ) : (
                    <img src={m.file_url} alt="" loading="lazy" className="w-full h-auto block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <Lightbox data={lightbox} onClose={() => setLightbox(null)} />

      <Footer />
    </main>
  );
};

export default Moments;
