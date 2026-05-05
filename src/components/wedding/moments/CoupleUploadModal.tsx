import { useState, useRef, useCallback } from "react";
import { X, Upload, Check, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "form" | "uploading" | "success" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  onPublished?: () => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

const CoupleUploadModal = ({ open, onClose, onPublished }: Props) => {
  const [step, setStep] = useState<Step>("form");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [albumTitle, setAlbumTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("form");
    setFiles([]);
    setPreviews([]);
    setAlbumTitle("");
    setCaption("");
    setProgress(0);
    setErrorMsg("");
  };

  const close = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return;
    const arr = Array.from(list).slice(0, 50);
    setFiles(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
  }, []);

  const submit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }
    setStep("uploading");
    setProgress(5);
    try {
      const isAlbum = files.length > 1;
      const { data: uploadRow, error: upErr } = await supabase
        .from("uploads")
        .insert({
          type: isAlbum ? "album" : "single",
          user_name: "Emma & Funmi",
          is_anonymous: false,
          caption: caption.trim() || null,
          album_title: isAlbum ? (albumTitle.trim() || null) : null,
          status: "approved",
          source: "couple",
        } as any)
        .select()
        .single();
      if (upErr || !uploadRow) throw upErr ?? new Error("Failed to create upload");

      const uploadId = (uploadRow as any).id as string;
      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const isVideo = f.type.startsWith("video/");
        let toUpload: File | Blob = f;
        if (!isVideo) {
          try {
            toUpload = await imageCompression(f, {
              maxSizeMB: 1,
              maxWidthOrHeight: 2000,
              useWebWorker: true,
            });
          } catch {
            toUpload = f;
          }
        }
        const ext = f.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const path = `${uploadId}/${Date.now()}-${i}.${ext}`;
        const { error: stErr } = await supabase.storage
          .from("memories")
          .upload(path, toUpload, { contentType: f.type, upsert: false });
        if (stErr) throw stErr;
        const { data: pub } = supabase.storage.from("memories").getPublicUrl(path);
        const { error: mErr } = await supabase.from("media").insert({
          upload_id: uploadId,
          file_url: pub.publicUrl,
          type: isVideo ? "video" : "photo",
        });
        if (mErr) throw mErr;
        setProgress(Math.round(((i + 1) / total) * 100));
      }
      setStep("success");
      onPublished?.();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Something went wrong");
      setStep("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in-soft">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground rounded-3xl shadow-elegant border border-border/60 animate-fade-up">
        <button
          onClick={close}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-12">
          {step === "form" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="font-script text-3xl text-gradient-gold mb-2">from us</p>
                <h3 className="font-serif-display text-3xl">Add to Our Gallery</h3>
                <p className="text-sm text-muted-foreground mt-2">Auto-published — no review needed.</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-foreground/60 mb-2">
                  Album Title (optional)
                </label>
                <input
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="e.g. Engagement Day"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 font-serif-display text-lg focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
                />
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragOver ? "border-gold bg-gold/5" : "border-border hover:border-gold/60"
                }`}
              >
                <Upload className="w-8 h-8 mx-auto text-gold mb-3" />
                <p className="font-serif-display text-lg">Drag & drop or browse files</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, MP4, MOV — multiple allowed</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>

              {previews.length > 0 && (
                <div className="grid gap-2 grid-cols-3 sm:grid-cols-4">
                  {previews.map((p, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      {files[i]?.type.startsWith("video/") ? (
                        <video src={p} className="w-full h-full object-cover" />
                      ) : (
                        <img src={p} alt="preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-foreground/60 mb-2">Caption (optional)</label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption…"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 font-serif-display text-lg focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
                />
              </div>

              <button
                onClick={submit}
                className="w-full py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold hover:scale-[1.02] hover:shadow-romance transition-all duration-500"
              >
                Publish to Gallery
              </button>
            </div>
          )}

          {step === "uploading" && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-6" />
              <p className="font-serif-display text-2xl mb-4">Publishing…</p>
              <div className="max-w-xs mx-auto h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-gold transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">{progress}%</p>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 text-center animate-fade-up">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-gold flex items-center justify-center mb-5 shadow-gold">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <p className="font-script text-4xl text-gradient-gold mb-2">Published</p>
              <p className="font-serif-display text-2xl">Live in the gallery 💛</p>
              <div className="flex gap-3 justify-center mt-8">
                <button onClick={reset} className="px-6 py-3 rounded-full border border-border text-xs uppercase tracking-[0.25em] hover:border-gold/60 transition">
                  Add more
                </button>
                <button onClick={close} className="px-6 py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold transition">
                  Close
                </button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center">
              <p className="font-serif-display text-2xl mb-3">Something went wrong</p>
              <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
              <button onClick={() => setStep("form")} className="px-6 py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold transition">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoupleUploadModal;
