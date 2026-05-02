import { useState, useRef, useCallback } from "react";
import { X, Image as ImageIcon, FolderHeart, Upload, Check, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "choose" | "single" | "album" | "uploading" | "success" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

const UploadModal = ({ open, onClose }: Props) => {
  const [step, setStep] = useState<Step>("choose");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("choose");
    setFiles([]);
    setPreviews([]);
    setCaption("");
    setName("");
    setAnonymous(false);
    setAlbumTitle("");
    setProgress(0);
    setErrorMsg("");
  };

  const close = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const handleFiles = useCallback(
    (list: FileList | null, multiple: boolean) => {
      if (!list || list.length === 0) return;
      const arr = Array.from(list).slice(0, multiple ? 30 : 1);
      setFiles(arr);
      setPreviews(arr.map((f) => URL.createObjectURL(f)));
    },
    [],
  );

  const submit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }
    if (step === "album" && !albumTitle.trim()) {
      toast.error("Album title is required");
      return;
    }
    setStep("uploading");
    setProgress(5);
    try {
      const isAlbum = files.length > 1 || step === "album";
      const { data: uploadRow, error: upErr } = await supabase
        .from("uploads")
        .insert({
          type: isAlbum ? "album" : "single",
          user_name: anonymous ? null : name.trim() || null,
          is_anonymous: anonymous,
          caption: caption.trim() || null,
          album_title: isAlbum ? albumTitle.trim() || null : null,
        })
        .select()
        .single();
      if (upErr || !uploadRow) throw upErr ?? new Error("Failed to create upload");

      const uploadId = uploadRow.id as string;
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
          {step === "choose" && (
            <div>
              <p className="font-script text-3xl text-gradient-gold mb-2 text-center">share with us</p>
              <h3 className="font-serif-display text-3xl md:text-4xl text-center mb-10">
                What would you like to share?
              </h3>
              <div className="grid md:grid-cols-2 gap-5">
                <button
                  onClick={() => setStep("single")}
                  className="group p-8 rounded-2xl border-2 border-border hover:border-gold transition-all bg-background/50 text-left"
                >
                  <ImageIcon className="w-10 h-10 text-gold mb-4" />
                  <h4 className="font-serif-display text-2xl mb-2">Single Photo or Video</h4>
                  <p className="text-sm text-muted-foreground font-light">Share one special moment</p>
                </button>
                <button
                  onClick={() => setStep("album")}
                  className="group p-8 rounded-2xl border-2 border-border hover:border-gold transition-all bg-background/50 text-left"
                >
                  <FolderHeart className="w-10 h-10 text-gold mb-4" />
                  <h4 className="font-serif-display text-2xl mb-2">Create an Album</h4>
                  <p className="text-sm text-muted-foreground font-light">Share a collection of memories</p>
                </button>
              </div>
            </div>
          )}

          {(step === "single" || step === "album") && (
            <div className="space-y-6">
              <h3 className="font-serif-display text-3xl text-center">
                {step === "album" ? "Create an Album" : "Share a Memory"}
              </h3>

              {step === "album" && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.2em] text-foreground/60 mb-2">
                    Album Title *
                  </label>
                  <input
                    required
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder="Give your album a title…"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 font-serif-display text-lg focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
                  />
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files, step === "album");
                }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragOver ? "border-gold bg-gold/5" : "border-border hover:border-gold/60"
                }`}
              >
                <Upload className="w-8 h-8 mx-auto text-gold mb-3" />
                <p className="font-serif-display text-lg">Drag & drop or browse files</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, MP4, MOV</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple={step === "album"}
                  accept={ACCEPT}
                  onChange={(e) => handleFiles(e.target.files, step === "album")}
                  className="hidden"
                />
              </div>

              {previews.length > 0 && (
                <div className={`grid gap-2 ${previews.length === 1 ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-4"}`}>
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
                <label className="block text-xs uppercase tracking-[0.2em] text-foreground/60 mb-2">Caption</label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption…"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 font-serif-display text-lg focus:outline-none focus:ring-2 focus:ring-gold/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-foreground/60 mb-2">Your Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={anonymous}
                  placeholder="Your name (optional)"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 font-serif-display text-lg focus:outline-none focus:ring-2 focus:ring-gold/50 transition disabled:opacity-50"
                />
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground/80">
                  {anonymous ? "Stay anonymous" : "Show my name"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={anonymous}
                  onClick={() => setAnonymous(!anonymous)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${anonymous ? "bg-gold" : "bg-muted"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      anonymous ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("choose")}
                  className="flex-1 py-3 rounded-full border border-border text-xs uppercase tracking-[0.25em] hover:border-gold/60 transition"
                >
                  Back
                </button>
                <button
                  onClick={submit}
                  className="flex-[2] py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold hover:scale-[1.02] hover:shadow-romance transition-all duration-500"
                >
                  {step === "album" ? "Share Album" : "Share Memory"}
                </button>
              </div>
            </div>
          )}

          {step === "uploading" && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-6" />
              <p className="font-serif-display text-2xl mb-4">Sharing your memory…</p>
              <div className="max-w-xs mx-auto h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-gold transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">{progress}%</p>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 text-center animate-fade-up">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-gold flex items-center justify-center mb-5 shadow-gold">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <p className="font-script text-4xl text-gradient-gold mb-2">Thank you</p>
              <p className="font-serif-display text-2xl">Your memory has been added 💛</p>
              <p className="text-muted-foreground mt-2 text-sm">It will appear in the gallery once reviewed.</p>
              <div className="flex gap-3 justify-center mt-8">
                <button
                  onClick={reset}
                  className="px-6 py-3 rounded-full border border-border text-xs uppercase tracking-[0.25em] hover:border-gold/60 transition"
                >
                  Share another
                </button>
                <button
                  onClick={close}
                  className="px-6 py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center">
              <p className="font-serif-display text-2xl mb-3">Something went wrong</p>
              <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
              <button
                onClick={() => setStep(files.length > 1 ? "album" : "single")}
                className="px-6 py-3 bg-gradient-gold text-foreground rounded-full uppercase tracking-[0.25em] text-xs font-medium shadow-gold transition"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
