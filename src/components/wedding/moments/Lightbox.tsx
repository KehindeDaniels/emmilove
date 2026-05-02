import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

export interface MediaItem {
  id: string;
  file_url: string;
  type: "photo" | "video";
}

export interface LightboxData {
  items: MediaItem[];
  startIndex: number;
  caption?: string | null;
  authorName?: string | null;
}

interface Props {
  data: LightboxData | null;
  onClose: () => void;
}

const Lightbox = ({ data, onClose }: Props) => {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  useEffect(() => {
    if (data) setIndex(data.startIndex);
  }, [data]);

  const next = useCallback(() => {
    if (!data) return;
    setIndex((i) => (i + 1) % data.items.length);
  }, [data]);
  const prev = useCallback(() => {
    if (!data) return;
    setIndex((i) => (i - 1 + data.items.length) % data.items.length);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [data, next, prev, onClose]);

  if (!data) return null;
  const item = data.items[index];

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart == null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    if (dx > 50) prev();
    if (dx < -50) next();
    setTouchStart(null);
  };

  const download = async () => {
    try {
      const res = await fetch(item.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.file_url.split("/").pop() || "memory";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.file_url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center animate-fade-in-soft"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      <button
        onClick={download}
        className="absolute top-4 right-20 z-10 p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
        aria-label="Download"
      >
        <Download className="w-5 h-5" />
      </button>

      {data.items.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 md:left-8 z-10 p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
            aria-label="Previous"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 md:right-8 z-10 p-3 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
            aria-label="Next"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}

      <div className="relative max-w-6xl w-full max-h-[90vh] px-4 flex flex-col items-center justify-center">
        <div className="relative max-h-[78vh] flex items-center justify-center">
          {item.type === "video" ? (
            <video
              key={item.id}
              src={item.file_url}
              controls
              autoPlay
              className="max-h-[78vh] max-w-full rounded-lg shadow-elegant animate-fade-in-soft"
            />
          ) : (
            <img
              key={item.id}
              src={item.file_url}
              alt={data.caption || "Memory"}
              className="max-h-[78vh] max-w-full rounded-lg shadow-elegant animate-fade-in-soft object-contain"
            />
          )}
        </div>
        {(data.caption || data.authorName) && (
          <div className="mt-5 text-center text-white/90 max-w-2xl">
            {data.caption && <p className="font-serif-display text-lg italic">{data.caption}</p>}
            {data.authorName && (
              <p className="text-xs uppercase tracking-[0.25em] text-gold mt-2">From {data.authorName}</p>
            )}
          </div>
        )}
        {data.items.length > 1 && (
          <p className="mt-3 text-xs text-white/50">
            {index + 1} / {data.items.length}
          </p>
        )}
      </div>
    </div>
  );
};

export default Lightbox;
