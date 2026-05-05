import { useEffect, useState } from "react";
import {
  Check,
  X,
  Loader2,
  LogOut,
  Image,
  Video,
  BookOpen,
  Clock,
  User,
  Plus,
  Trash2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CoupleUploadModal from "@/components/wedding/moments/CoupleUploadModal";

interface MediaItem {
  id: string;
  file_url: string;
  type: "photo" | "video";
}
interface UploadRow {
  id: string;
  type: "single" | "album";
  source?: "guest" | "couple";
  user_name: string | null;
  is_anonymous: boolean;
  caption: string | null;
  album_title: string | null;
  status: string;
  created_at: string;
  media: MediaItem[];
}

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/moments-admin`;

type Tab = "pending" | "approved" | "rejected";

const TAB_META: Record<Tab, { label: string; color: string }> = {
  pending: { label: "Awaiting Review", color: "text-candle" },
  approved: { label: "Approved", color: "text-emerald-400" },
  rejected: { label: "Rejected", color: "text-rose-400" },
};

const AdminMoments = () => {
  const [password, setPassword] = useState(
    () => sessionStorage.getItem("moments_admin_pw") || "",
  );
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [coupleItems, setCoupleItems] = useState<UploadRow[]>([]);
  const [coupleOpen, setCoupleOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<UploadRow | null>(null);

  const loadCouple = async () => {
    const { data } = await supabase
      .from("uploads")
      .select("id, type, user_name, is_anonymous, caption, album_title, status, created_at, media(id, file_url, type)")
      .eq("status", "approved")
      .eq("source", "couple" as any)
      .order("created_at", { ascending: false });
    if (data) setCoupleItems(data as unknown as UploadRow[]);
  };

  const deleteCouple = async (id: string) => {
    if (!confirm("Remove this from the public gallery?")) return;
    try {
      await call({ action: "moderate", id, status: "rejected" });
      setCoupleItems((prev) => prev.filter((it) => it.id !== id));
      toast.success("Removed from gallery");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const call = async (body: object) => {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  };

  const load = async (status: Tab = tab) => {
    setLoading(true);
    try {
      const json = await call({ action: "list", status });
      setItems(json.items || []);
      setAuthed(true);
      sessionStorage.setItem("moments_admin_pw", password);
    } catch (e: any) {
      toast.error(e.message);
      if (e.message === "Unauthorized") {
        setAuthed(false);
        sessionStorage.removeItem("moments_admin_pw");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (password && !authed) load();
  }, []);
  useEffect(() => {
    if (authed) {
      load(tab);
      loadCouple();
    }
  }, [tab, authed]);

  const moderate = async (id: string, status: "approved" | "rejected") => {
    setActionId(id);
    try {
      await call({ action: "moderate", id, status });
      setItems((prev) => prev.filter((it) => it.id !== id));
      setPreviewItem(null);
      toast.success(status === "approved" ? "✓ Approved" : "✕ Rejected");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionId(null);
    }
  };

  /* ── LOGIN ── */
  if (!authed) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient glows */}
        <div
          className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--blush)) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-15"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--lavender)) 0%, transparent 70%)",
          }}
        />

        <div className="relative w-full max-w-sm animate-fade-in-soft">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="font-script text-3xl shimmer-text mb-1">
              Emma & Funmi
            </p>
            <h1 className="font-serif-display text-4xl text-foreground">
              Moments Admin
            </h1>
            <p className="mt-2 text-muted-foreground text-sm tracking-widest uppercase">
              Private access
            </p>
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-3xl p-8 shadow-elegant space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="••••••••••••"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-[hsl(var(--gold))] transition-colors text-sm"
              />
            </div>
            <button
              onClick={() => load()}
              disabled={loading || !password}
              className="w-full py-3.5 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold hover:scale-[1.02] transition-all duration-300 disabled:opacity-40 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                </>
              ) : (
                "Enter"
              )}
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ── DASHBOARD ── */
  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 glass border-b border-border/40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-script text-2xl text-gradient-gold">
              Emma & Funmi
            </span>
            <span className="text-muted-foreground/40 text-sm">·</span>
            <span className="font-serif-display text-xl text-foreground">
              Moments
            </span>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("moments_admin_pw");
              setPassword("");
              setAuthed(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Our Gallery */}
        <section className="mb-12 p-6 md:p-8 rounded-3xl border border-border bg-card shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-gold" />
                <h2 className="font-serif-display text-3xl text-foreground">Our Gallery</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Photos & videos from Emma & Funmi — auto-published instantly
              </p>
            </div>
            <button
              onClick={() => setCoupleOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold hover:scale-[1.02] transition-all duration-300"
            >
              <Plus className="w-4 h-4" /> Add to Our Gallery
            </button>
          </div>

          {coupleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No couple uploads yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {coupleItems.map((it) => {
                const cover = it.media?.[0];
                if (!cover) return null;
                return (
                  <div key={it.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted shadow-soft">
                    {cover.type === "video" ? (
                      <video src={cover.file_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={cover.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                    {it.media.length > 1 && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-[10px]">
                        {it.media.length}
                      </div>
                    )}
                    <button
                      onClick={() => deleteCouple(it.id)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tab strip */}
        <div className="flex items-center gap-1 mb-10 border-b border-border/40">
          {(Object.keys(TAB_META) as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-5 py-3 text-xs uppercase tracking-[0.25em] transition-colors ${
                tab === t
                  ? `${TAB_META[t].color}`
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_META[t].label}
              {tab === t && (
                <span className="absolute left-5 right-5 -bottom-px h-px bg-gradient-gold rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
            <p className="text-muted-foreground text-sm tracking-widest uppercase">
              Loading memories…
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && (
          <div className="text-center py-32 animate-fade-in-soft">
            <p className="font-serif-display text-3xl text-foreground/30 mb-3">
              No {tab} memories
            </p>
            <p className="text-muted-foreground text-sm">
              {tab === "pending"
                ? "All caught up — nothing waiting for review."
                : `Nothing has been ${tab} yet.`}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && items.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-soft">
            {items.map((it) => {
              const isActioning = actionId === it.id;
              const mediaCount = it.media.length;

              return (
                <div
                  key={it.id}
                  className="group bg-card border border-border rounded-3xl overflow-hidden shadow-soft hover:shadow-romance transition-all duration-500 hover:-translate-y-0.5 flex flex-col"
                >
                  {/* Media preview */}
                  <div className="relative">
                    {mediaCount === 1 ? (
                      // Single full-width
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        {it.media[0].type === "video" ? (
                          <video
                            src={it.media[0].file_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={it.media[0].file_url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                        )}
                      </div>
                    ) : (
                      // Grid of up to 4
                      <div
                        className={`grid gap-px bg-border ${mediaCount >= 4 ? "grid-cols-2" : "grid-cols-2"}`}
                      >
                        {it.media.slice(0, 4).map((m, i) => (
                          <div
                            key={m.id}
                            className={`bg-muted overflow-hidden ${
                              mediaCount === 3 && i === 0 ? "row-span-2" : ""
                            }`}
                            style={{
                              aspectRatio:
                                mediaCount === 3 && i === 0 ? "1/2" : "1/1",
                            }}
                          >
                            {m.type === "video" ? (
                              <video
                                src={m.file_url}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={m.file_url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Type badge */}
                    <div
                      className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur-sm"
                      style={{ backgroundColor: "hsl(var(--gold) / 0.85)" }}
                    >
                      {it.type === "album" ? (
                        <>
                          <BookOpen className="w-3 h-3" /> Album
                        </>
                      ) : it.media[0]?.type === "video" ? (
                        <>
                          <Video className="w-3 h-3" /> Video
                        </>
                      ) : (
                        <>
                          <Image className="w-3 h-3" /> Photo
                        </>
                      )}
                    </div>

                    {/* Media count */}
                    {mediaCount > 1 && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] text-white bg-black/40 backdrop-blur-sm">
                        {mediaCount} files
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {mediaCount > 4 && (
                      <button
                        onClick={() => setPreviewItem(it)}
                        className="self-start text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold transition-colors"
                      >
                        View all {mediaCount} files →
                      </button>
                    )}
                    {it.album_title && (
                      <p className="font-serif-display text-xl text-foreground leading-tight">
                        {it.album_title}
                      </p>
                    )}
                    {it.caption && (
                      <p className="text-sm italic text-foreground/60 font-light leading-relaxed line-clamp-2">
                        "{it.caption}"
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-auto">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>
                          {it.is_anonymous ? "Anonymous" : it.user_name || "—"}
                        </span>
                      </div>
                      <span className="text-border">·</span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(it.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {tab === "pending" && (
                      <div className="flex gap-2 pt-2 border-t border-border/40">
                        <button
                          onClick={() => moderate(it.id, "approved")}
                          disabled={isActioning}
                          className="flex-1 py-2.5 rounded-full bg-emerald-600/90 text-white text-xs uppercase tracking-[0.2em] hover:bg-emerald-500 transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          {isActioning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => moderate(it.id, "rejected")}
                          disabled={isActioning}
                          className="flex-1 py-2.5 rounded-full bg-rose-600/90 text-white text-xs uppercase tracking-[0.2em] hover:bg-rose-500 transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                          {isActioning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          Reject
                        </button>
                      </div>
                    )}

                    {tab !== "pending" && (
                      <button
                        onClick={() =>
                          moderate(
                            it.id,
                            tab === "approved" ? "rejected" : "approved",
                          )
                        }
                        disabled={isActioning}
                        className="w-full py-2.5 mt-2 rounded-full border border-border text-xs uppercase tracking-[0.2em] text-muted-foreground hover:border-[hsl(var(--gold)/0.6)] hover:text-foreground transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {isActioning && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        Move to {tab === "approved" ? "Rejected" : "Approved"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminMoments;
