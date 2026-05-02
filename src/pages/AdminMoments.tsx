import { useEffect, useState } from "react";
import { Check, X, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  file_url: string;
  type: "photo" | "video";
}
interface UploadRow {
  id: string;
  type: "single" | "album";
  user_name: string | null;
  is_anonymous: boolean;
  caption: string | null;
  album_title: string | null;
  status: string;
  created_at: string;
  media: MediaItem[];
}

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/moments-admin`;

const AdminMoments = () => {
  const [password, setPassword] = useState(() => sessionStorage.getItem("moments_admin_pw") || "");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  const call = async (body: any) => {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  };

  const load = async (status = tab) => {
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
    if (authed) load(tab);
  }, [tab]);

  const moderate = async (id: string, status: "approved" | "rejected") => {
    try {
      await call({ action: "moderate", id, status });
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success(status === "approved" ? "Approved" : "Rejected");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="w-full max-w-sm space-y-4"
        >
          <h1 className="font-serif-display text-3xl text-center">Moments Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold/50"
          />
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold disabled:opacity-50"
          >
            {loading ? "Checking…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif-display text-3xl md:text-4xl">Moments Admin</h1>
          <button
            onClick={() => {
              sessionStorage.removeItem("moments_admin_pw");
              setPassword("");
              setAuthed(false);
            }}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] ${
                tab === t ? "bg-gradient-gold text-foreground shadow-gold" : "border border-border text-foreground/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gold" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No {tab} uploads.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((it) => (
              <div key={it.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-border">
                  {it.media.slice(0, 4).map((m) => (
                    <div key={m.id} className="aspect-square bg-muted">
                      {m.type === "video" ? (
                        <video src={m.file_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={m.file_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 space-y-2">
                  {it.album_title && <p className="font-serif-display text-lg">{it.album_title}</p>}
                  {it.caption && <p className="text-sm italic text-foreground/70">{it.caption}</p>}
                  <p className="text-xs text-muted-foreground">
                    {it.is_anonymous ? "Anonymous" : it.user_name || "—"} · {it.type} · {it.media.length} file(s)
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {new Date(it.created_at).toLocaleString()}
                  </p>
                  {tab === "pending" && (
                    <div className="flex gap-2 pt-3">
                      <button
                        onClick={() => moderate(it.id, "approved")}
                        className="flex-1 py-2 rounded-full bg-emerald-600 text-white text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 inline-flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => moderate(it.id, "rejected")}
                        className="flex-1 py-2 rounded-full bg-rose-600 text-white text-xs uppercase tracking-[0.2em] hover:bg-rose-700 inline-flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                  {tab !== "pending" && (
                    <button
                      onClick={() => moderate(it.id, tab === "approved" ? "rejected" : "approved")}
                      className="w-full py-2 mt-3 rounded-full border border-border text-xs uppercase tracking-[0.2em] hover:border-gold/60"
                    >
                      Move to {tab === "approved" ? "rejected" : "approved"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminMoments;
